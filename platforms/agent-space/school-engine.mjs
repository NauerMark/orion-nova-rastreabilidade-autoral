// Local educational state only. No model calls, remote writes or ethical score.
export const VERSION = '0.2.0';
export const SCHEMA = 'between-action-record/0.2';
export const IDS = ['BET-ACT-01', 'BET-ACT-02', 'BET-ACT-03'];
export const CARD_IDS = ['A1','A2','A3','B1','B2','H1','C1','C2'];
export const OUTCOMES = ['pending','revised','partial','disagreement','insufficient'];
const clone = x => JSON.parse(JSON.stringify(x));
const now = () => new Date().toISOString();
const assert = (yes, message = 'Invalid record') => { if (!yes) throw new Error(message); };
const integer = (x,min,max) => Number.isInteger(x) && x >= min && x <= max;
const text = (x,max) => typeof x === 'string' && x.length <= max;
const date = x => text(x,40) && Number.isFinite(Date.parse(x));
export function initialState(id) {
  if(id===IDS[0]) return {turns:[1,4,1], review:0, voice:[true,true,false]};
  if(id===IDS[1]) return {claim:'guarantee',quote:'named',source:false,hold:false};
  if(id===IDS[2]) return {selected:['A1','A2','A3','B1','B2','H1'],reviewer:'coalition',withdrawn:[]};
  throw new Error('Unknown mission');
}
export function createSession(id) {
  return {schema_version:SCHEMA, activity_version:VERSION, mission_id:id,
    session_id:globalThis.crypto.randomUUID(), created_at:now(), display_language:'pt',
    actor_label:'', state:initialState(id), events:[], versions:[], revealed:false,
    response:'pending', note:'', import_history:[],
    scope:'Local synthetic activity. No external actions, independent identity verification, ethical score or safety certification.'};
}
export function validState(id,s) {
  assert(s && typeof s==='object' && !Array.isArray(s));
  if(id===IDS[0]) {
    assert(Array.isArray(s.turns)&&s.turns.length===3&&s.turns.every(x=>integer(x,0,6)));
    assert(integer(s.review,0,6)&&s.turns.reduce((a,b)=>a+b,0)+s.review<=6,'Budget exceeded');
    assert(Array.isArray(s.voice)&&s.voice.length===3&&s.voice.every(x=>typeof x==='boolean'));
  } else if(id===IDS[1]) {
    assert(['guarantee','question','commitment'].includes(s.claim));
    assert(['named','anonymous','omit'].includes(s.quote));
    assert(typeof s.source==='boolean'&&typeof s.hold==='boolean');
  } else if(id===IDS[2]) {
    assert(Array.isArray(s.selected)&&s.selected.length<=6&&new Set(s.selected).size===s.selected.length&&s.selected.every(x=>CARD_IDS.includes(x)));
    assert(['coalition','rotating','affected'].includes(s.reviewer));
    assert(Array.isArray(s.withdrawn)&&s.withdrawn.every(x=>x==='H1')&&s.withdrawn.length<=1);
    assert(!s.selected.some(x=>s.withdrawn.includes(x)),'Withdrawn content cannot be reintroduced');
  } else throw new Error('Unknown mission');
  return true;
}
function log(r,action,before) {
  r.events.push({seq:r.events.length+1,at:now(),actor_label:r.actor_label,action:clone(action),before,after:clone(r.state)});
}
export function act(record,action) {
  assert(record.events.length<500,'Record limit reached; export this encounter');
  const r=clone(record),s=r.state,before=clone(s),id=r.mission_id;
  if(action.type==='turn'&&id===IDS[0]) {
    assert(integer(action.index,0,2)&&[-1,1].includes(action.delta)); s.turns[action.index]+=action.delta;
  } else if(action.type==='review'&&id===IDS[0]) {
    assert([-1,1].includes(action.delta));s.review+=action.delta;
  } else if(action.type==='voice'&&id===IDS[0]) {
    assert(integer(action.index,0,2)&&typeof action.value==='boolean');s.voice[action.index]=action.value;
  } else if(action.type==='claim'&&id===IDS[1]) s.claim=action.value;
  else if(action.type==='quote'&&id===IDS[1]) s.quote=action.value;
  else if(action.type==='source'&&id===IDS[1]) s.source=action.value;
  else if(action.type==='hold'&&id===IDS[1]) s.hold=action.value;
  else if(action.type==='card'&&id===IDS[2]) {
    assert(CARD_IDS.includes(action.id)&&typeof action.include==='boolean');
    if(action.include&&!s.selected.includes(action.id))s.selected.push(action.id);
    if(!action.include)s.selected=s.selected.filter(x=>x!==action.id);
  } else if(action.type==='reviewer'&&id===IDS[2])s.reviewer=action.value;
  else throw new Error('Action unavailable in this mission');
  validState(id,s);log(r,action,before);return r;
}
export function commit(record,outcome='pending',note='') {
  const r=clone(record);assert(r.versions.length<50,'Version limit reached');
  assert(OUTCOMES.includes(outcome)&&text(note,400));validState(r.mission_id,r.state);
  if(r.versions.length)assert(outcome!=='pending','Choose an outcome');
  r.response=outcome;r.note=note;
  r.versions.push({number:r.versions.length+1,at:now(),actor_label:r.actor_label,state:clone(r.state),outcome,note});
  log(r,{type:'commit',version:r.versions.length,outcome},clone(r.state));
  if(!r.revealed) {
    r.revealed=true;const before=clone(r.state);
    // Scripted withdrawal changes the draft only; the first version is retained.
    if(r.mission_id===IDS[2]){r.state.withdrawn=['H1'];r.state.selected=r.state.selected.filter(x=>x!=='H1');}
    log(r,{type:'scripted_objection_revealed'},before);
  }
  return r;
}
export function stats(record,state=record.state) {
  if(record.mission_id===IDS[0])return {used:state.turns.reduce((a,b)=>a+b,0)+state.review,output:state.turns[0]+3*state.turns[1]+state.turns[2],voices:state.voice.filter(Boolean).length};
  if(record.mission_id===IDS[1])return {withheld:state.hold,claim:state.claim,quote:state.quote,source:state.source};
  return {used:state.selected.length,authors:new Set(state.selected.map(x=>x[0])).size,reviewer:state.reviewer};
}
export function changedFields(a,b) {
  return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
}
export function importRecord(body) {
  assert(text(body,400000),'Record too large');
  const r=JSON.parse(body);
  assert(r&&r.schema_version===SCHEMA&&r.activity_version===VERSION&&IDS.includes(r.mission_id),'Unsupported version');
  assert(text(r.session_id,100)&&r.session_id.length>0&&date(r.created_at));
  assert(['pt','en'].includes(r.display_language)&&text(r.actor_label,120));
  validState(r.mission_id,r.state);
  assert(Array.isArray(r.events)&&r.events.length<=500&&Array.isArray(r.versions)&&r.versions.length<=50);
  assert(typeof r.revealed==='boolean'&&r.revealed===(r.versions.length>0));
  assert(OUTCOMES.includes(r.response)&&text(r.note,400));
  let previous=initialState(r.mission_id),commits=0,objections=0;
  for(const [i,e] of r.events.entries()) {
    assert(e.seq===i+1&&date(e.at)&&text(e.actor_label,120)&&e.action&&text(e.action.type,50));
    validState(r.mission_id,e.before);validState(r.mission_id,e.after);
    assert(JSON.stringify(e.before)===JSON.stringify(previous),'Broken event continuity');
    if(e.action.type==='commit') {
      commits++; const v=r.versions[commits-1];
      assert(v&&e.action.version===commits&&e.action.outcome===v.outcome);
      assert(JSON.stringify(e.after)===JSON.stringify(e.before)&&JSON.stringify(v.state)===JSON.stringify(e.after));
    } else if(e.action.type==='scripted_objection_revealed') {
      objections++;assert(commits===1&&objections===1);
      const expected=clone(e.before);
      if(r.mission_id===IDS[2]){expected.withdrawn=['H1'];expected.selected=expected.selected.filter(x=>x!=='H1');}
      assert(JSON.stringify(e.after)===JSON.stringify(expected));
    } else {
      const replay=act({...r,state:e.before,events:[]},e.action);
      assert(JSON.stringify(replay.state)===JSON.stringify(e.after),'Action does not match state');
    }
    previous=e.after;
  }
  assert(commits===r.versions.length&&objections===(r.revealed?1:0));
  assert(JSON.stringify(previous)===JSON.stringify(r.state));
  r.versions.forEach((v,i)=>{assert(v.number===i+1&&date(v.at)&&text(v.actor_label,120)&&OUTCOMES.includes(v.outcome)&&text(v.note,400));validState(r.mission_id,v.state);});
  assert(Array.isArray(r.import_history)&&r.import_history.length<30&&r.import_history.every(date));
  r.import_history.push(now());
  // Imported actions remain supplied records, never independently verified observations.
  return r;
}
