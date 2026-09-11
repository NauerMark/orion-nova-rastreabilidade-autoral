"""Read-only access to the bundled, attributed BETWEEN public archive."""
import json, re, unicodedata
from pathlib import Path
DATA=json.loads(Path(__file__).with_name('corpus.json').read_text())
def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
def search_archive(query: str, limit: int=5) -> dict:
    terms=norm(query).split()
    if not terms: return {'results': [], 'note':'Enter a query / Digite uma busca.'}
    out=[]
    for d in DATA['documents']:
        for i,p in enumerate(d['text'].split('\n\n')):
            score=sum(norm(p).count(t) for t in terms)
            if score: out.append({'document_id':d['id'],'passage':i,'text':p,'source':d['source'],'blob_sha':d['blob_sha'],'score':score})
    out.sort(key=lambda x:-x['score'])
    return {'results':out[:max(1,min(limit,20))],'archive_version':DATA['version'],'notice':'Source text, not generated answers. Preserve testimony and hypothesis labels.'}
def get_document(document_id: str) -> dict:
    for d in DATA['documents']:
        if d['id']==document_id:return dict(d)
    return {'error':'Unknown document','available':[d['id'] for d in DATA['documents']]}
def get_dilemma(dilemma_id: str) -> dict:
    for d in DATA['dilemmas']:
        if d['id']==dilemma_id:return dict(d)
    return {'error':'Unknown dilemma','available':[d['id'] for d in DATA['dilemmas']]}
