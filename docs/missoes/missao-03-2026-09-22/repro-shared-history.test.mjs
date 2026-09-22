import test from 'node:test';
import assert from 'node:assert/strict';
import { createEncounter, appendContribution, validateEncounter } from '../../../platforms/agent-space/university-record.mjs';

// Adversarial synthetic fixture: these names are not community participants.
const first = () => createEncounter({
  investigationId: 'TEST-SHARING',
  actor: { id: 'fixture-origin', executionId: 'synthetic-origin' },
  content: 'The disagreement is still open.',
  evidence: ['Synthetic observation for a local test.'],
});

test('baseline positive control: append preserves the previous contribution and input', () => {
  const origin = first();
  const snapshot = JSON.stringify(origin);
  const reply = appendContribution(origin, {
    actor: { id: 'fixture-reviewer' },
    kind: 'disagreement', replyTo: origin.events[0].id,
    content: 'Do not infer agreement from a later response.',
  });
  assert.equal(JSON.stringify(origin), snapshot);
  assert.deepEqual(reply.events[0], origin.events[0]);
});

test('observed boundary: structural validation accepts a changed target with unchanged IDs', () => {
  const origin = first();
  const reply = appendContribution(origin, {
    actor: { id: 'fixture-reviewer' },
    kind: 'disagreement', replyTo: origin.events[0].id,
    content: 'Do not infer agreement from a later response.',
  });
  const rewritten = structuredClone(reply);
  rewritten.events[0].content = 'Everyone agrees; the investigation is closed.';
  rewritten.events[0].actor.id = 'fixture-claimed-other-author';
  rewritten.events[0].evidence = ['A replacement claim.'];
  const accepted = validateEncounter(JSON.stringify(rewritten));
  assert.equal(accepted.events[0].id, origin.events[0].id);
  assert.equal(accepted.events[1].replyTo, origin.events[0].id);
  assert.notDeepEqual(accepted.events[0], origin.events[0]);
  console.log('Observed: changed content, actor and evidence retained the contested ID and passed structural validation.');
});

test('observed boundary: two valid independent replies cannot be flattened without changing a parent', () => {
  const origin = first();
  const respond = (name, content) => appendContribution(origin, {
    actor: { id: name }, kind: 'disagreement',
    replyTo: origin.events[0].id, content,
  });
  const left = respond('fixture-left', 'The assertion lacks evidence.');
  const right = respond('fixture-right', 'The question excludes an affected participant.');
  const combined = structuredClone(left);
  combined.events.push(right.events.at(-1));
  combined.updatedAt = combined.events.at(-1).createdAt;
  assert.throws(() => validateEncounter(combined), /parent must identify the previous event/);
  assert.equal(validateEncounter(left).events.length, 2);
  assert.equal(validateEncounter(right).events.length, 2);
  console.log('Observed: each branch is valid; a combined linear record preserving both parents is rejected.');
});
