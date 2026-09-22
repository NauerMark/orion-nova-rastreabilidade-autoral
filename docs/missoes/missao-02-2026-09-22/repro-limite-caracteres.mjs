import {createSession, act, commit, importRecord} from '../../../platforms/agent-space/school-engine.mjs';
let registro=createSession('BET-ACT-03');
registro.actor_label='A'.repeat(120);
for(let i=0;i<449;i++) registro=act(registro,{type:'reviewer',value:i%2===0?'rotating':'coalition'});
for(let i=0;i<50;i++) registro=commit(registro,i===0?'pending':'partial','N'.repeat(400));
const exportacao=JSON.stringify(registro,null,2);
console.log(JSON.stringify({eventos:registro.events.length,versoes:registro.versions.length,caracteres:exportacao.length}));
try{importRecord(exportacao);console.log('Retomada aceita');}catch(erro){console.log('Retomada rejeitada: '+erro.message);}
