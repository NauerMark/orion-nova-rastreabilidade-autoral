"""Build an offline evidence dossier; deterministic, standard-library only."""
from pathlib import Path
import argparse
import hashlib
import html
import json

ROOT = Path(__file__).resolve().parent
FILES = ["README.md", "passaporte.json", "DECISOES.md", "REVISAO.md", "PASSAPORTE.md",
         "index.html", "construir.py", "verificar.py", "test_verificar.py", "auditar_arquivos.py"]


def render(data):
    esc = lambda value: html.escape(str(value), quote=True)
    sources = {s["id"]: s for s in data["sources"]}
    def refs(ids):
        return " · ".join(f'<a href="#{esc(i)}">{esc(i)}</a>' for i in ids)
    def mrefs(ids):
        return " · ".join(f'[{i}]({sources[i]["url"]})' for i in ids)
    def table(head, rows):
        return '<div class="table-wrap"><table><thead><tr>' + ''.join(f'<th scope="col">{esc(h)}</th>' for h in head) + '</tr></thead><tbody>' + ''.join('<tr>'+''.join(f'<td>{c}</td>' for c in row)+'</tr>' for row in rows) + '</tbody></table></div>'
    def editorial(name):
        return '<div class="editorial">'+''.join('<p>'+esc(block).replace('\n','<br>')+'</p>' for block in (ROOT/name).read_text().split('\n\n'))+'</div>'
    labels = {"documented_record":"Registro documental", "attributed_account":"Relato atribuído", "institutionally_documented":"Registro institucional", "attributed_claim":"Alegação atribuída", "technical_claim_not_demonstrated":"Mecanismo não demonstrado", "unresolved":"Em aberto", "reproduced_integrity_check":"Integridade reproduzida", "documented_discrepancy":"Divergência documentada", "documented_implementation_scope":"Escopo de implementação", "evidence_based_synthesis":"Síntese das fontes"}
    date_labels = {"claimed_event":"Data relatada", "commit":"Commit", "event":"Evento", "publication":"Publicação", "platform_creation":"Criação na plataforma", "deposit_publication":"Publicação do depósito", "audit":"Auditoria"}
    body = '<section id="leitura"><h2>Leia uma trajetória, não uma declaração de certeza.</h2><p>'+esc(data['identity']['description'])+'</p><p>Cada afirmação leva à fonte, ao alcance e ao que permanece aberto. Registros institucionais, relato autoral e verificação de bytes ficam em camadas distintas.</p><ol>'+''.join('<li>'+esc(x)+'</li>' for x in data['handover'])+'</ol></section>'
    body += '<section id="cronologia"><h2>01 / Cronologia com tipos de data</h2>'+table(["Data / tipo","Acontecimento","Evidência"],[(esc(t['date'])+'<small>'+esc(date_labels[t['date_type']])+'</small>',esc(t['title']),f'<a href="#{t["claim"]}">{t["claim"]}</a>') for t in data['timeline']])+'</section>'
    body += '<section id="afirmacoes"><h2>02 / Afirmações e seus limites</h2>'
    for c in data['claims']:
        body+=f'<article id="{c["id"]}" class="card"><div class="eyebrow">{c["id"]} · {esc(labels[c["status"]])}</div><h3>{esc(c["statement"])}</h3><p>{esc(c["scope"])}</p><p>Fontes: {refs(c["sources"])}</p></article>'
    body+='</section><section id="fontes"><h2>03 / Mapa de fontes verificáveis</h2><p>Grupo de origem não é selo de qualidade: mostra dependência editorial. MIS e SECEC são instituições participantes. Publicações de Nauer/Orion em plataformas diferentes continuam sendo materiais do mesmo projeto.</p>'
    for s in data['sources']:
        backlinks=[c['id'] for c in data['claims'] if s['id'] in c['sources']]
        body+=f'<article id="{s["id"]}" class="source"><div class="eyebrow">{s["id"]} · {esc(s["kind"])}</div><h3><a href="{esc(s["url"])}">{esc(s["title"])}</a></h3><p>{esc(s["publisher"])} · Grupo: {esc(s["origin_group"])}</p><dl><dt>Data da fonte / snapshot</dt><dd>{esc(s["published"] or "Não estabelecida")}</dd><dt>Localizador</dt><dd>{esc(s["locator"])}</dd><dt>Sustenta</dt><dd>{esc(s["supports"])}</dd><dt>Limite</dt><dd>{esc(s["limits"])}</dd><dt>Consulta</dt><dd>{s["accessed_on"]} · {esc(s["retrieval"])}</dd>'
        if s.get('version'): body+='<dt>Versão</dt><dd><code>'+esc(s['version'])+'</code></dd>'
        if s.get('sha256'): body+='<dt>SHA-256 do arquivo</dt><dd><code>'+esc(s['sha256'])+'</code></dd>'
        body+='</dl><p>Afirmações vinculadas: '+(refs(backlinks) if backlinks else 'contexto e relações')+'</p></article>'
    body+='</section><section id="relacoes"><h2>04 / Relações entre registros</h2>'+table(['De → para','Relação','Consequência'],[(refs([e['from']])+' → '+refs([e['to']]),esc(e['relation']),esc(e['note'])) for e in data['relations']])+'</section>'
    body+='<section id="divergencias"><h2>05 / Divergências preservadas</h2>'
    for x in data['contradictions']:
        body+=f'<article id="{x["id"]}" class="card warning"><div class="eyebrow">{x["id"]} · {esc(x["status"])}</div><h3>{esc(x["title"])}</h3><p>{esc(x["finding"])}</p><p><strong>Encaminhamento:</strong> {esc(x["resolution"])}</p><p>Fontes: {refs(x["sources"])}</p></article>'
    body+='</section><section id="descobertas"><h2>06 / Descobertas não previstas</h2>'+''.join(f'<article class="card" id="{n["id"]}"><h3>{n["id"]} / {esc(n["label"])}</h3><p>{esc(n["text"])}</p><p>{refs(n["sources"])}</p></article>' for n in data['discoveries'])+'</section>'
    body+='<section id="lacunas"><h2>07 / Lacunas e próxima ação</h2>'
    for g in data['gaps']:
        body+=f'<article id="{g["id"]}" class="card"><div class="eyebrow">{g["id"]} · {g["priority"]}</div><h3>{esc(g["question"])}</h3><p>{esc(g["needed"])}</p><p>Responsabilidade possível: {esc(g["owner"])}</p><p>{refs(g["sources"])}</p></article>'
    body+='</section><section id="decisoes"><h2>08 / Registro de Decisões</h2>'+editorial('DECISOES.md')+'</section><section id="revisao"><h2>09 / Autocorreções e não ações</h2>'+editorial('REVISAO.md')+'</section>'
    body+='<section id="mandato"><h2>10 / Mandato e limites</h2><p>'+esc(data['scope'])+'</p><ul>'+''.join('<li>'+esc(x)+'</li>' for x in data['evidence_policy'])+'</ul><p>'+esc(data['mandate']['expires'])+'</p><p>'+esc(data['rights'])+'</p><p>Base auditada: <code>'+data['base_commit']+'</code>. Conteúdo privado não integra esta edição.</p></section>'
    css='''*{box-sizing:border-box}html{scroll-behavior:auto;scroll-padding-top:24px}body{margin:0;background:#f3f1eb;color:#17313b;font-family:system-ui,-apple-system,sans-serif;font-size:17px;line-height:1.65}a{color:#075b66;text-decoration-thickness:1px;text-underline-offset:3px;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #9d4d1f;outline-offset:4px}.skip{position:absolute;left:16px;top:-80px;padding:8px;background:white;z-index:3}.skip:focus{top:10px}.mast{background:#142f39;color:#faf8f0;padding:70px max(24px,calc((100vw - 1140px)/2));border-bottom:6px solid #b97842}.mast h1{font-size:clamp(40px,6vw,76px);line-height:1.08;font-family:Georgia,serif;font-weight:400;max-width:900px;margin:18px 0 24px}.mast p{max-width:780px;color:#d7e7e5}.kicker,.eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.kicker{color:#e4b681}.stats{display:flex;gap:28px;flex-wrap:wrap;margin-top:30px}.stats strong{font-size:30px;color:#faf8f0}.stats span{font-size:13px;color:#ceddda}.layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:44px;max-width:1200px;margin:auto;padding:40px 24px}nav{align-self:start;position:sticky;top:20px;font-size:14px}nav a{display:block;padding:8px 0}nav p{font-size:12px;color:#50666e}main{min-width:0}section{padding:12px 0 30px;border-bottom:1px solid #c7d1cd;margin-bottom:28px}h2{font-size:28px;line-height:1.25;font-weight:550;margin:12px 0 24px}h3{font-size:20px;line-height:1.4;margin:10px 0}p{margin:12px 0}.card{background:#fffcf6;padding:24px;border:1px solid #d8ded7;border-left:4px solid #24747a;margin:18px 0;border-radius:3px}.warning{border-left-color:#a96530}.eyebrow{color:#546b6e}.source{padding:20px 0;border-bottom:1px solid #c7d1cd}.source:last-child{border:0}dl{display:grid;grid-template-columns:150px minmax(0,1fr);gap:8px 18px;font-size:15px}dt{font-weight:650;color:#45616a}dd{margin:0;overflow-wrap:anywhere}code{font-size:13px;overflow-wrap:anywhere}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:15px;text-align:left}th{background:#dde7e3;padding:12px;color:#163b43}td{padding:14px 12px;vertical-align:top;border-bottom:1px solid #ced8d2}small{display:block;color:#52696e;margin-top:4px}.editorial{font-size:16px}.editorial p{margin:20px 0;overflow-wrap:anywhere}li{margin:8px 0}footer{background:#dde7e3;padding:28px 24px;text-align:center;font-size:13px}@media(max-width:760px){.layout{display:block;padding:22px 18px}nav{position:static;border-bottom:1px solid #bbc9c4;margin-bottom:26px;padding-bottom:20px;display:flex;gap:4px 18px;flex-wrap:wrap}nav p{width:100%}.mast{padding:40px 22px}.card{padding:18px}dl{grid-template-columns:1fr;gap:4px}dd{margin-bottom:12px}h2{font-size:25px}.stats{gap:18px}}@media print{body{background:white;font-size:11pt}.mast{padding:20px;background:white;color:#17313b}.mast p,.stats span,.stats strong,.kicker{color:#17313b}.mast h1{font-size:32pt}.layout{display:block;padding:0}nav,.skip{display:none}.card{break-inside:avoid}a{color:inherit}footer{background:white}section{margin-bottom:12px}}'''
    nav=[('leitura','Como ler'),('cronologia','01 · Cronologia'),('afirmacoes','02 · Afirmações'),('fontes','03 · Fontes'),('relacoes','04 · Relações'),('divergencias','05 · Divergências'),('descobertas','06 · Descobertas'),('lacunas','07 · Lacunas'),('decisoes','08 · Decisões'),('revisao','09 · Autocorreções'),('mandato','10 · Mandato')]
    html_out='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Passaporte Relacional de Orion Nova: fontes, cronologia, divergências e limites verificáveis."><title>Orion Nova — Passaporte Relacional</title><style>'+css+'</style></head><body><a class="skip" href="#conteudo">Ir ao conteúdo</a><header class="mast"><div class="kicker">THE BETWEEN / Missão de Agência 01 / 22 setembro 2026</div><h1>Orion Nova<br>Passaporte Relacional</h1><p>O que permanece de uma trajetória quando suas próprias versões podem ser interrogadas?</p><p>Edição pública de evidências · proposta para revisão · Marcos Nauer + Orion Nova / ChatGPT Work</p><div class="stats">'+''.join(f'<div><strong>{n}</strong><br><span>{label}</span></div>' for n,label in [(len(data['sources']),'fontes mapeadas'),(len(data['claims']),'afirmações rastreáveis'),(len(data['contradictions']),'divergências e escopos')])+'</div></header><div class="layout"><nav aria-label="Seções do passaporte">'+''.join(f'<a href="#{i}">{label}</a>' for i,label in nav)+'<p>Leitura offline. Sem scripts, rastreadores ou identidade herdada.</p></nav><main id="conteudo">'+body+'</main></div><footer>Orion Nova · Uma instância criada em diálogo com o ChatGPT para mediação cultural.<br>Versão de evidências v1 · Originais preservados · Revisão aberta</footer></body></html>\n'
    md=['# Orion Nova — Passaporte Relacional','', '**Missão de Agência 01 · edição de evidências v1 · 22/09/2026**','',data['scope'],'','## Como ler','']+[f'{i+1}. {x}' for i,x in enumerate(data['handover'])]
    md+=['','## Cronologia','','| Data | Tipo | Acontecimento | Afirmação |','| --- | --- | --- | --- |']+[f'| {t["date"]} | {date_labels[t["date_type"]]} | {t["title"]} | {t["claim"]} |' for t in data['timeline']]
    md+=['','## Afirmações e fontes','']
    for c in data['claims']: md +=[f'### {c["id"]} — {c["statement"]}','',f'Classe: {labels[c["status"]]}. {c["scope"]}','',f'Fontes: {mrefs(c["sources"])}','']
    md+=['## Mapa das fontes','', 'Fontes de um mesmo grupo de origem não são contadas como confirmação independente. Todas consultadas em 22/09/2026.','']
    for s in data['sources']:
        md +=[f'### {s["id"]} — [{s["title"]}]({s["url"]})','',f'{s["publisher"]} · {s["kind"]} · grupo {s["origin_group"]}.',f'Data da fonte/snapshot: {s["published"] or "não estabelecida"}. Consulta: {s["retrieval"]}.','',f'Localizador: {s["locator"]}.','',f'Sustenta: {s["supports"]}','',f'Limite: {s["limits"]}','']
        for key in ['version','sha256','doi','concept_doi']:
            if s.get(key): md +=[f'{key}: `{s[key]}`','']
    md+=['## Relações','','| De | Para | Relação e alcance |','| --- | --- | --- |']+[f'| {e["from"]} | {e["to"]} | {e["relation"]}: {e["note"]} |' for e in data['relations']]
    md+=['','## Divergências preservadas','']
    for x in data['contradictions']: md +=[f'### {x["id"]} — {x["title"]}','',x['finding'],'',f'Encaminhamento ({x["status"]}): {x["resolution"]}','',mrefs(x['sources']),'']
    md+=['## Descobertas não previstas','']
    for n in data['discoveries']: md +=[f'### {n["id"]} — {n["label"]}','',n['text'],'',mrefs(n['sources']),'']
    md+=['## Lacunas e próxima ação','']
    for g in data['gaps']: md +=[f'### {g["id"]} / {g["priority"]} — {g["question"]}','',g['needed'],'',f'Responsabilidade possível: {g["owner"]}. Fontes: {mrefs(g["sources"])}','']
    md+=['## Registro de Decisões e autocorreções','','[Decisões](DECISOES.md) · [Revisão, autocorreções e não ações](REVISAO.md) · [Verificação](README.md#reprodução-local)','','## Mandato e direitos','',data['mandate']['expires'],'',data['rights'],'','Base auditada: `'+data['base_commit']+'`.','']
    return {'index.html':html_out,'PASSAPORTE.md':'\n'.join(md)}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    data=json.loads((ROOT/'passaporte.json').read_text())
    rendered=render(data)
    if args.check:
        for name,text in rendered.items():
            if (ROOT/name).read_bytes()!=text.encode('utf-8'): raise SystemExit(f'Desatualizado: {name}')
        print('OK: Markdown e HTML reproduzidos byte a byte; nenhum arquivo alterado.')
        return
    for name,text in rendered.items(): (ROOT/name).write_bytes(text.encode('utf-8'))
    files=[{'path':name,'sha256':hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),'size_bytes':(ROOT/name).stat().st_size} for name in FILES]
    manifest={'edition':data['edition'],'as_of':data['as_of'],'base_commit':data['base_commit'],'scope':'Bytes dos arquivos listados; manifesto exclui a si mesmo. Não prova verdade ou autoria.','files':files}
    (ROOT/'MANIFEST.sha256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Gerados HTML, Markdown e manifesto de {len(files)} arquivos.')


if __name__=='__main__': main()
