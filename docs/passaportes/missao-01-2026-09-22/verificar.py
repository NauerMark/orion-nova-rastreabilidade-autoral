"""Validate references and exact local bytes. No network or writes."""
from pathlib import Path
from datetime import date, datetime
from html.parser import HTMLParser
from urllib.parse import urlsplit
import hashlib
import json
import re

ROOT=Path(__file__).resolve().parent
DATE_TYPES={'claimed_event','commit','event','publication','platform_creation','deposit_publication','audit'}
STATUSES={'documented_record','attributed_account','institutionally_documented','attributed_claim','technical_claim_not_demonstrated','unresolved','reproduced_integrity_check','documented_discrepancy','documented_implementation_scope','evidence_based_synthesis'}


def validate(data):
    errors=[]
    try: date.fromisoformat(data['as_of'])
    except (KeyError,ValueError,TypeError): errors.append('Data de consulta inválida')
    groups=['sources','claims','timeline','contradictions','gaps','discoveries']
    ids=[]
    for group in groups:
        values=data.get(group,[])
        if not values: errors.append(f'Grupo vazio: {group}')
        ids += [x.get('id') for x in values]
    if None in ids or len(set(ids))!=len(ids): errors.append('Identificadores ausentes ou duplicados')
    sid={s['id'] for s in data.get('sources',[])}
    cid={c['id'] for c in data.get('claims',[])}
    for s in data.get('sources',[]):
        u=urlsplit(s.get('url',''))
        if u.scheme!='https' or not u.netloc or u.username or u.password: errors.append('URL inválida: '+s['id'])
        for field in ['title','publisher','kind','origin_group','locator','supports','limits','retrieval','accessed_on']:
            if not s.get(field): errors.append(f'Campo ausente: {s["id"]}.{field}')
        if s.get('access')!='public': errors.append('Fonte não pública: '+s['id'])
        if s.get('accessed_on')!=data.get('as_of'): errors.append('Data de consulta divergente: '+s['id'])
        if s.get('sha256') and not re.fullmatch('[0-9a-f]{64}',s['sha256']): errors.append('SHA-256 inválido: '+s['id'])
        if s.get('published'):
            try: datetime.fromisoformat(s['published'].replace('Z','+00:00'))
            except (ValueError,TypeError): errors.append('Data da fonte inválida: '+s['id'])
    for group in ['claims','contradictions','gaps','discoveries']:
        for entry in data.get(group,[]):
            refs=entry.get('sources',[])
            if not refs or not set(refs)<=sid: errors.append('Fontes ausentes/inválidas: '+entry['id'])
    for c in data.get('claims',[]):
        if c.get('status') not in STATUSES or not c.get('scope'): errors.append('Classe/alcance inválido: '+c['id'])
    for t in data.get('timeline',[]):
        try: date.fromisoformat(t['date'])
        except (ValueError,KeyError,TypeError): errors.append('Data de evento inválida: '+t['id'])
        if t.get('date_type') not in DATE_TYPES: errors.append('Tipo de data inválido: '+t['id'])
        if t.get('claim') not in cid: errors.append('Afirmação inválida: '+t['id'])
    for e in data.get('relations',[]):
        if e.get('from') not in sid or e.get('to') not in sid: errors.append('Relação sem fonte')
    serialized=json.dumps(data,ensure_ascii=False)
    for marker in ['libfile_','sediment://','@hotmail.com','/workspace/']:
        if marker in serialized: errors.append('Marcador privado/local no corpus público: '+marker)
    return errors


class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.anchors=[]; self.scripts=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='a' and a.get('href','').startswith('#'):self.anchors.append(a['href'][1:])
        if tag=='script':self.scripts+=1


def validate_files(root=ROOT):
    errors=validate(json.loads((root/'passaporte.json').read_text()))
    manifest=json.loads((root/'MANIFEST.sha256.json').read_text())
    paths=[item['path'] for item in manifest['files']]
    if len(paths)!=len(set(paths)):errors.append('Manifesto com caminhos duplicados')
    for item in manifest['files']:
        p=Path(item['path'])
        if p.is_absolute() or '..' in p.parts: errors.append('Caminho inseguro no manifesto'); continue
        raw=(root/p).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=item['sha256'] or len(raw)!=item['size_bytes']:errors.append('Bytes divergentes: '+str(p))
    page=Links();page.feed((root/'index.html').read_text())
    if len(page.ids)!=len(set(page.ids)):errors.append('IDs HTML duplicados')
    if set(page.anchors)-set(page.ids):errors.append('Âncoras HTML quebradas')
    if page.scripts:errors.append('Script inesperado no documento offline')
    return errors


if __name__=='__main__':
    errors=validate_files()
    if errors: raise SystemExit('\n'.join(errors))
    print('OK: dados, vínculos, datas, privacidade básica, âncoras HTML e hashes do manifesto.')
