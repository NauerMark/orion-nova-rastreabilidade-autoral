import test from 'node:test';
import assert from 'node:assert/strict';
import {renderBoardPreservingFocus} from '../platforms/agent-space/school-focus.mjs';

// A controlled DOM tests destination selection. Real browser checks are separate.
function fixture(specs,{focused,sourceOpen=false,outside=false}={}) {
 const body={id:'',tagName:'BODY'}, external={id:'note',tagName:'TEXTAREA'};
 const doc={activeElement:body,getElementById(id){return nodes.find(n=>n.id===id)||(source?.id===id?source:null)||(external.id===id?external:null);}};
 let nodes=[],source=null,groups=new Map();const attempts=[];
 const board={ownerDocument:doc,contains:n=>nodes.includes(n)||n===source,
  querySelectorAll:()=>nodes,querySelector:selector=>selector==='#mission-source'?source:null};
 function render(next,{open=false}={}) {
  if(board.contains(doc.activeElement))doc.activeElement=body;
  groups=new Map();
  nodes=next.map(spec=>{
   const n={tagName:'BUTTON',disabled:false,blocked:false,...spec,ownerDocument:doc,
    closest(selector){return selector==='.stepper'&&n.group?groups.get(n.group):null;},
    focus(options){attempts.push({id:n.id,options});if(!n.disabled&&!n.blocked)doc.activeElement=n;}};
   return n;
  });
  for(const n of nodes)if(n.group&&!groups.has(n.group))groups.set(n.group,{querySelectorAll:()=>nodes.filter(x=>x.group===n.group)});
  source={id:'mission-source',open};
 }
 render(specs,{open:sourceOpen});
 doc.activeElement=outside?external:nodes.find(n=>n.id===focused)||body;
 return {board,doc,render,attempts,get active(){return doc.activeElement;},get source(){return source;},get nodes(){return nodes;},body,external};
}

test('the same enabled logical control keeps focus after being replaced',()=>{
 const f=fixture([{id:'before'},{id:'selected'},{id:'after'}],{focused:'selected'}),old=f.active;
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'before'},{id:'selected'},{id:'after'}]));
 assert.equal(f.active.id,'selected');assert.notEqual(f.active,old);
 assert.deepEqual(f.attempts,[{id:'selected',options:{preventScroll:true}}]);
});

test('a counter at its limit moves to the enabled sibling, before other controls',()=>{
 const f=fixture([{id:'other'},{id:'minus',group:'turns'},{id:'plus',group:'turns'},{id:'after'}],{focused:'plus'});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'other'},{id:'minus',group:'turns'},{id:'plus',group:'turns',disabled:true},{id:'after'}]));
 assert.equal(f.active.id,'minus');assert.deepEqual(f.attempts.map(x=>x.id),['minus']);
});

test('a removed control continues forward from its previous position, skipping disabled controls',()=>{
 const f=fixture([{id:'first'},{id:'active'},{id:'next-disabled'},{id:'next-enabled'}],{focused:'active'});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'new-first'},{id:'first'},{id:'next-disabled',disabled:true},{id:'next-enabled'}]));
 assert.equal(f.active.id,'next-enabled');
});

test('without a forward destination, the nearest enabled previous control is used',()=>{
 const f=fixture([{id:'first'},{id:'previous'},{id:'active'},{id:'last'}],{focused:'active'});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'first'},{id:'previous'},{id:'active',disabled:true},{id:'last',disabled:true}]));
 assert.equal(f.active.id,'previous');
});

test('focus outside the board is preserved without a focus call',()=>{
 const f=fixture([{id:'choice'}],{outside:true});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'choice'}]));
 assert.equal(f.active,f.external);assert.deepEqual(f.attempts,[]);
});

test('source disclosure remains open while the board is replaced',()=>{
 const f=fixture([{id:'source-summary',tagName:'SUMMARY'},{id:'choice'}],{focused:'source-summary',sourceOpen:true});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'source-summary',tagName:'SUMMARY'},{id:'choice'}]));
 assert.equal(f.source.open,true);assert.equal(f.active.id,'source-summary');
});

test('source disclosure state is preserved even with focus outside the board',()=>{
 const f=fixture([{id:'choice'}],{outside:true,sourceOpen:true});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'choice'}]));
 assert.equal(f.source.open,true);assert.equal(f.active,f.external);
});

test('a source deliberately closed by the reader does not reopen on the next action',()=>{
 const f=fixture([{id:'choice'}],{focused:'choice',sourceOpen:false});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'choice'}],{open:true}));
 assert.equal(f.source.open,false);assert.equal(f.active.id,'choice');
});

test('when every destination is disabled no invalid focus is attempted',()=>{
 const f=fixture([{id:'before'},{id:'active'},{id:'after'}],{focused:'active'});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'before',disabled:true},{id:'active',disabled:true},{id:'after',disabled:true}]));
 assert.equal(f.active,f.body);assert.deepEqual(f.attempts,[]);
});

test('a target that cannot receive focus does not stop the search',()=>{
 const f=fixture([{id:'active'},{id:'after'}],{focused:'active'});
 renderBoardPreservingFocus(f.board,()=>f.render([{id:'active',blocked:true},{id:'after'}]));
 assert.equal(f.active.id,'after');assert.deepEqual(f.attempts.map(x=>x.id),['active','after']);
});

test('render is called exactly once and disabled states are not modified',()=>{
 const f=fixture([{id:'minus',group:'turns'},{id:'plus',group:'turns'}],{focused:'plus'});let calls=0;
 renderBoardPreservingFocus(f.board,()=>{calls++;f.render([{id:'minus',group:'turns'},{id:'plus',group:'turns',disabled:true}]);});
 assert.equal(calls,1);assert.equal(f.nodes.find(x=>x.id==='plus').disabled,true);
});
