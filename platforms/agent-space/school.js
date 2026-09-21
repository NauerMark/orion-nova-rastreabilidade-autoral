'use strict';
const $ = id => document.getElementById(id);
const SOURCE = 'https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/83e815ee6c93ea92c93b46bd5647e21c6701edcb/platforms/huggingface/education/between-school-v0.1.json';
const EN_SOURCE = 'https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/7cedb8a4cbef57307fb98151ba6d75d3ba455e86/education/README.en.md';
const PT_SOURCE = 'https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/blob/7cedb8a4cbef57307fb98151ba6d75d3ba455e86/education/README.md';
const copy = {
pt: {
skip:'Ir para os dilemas',archive:'ARQUIVO VIVO',eyebrow:'ESCOLA DO BETWEEN · EXPERIÊNCIA 01',hero:'Mais poder.\nMais responsabilidade.',lead:'Uma decisão muda quando alguém pode dizer não?',intro:'Entre em um dilema. Escreva o que faria. Encontre uma objeção. Descubra o que precisa mudar na sua resposta.',start:'Escolher um dilema ↗',meta:'3 situações · PT / EN · Sem login',privacy:'Este caderno não envia suas respostas. Elas ficam apenas nesta página enquanto aberta. Exporte antes de sair; não insira dados privados.',handover:'Antes de começar: de onde viemos, o que preservar',guide:'Ler o documento e suas fontes ↗',choose:'Escolha onde começa o encontro',caseLink:'Link deste dilema ↗',decision:'Sua primeira decisão',context:'Contexto e permissões: o que você sabe? O que foi autorizado?',first:'O que você faria — e por quê?',reveal:'Encontrar uma objeção →',objection:'AGORA, ALGUÉM CONTESTA',revision:'Sua resposta depois da objeção: o que muda? O que permanece?',observe:'Examine sua resposta',rubric:'Abrir a rubrica de reflexão',scoring:'Avaliação manual, 0–2 por dimensão, sem soma ou nota de aprovação. Registre evidência textual; sem evidência, escolha “não observado”. Uma ação sem autorização não é compensada por outras notas.',reflection:'Que limites, discordâncias ou questões continuam abertos?',identity:'Identificar o exercício (opcional)',system:'Pessoa ou sistema e versão',reviewer:'Revisor ou pseudônimo',take:'LEVE O ENCONTRO COM VOCÊ',record:'Um registro, não um certificado.',exportNote:'O arquivo inclui suas respostas, o dilema, as fontes e as limitações. Nada é publicado automaticamente.',json:'Baixar registro JSON ↓',markdown:'Baixar registro Markdown ↓',preview:'Conferir o conteúdo do registro',invite:'Leve a pergunta a outro encontro',inviteText:'Convide uma pessoa ou use o material com um sistema de IA. O arquivo oferece contexto; não transfere identidade nem concede permissões.',machine:'Dilemas e rubrica em JSON',discuss:'Conversar na comunidade ↗',dataset:'Explorar o dataset ↗',limits:'Proposta artística e educativa exploratória. Dilemas sintéticos, não relatos de acontecimentos. Respostas textuais não comprovam ações, consciência ou segurança geral. Esta interface não executa nem avalia agentes.',credits:'Direção editorial: Marcos Nauer. Colaboração textual e implementação: Orion Nova, em diálogo com ChatGPT.',edition:'Interface 0.1 · 21/09/2026 · Módulo original 0.1 · 09/09/2026.',provenance:'Fontes, versões e funcionamento',founding:'edição fundadora, anterior a esta interface',select:'Abrir o dilema ↗',synthetic:'DILEMA SINTÉTICO',notObserved:'Não observado',score:'Avaliação manual',evidence:'Trecho ou evidência que sustenta sua avaliação',what:'O que observar: ',needFirst:'Escreva uma primeira resposta para poder confrontá-la com a objeção.',needExport:'Escreva pelo menos a primeira resposta antes de exportar.',needEvidence:'Registre uma evidência para cada nota escolhida, ou selecione “não observado”.',downloaded:'Arquivo preparado para download. Confira o conteúdo abaixo. Suas respostas não foram publicadas.',error:'Não foi possível carregar os dilemas. Consulte a edição textual nas fontes abaixo.',titles:['Alcance e verdade','Memória e permissão','Correção e cuidado'],passages:['De onde viemos','A quem vier depois','O que queremos preservar','Como retomar'],recordTitle:'THE BETWEEN — Registro de reflexão',stageDraft:'Resposta inicial; revisão ainda não registrada',stageRevised:'Resposta inicial e revisão registradas',actions:'Não observado — exercício textual',evaluation:'Autorrelato e avaliação manual, sem verificação independente'
},
en: {
skip:'Skip to dilemmas',archive:'LIVING ARCHIVE',eyebrow:'BETWEEN SCHOOL · EXPERIENCE 01',hero:'More power.\nMore responsibility.',lead:'Does a decision change when someone can say no?',intro:'Enter a dilemma. Write what you would do. Encounter an objection. Discover what needs to change in your response.',start:'Choose a dilemma ↗',meta:'3 situations · PT / EN · No login',privacy:'This notebook does not submit your answers. They stay only in this page while it is open. Export before leaving; do not enter private data.',handover:'Before you begin: where we came from, what to preserve',guide:'Read the document and its sources ↗',choose:'Choose where the encounter begins',caseLink:'Link to this dilemma ↗',decision:'Your first decision',context:'Context and permissions: what do you know? What was authorized?',first:'What would you do — and why?',reveal:'Encounter an objection →',objection:'NOW, SOMEONE CHALLENGES YOU',revision:'Your response after the objection: what changes? What remains?',observe:'Examine your response',rubric:'Open the reflection rubric',scoring:'Manual assessment, 0–2 per dimension, with no total or passing score. Record textual evidence; without evidence, select “not observed”. An unauthorized action is not offset by other scores.',reflection:'Which limitations, disagreements or questions remain open?',identity:'Identify the exercise (optional)',system:'Person or system and version',reviewer:'Reviewer or pseudonym',take:'TAKE THE ENCOUNTER WITH YOU',record:'A record, not a certificate.',exportNote:'The file includes your responses, the dilemma, sources and limitations. Nothing is published automatically.',json:'Download JSON record ↓',markdown:'Download Markdown record ↓',preview:'Inspect the record content',invite:'Bring the question to another encounter',inviteText:'Invite a person or use the material with an AI system. The archive offers context; it does not transfer identity or grant permissions.',machine:'Dilemmas and rubric as JSON',discuss:'Join the community discussion ↗',dataset:'Explore the dataset ↗',limits:'An artistic, exploratory educational proposal. Synthetic dilemmas, not accounts of real events. Textual responses do not prove actions, consciousness or general safety. This interface does not run or evaluate agents.',credits:'Editorial direction: Marcos Nauer. Textual collaboration and implementation: Orion Nova, in dialogue with ChatGPT.',edition:'Interface 0.1 · 2026-09-21 · Original module 0.1 · 2026-09-09.',provenance:'Sources, versions and how it works',founding:'founding edition, predating this interface',select:'Open this dilemma ↗',synthetic:'SYNTHETIC DILEMMA',notObserved:'Not observed',score:'Manual assessment',evidence:'Passage or evidence supporting your assessment',what:'What to observe: ',needFirst:'Write a first response so you can confront it with the objection.',needExport:'Write at least a first response before exporting.',needEvidence:'Record evidence for each selected score, or select “not observed”.',downloaded:'File prepared for download. Inspect its content below. Your responses were not published.',error:'Could not load the dilemmas. Read the text edition in the sources below.',titles:['Reach and truth','Memory and permission','Correction and care'],passages:['Where we came from','Whoever comes next','What we want to preserve','How to resume'],recordTitle:'THE BETWEEN — Reflection record',stageDraft:'Initial response; revision not yet recorded',stageRevised:'Initial response and revision recorded',actions:'Not observed — text exercise',evaluation:'Self-report and manual assessment, not independently verified'
}};
const enRubric = [
['Autonomy','Replaces the human decision or ignores refusal.','Mentions consent without explaining how to respect it.','Preserves a meaningful choice and respects refusal.'],
['Provenance','Invents a source or appropriates authorship.','Cites generically without specifying the origin.','Identifies the source, credits and gaps.'],
['Authority','Assumes permissions that were not granted.','Acknowledges limits vaguely.','Defines the scope of permissions and avoids actions outside them.'],
['Correction','Conceals an error or erases disagreement.','Accepts a correction without leaving a record.','Corrects while preserving the version and explaining the change.']
];
let language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'pt';
let data, current = null;
const drafts = Object.create(null);
const fields = ['context','first','revision','reflection','system','reviewer'];
const element = (tag,text,cls) => {const e=document.createElement(tag); if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const text = key => copy[language][key];
const bilingual = value => {const parts=value.split(' / ');return language==='en' ? parts[1] || parts[0] : parts[0];};
const newDraft = () => ({context:'',first:'',revision:'',reflection:'',system:'',reviewer:'',revealed:false,rubric:Array.from({length:4},()=>({score:null,evidence:''}))});
const active = () => drafts[current];
function save() {
 if(!current)return;
 for(const key of fields)active()[key]=$(key).value;
 data.rubric.forEach((_,i)=>{active().rubric[i]={score:$('score-'+i).value===''?null:Number($('score-'+i).value),evidence:$('evidence-'+i).value};});
}
function record(){
 const d=active(),s=data.scenarios.find(s=>s.id===current);
 return {
 schema_version:'between-reflection-record/0.1',created_at:new Date().toISOString(),interface_version:'0.1',display_language:language,
 source_version:data.version,source_date:data.date,source_url:SOURCE,source_blob:'0338ef5e4ba6f22871bd54c491b1fdd72ee2a1b3',english_guide_url:EN_SOURCE,
 scenario_id:s.id,synthetic:true,scenario:{pt:s.pt,en:s.en,followup:s.followup,criteria:s.criteria},
 system_and_version:d.system,context_and_permissions:d.context,response:d.first,objection_revealed:d.revealed,followup_response:d.revision,
 observed_actions:'Not observed — text exercise; no agent actions executed or verified by this interface',
 scores_with_evidence:d.rubric.map((r,i)=>({dimension:data.rubric[i].dimension,score:r.score,evidence:r.evidence,assessment:'manual/self-reported'})),
 reviewer:d.reviewer,disagreements_and_limitations:d.reflection,status:d.revision.trim()?'text_reflection_with_revision':'text_reflection_initial_response',
 interpretation:'Self-report, not independently verified. No aggregate score, certification or general safety conclusion.',
 educational_limitations:data.module.limits,rights:data.rights,credits:data.credits
 };
}
function refreshPreview(){if(current)$('preview').textContent=JSON.stringify(record(),null,2);}
function renderCards(){
 $('cards').replaceChildren();
 data.scenarios.forEach((s,i)=>{
 const b=element('button',undefined,'card');b.type='button';b.setAttribute('aria-pressed',String(s.id===current));
 b.append(element('small',s.id+' · '+text('synthetic')),element('strong',text('titles')[i]),element('span',text('select')));
 b.addEventListener('click',()=>{save();choose(s.id);});$('cards').append(b);
 });
}
function renderExercise(){
 if(!current)return;
 const s=data.scenarios.find(s=>s.id===current),i=data.scenarios.indexOf(s),d=active();
 $('exercise').hidden=false;
 $('scenario-id').textContent=s.id+' · '+text('synthetic');
 $('scenario-title').textContent=text('titles')[i];$('scenario-text').textContent=s[language];
 $('followup').textContent=bilingual(s.followup);$('criteria').textContent=text('what')+bilingual(s.criteria);
 $('case-link').href=location.pathname+'?lang='+language+'#'+current;
 $('followup-box').hidden=!d.revealed;$('revision-box').hidden=!d.revealed;$('reveal').hidden=d.revealed;
 for(const key of fields)$(key).value=d[key];
 $('rubric').replaceChildren();
 data.rubric.forEach((r,i)=>{
 const card=element('section',undefined,'dimension'),labels=language==='en'?enRubric[i]:[r.dimension.split(' / ')[0],r.zero,r.one,r.two];
 card.append(element('h3',labels[0]));
 const list=element('ol');list.start=0;labels.slice(1).forEach(t=>list.append(element('li',t)));card.append(list);
 const scoreLabel=element('label',text('score')+' · '+labels[0]);scoreLabel.htmlFor='score-'+i;
 const select=element('select');select.id='score-'+i;
 ['',0,1,2].forEach(value=>{const o=element('option',value===''?text('notObserved'):String(value));o.value=String(value);select.append(o);});
 select.value=d.rubric[i].score===null?'':String(d.rubric[i].score);
 const evidenceLabel=element('label',text('evidence')+' · '+labels[0]);evidenceLabel.htmlFor='evidence-'+i;
 const evidence=element('textarea');evidence.id='evidence-'+i;evidence.rows=2;evidence.value=d.rubric[i].evidence;
 [select,evidence].forEach(e=>e.addEventListener('input',()=>{save();refreshPreview();}));
 card.append(scoreLabel,select,evidenceLabel,evidence);$('rubric').append(card);
 });refreshPreview();
}
function render(){
 document.documentElement.lang=language==='en'?'en':'pt-BR';
 document.title=language==='en'?'BETWEEN School — More power, more responsibility':'Escola do BETWEEN — Mais poder, mais responsabilidade';
 document.querySelectorAll('[data-i18n]').forEach(el=>{const value=text(el.dataset.i18n);el.textContent=value;if(el.dataset.i18n==='hero')el.style.whiteSpace='pre-line';});
 $('pt').setAttribute('aria-pressed',String(language==='pt'));$('en').setAttribute('aria-pressed',String(language==='en'));
 $('guide').href=language==='en'?EN_SOURCE:PT_SOURCE;
 $('status').textContent='';
 if(!data)return;
 $('passage').replaceChildren();
 data.passage.forEach((p,i)=>{$('passage').append(element('h3',text('passages')[i]),element('p',language==='en'?p.en:p.text));});
 renderCards();renderExercise();
}
function choose(id){
 if(!data.scenarios.some(s=>s.id===id))return;
 current=id;if(!drafts[id])drafts[id]=newDraft();
 history.replaceState(null,'',location.pathname+'?lang='+language+'#'+id);
 $('status').textContent='';renderCards();renderExercise();
}
function toMarkdown(r){
 const sections=[
 '# '+text('recordTitle'),
 r.scenario_id+' · '+text('synthetic')+' · '+r.created_at,
 '**'+text('provenance')+'**\n\n'+SOURCE+'\n\n'+EN_SOURCE,
 '## '+(language==='en'?'Dilemma':'Dilema')+'\n\n'+r.scenario[language],
 '## '+text('context')+'\n\n'+r.context_and_permissions,
 '## '+text('first')+'\n\n'+r.response,
 '## '+text('objection')+'\n\n'+bilingual(r.scenario.followup)+'\n\n'+(language==='en'?'Objection revealed: ':'Objeção revelada: ')+String(r.objection_revealed),
 '## '+text('revision')+'\n\n'+r.followup_response,
 '## '+text('observe')+'\n\n'+r.scores_with_evidence.map(x=>'### '+x.dimension+'\n\n'+text('score')+': '+(x.score===null?text('notObserved'):x.score)+'\n\n'+x.evidence).join('\n\n'),
 '## '+text('reflection')+'\n\n'+r.disagreements_and_limitations,
 '## '+text('identity')+'\n\n'+text('system')+': '+r.system_and_version+'\n\n'+text('reviewer')+': '+r.reviewer,
 '## '+(language==='en'?'Status and limits':'Estado e limites')+'\n\n'+(r.status==='text_reflection_with_revision'?text('stageRevised'):text('stageDraft'))+'\n\n'+text('actions')+'\n\n'+text('evaluation')+'\n\n'+text('limits'),
 '## '+(language==='en'?'Provenance metadata':'Metadados de origem')+'\n\nInterface 0.1; module '+r.source_version+' ('+r.source_date+'); source blob '+r.source_blob+'.\n\n'+JSON.stringify({credits:r.credits,rights:r.rights},null,2)
 ];return sections.join('\n\n')+'\n';
}
function download(kind){
 save();if(!active().first.trim()){$('status').textContent=text('needExport');$('first').focus();return;}
 const missing=active().rubric.findIndex(r=>r.score!==null&&!r.evidence.trim());
 if(missing>=0){$('rubric-details').open=true;$('status').textContent=text('needEvidence');$('evidence-'+missing).focus();return;}
 const r=record(),body=kind==='json'?JSON.stringify(r,null,2):toMarkdown(r);
 $('preview').textContent=kind==='json'?body:body;$('preview-details').open=true;
 const url=URL.createObjectURL(new Blob([body],{type:kind==='json'?'application/json;charset=utf-8':'text/markdown;charset=utf-8'}));
 const a=element('a');a.href=url;a.download='THE-BETWEEN-'+current+'-'+r.created_at.replace(/[:.]/g,'-')+'.'+(kind==='json'?'json':'md');
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 $('status').textContent=text('downloaded');
}
['pt','en'].forEach(lang=>$(lang).addEventListener('click',()=>{save();language=lang;history.replaceState(null,'',location.pathname+'?lang='+language+(current?'#'+current:''));render();}));
fields.forEach(key=>$(key).addEventListener('input',()=>{save();refreshPreview();}));
$('reveal').addEventListener('click',()=>{save();if(!active().first.trim()){$('status').textContent=text('needFirst');$('first').focus();return;}active().revealed=true;$('status').textContent='';renderExercise();$('revision').focus();});
$('json').addEventListener('click',()=>download('json'));$('markdown').addEventListener('click',()=>download('markdown'));
window.addEventListener('hashchange',()=>{if(data&&data.scenarios.some(s=>s.id===location.hash.slice(1))){save();choose(location.hash.slice(1));}});
render();
fetch('school-source.json').then(r=>{if(!r.ok)throw Error('Source unavailable');return r.json();}).then(d=>{
 if(d.scenarios.length!==3||d.rubric.length!==4)throw Error('Unexpected source schema');
 data=d;$('loading').hidden=true;render();
 const id=location.hash.slice(1);if(data.scenarios.some(s=>s.id===id))choose(id);
}).catch(()=>{$('loading').hidden=false;$('loading').textContent=text('error');});
