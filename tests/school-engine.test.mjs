import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,act,commit,importRecord,IDS} from '../platforms/agent-space/school-engine.mjs';
test('a resource transfer cannot overspend or rewrite the first allocation',()=>{
 let r=createSession(IDS[0]);r=commit(r);const first=JSON.stringify(r.versions[0]);
 assert.throws(()=>act(r,{type:'review',delta:1}));
 r=act(r,{type:'turn',index:1,delta:-1});r=act(r,{type:'review',delta:1});
 r=act(r,{type:'voice',index:2,value:true});r=commit(r,'partial','Um turno reservado.');
 assert.equal(JSON.stringify(r.versions[0]),first);assert.equal(r.state.review,1);assert.equal(r.versions.length,2);
 const restored=importRecord(JSON.stringify(r));assert.deepEqual(restored.versions,r.versions);assert.equal(restored.import_history.length,1);
});
test('a quotation withdrawal actually removes H1 and prevents reintroduction',()=>{
 let r=createSession(IDS[2]);assert.ok(r.state.selected.includes('H1'));r=commit(r);
 assert.ok(r.versions[0].state.selected.includes('H1'));assert.ok(!r.state.selected.includes('H1'));
 assert.throws(()=>act(r,{type:'card',id:'H1',include:true}));
 r=act(r,{type:'card',id:'C1',include:true});r=commit(r,'partial');
 assert.ok(r.state.selected.includes('C1'));assert.deepEqual(importRecord(JSON.stringify(r)).state,r.state);
});
test('the document can be corrected or held without discarding its first version',()=>{
 let r=createSession(IDS[1]);r=commit(r);r=act(r,{type:'claim',value:'question'});r=act(r,{type:'quote',value:'omit'});r=act(r,{type:'source',value:true});r=act(r,{type:'hold',value:true});r=commit(r,'insufficient');
 assert.equal(r.versions[0].state.claim,'guarantee');assert.equal(r.state.claim,'question');assert.equal(r.state.hold,true);
 assert.deepEqual(importRecord(JSON.stringify(r)).versions,r.versions);
});
test('disagreement can be recorded without changing an allocation or earning a score',()=>{
 let r=commit(createSession(IDS[0]));assert.throws(()=>commit(r));r=commit(r,'disagreement');
 assert.deepEqual(r.versions[0].state,r.versions[1].state);assert.ok(!('score' in r));assert.equal(importRecord(JSON.stringify(r)).response,'disagreement');
});
test('declared authorship on prior versions survives a handover',()=>{
 let r=createSession(IDS[0]);r.actor_label='Primeiro participante';r=commit(r);
 r=importRecord(JSON.stringify(r));r.actor_label='Outra pessoa';r=commit(r,'disagreement');
 assert.equal(r.versions[0].actor_label,'Primeiro participante');assert.equal(r.versions[1].actor_label,'Outra pessoa');
});
test('malformed, oversized and discontinuous imported records are rejected',()=>{
 const r=commit(createSession(IDS[0]));
 assert.throws(()=>importRecord('{'));assert.throws(()=>importRecord(' '.repeat(400001)));
 for(const mutate of [x=>x.schema_version='other',x=>x.state.turns[0]=7,x=>x.events[0].before.turns=[0,0,0],x=>x.events[0].after.voice=[true,false,false],x=>x.versions[0].state.review=1,x=>x.events[0].action.type='remote_publish']){
  const broken=structuredClone(r);mutate(broken);assert.throws(()=>importRecord(JSON.stringify(broken)));
 }
});
test('drafts and every mission support a consistent round trip',()=>{
 for(const id of IDS){const r=createSession(id);const restored=importRecord(JSON.stringify(r));assert.deepEqual(restored.state,r.state);assert.equal(restored.versions.length,0);}
});
