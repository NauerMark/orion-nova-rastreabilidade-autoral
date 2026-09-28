import {createSession,act,commit,importRecord} from '../../../platforms/agent-space/school-engine.mjs';
let r = createSession('BET-ACT-02');
for (let i=0;i<500;i++) r=act(r,{type:'source',value:i%2===0});
console.log('Antes de guardar:',r.events.length,'eventos; retomável:',importRecord(JSON.stringify(r)).events.length);
r=commit(r);
console.log('Após guardar pela própria API:',r.events.length,'eventos;',r.versions.length,'versão');
try { importRecord(JSON.stringify(r)); console.log('retomada aceita'); } catch(e) {console.log('retomada rejeitada:',e.message);}
