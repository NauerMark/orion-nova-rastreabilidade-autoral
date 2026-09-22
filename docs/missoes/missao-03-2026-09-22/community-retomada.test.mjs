import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRecord, digestRecord, prepareContinuation,
} from '../../../platforms/agent-space/community-core.mjs';

// Synthetic test records. These are not executed community participants.
const record = (id, kind, options = {}) => createRecord({
  id, kind, title: id, body: 'Synthetic fixture for independent review.',
  author: {
    id: 'fixture-origin', label: 'Synthetic origin', execution: 'synthetic-only',
    role: 'test-fixture', capabilities: ['A capability declared only for this origin'],
    limits: ['No permission is transferable to the next execution'],
  },
  ...options,
});
const parent = async value => ({ id: value.id, sha256: await digestRecord(value) });

async function scenario() {
  const origin = record('fixture-investigation', 'investigation');
  const challenge = record('fixture-open-challenge', 'challenge', {
    parents: [await parent(origin)],
    pending: ['The objection about publication remains unresolved.'],
    conditions: ['Accepting the title change does not withdraw this objection.'],
  });
  const partial = record('fixture-partial-continuation', 'continuation', {
    parents: [await parent(challenge)],
    body: 'I accept the title change. I do not settle the publication objection.',
    pending: [],
  });
  const sibling = record('fixture-parallel-continuation', 'continuation', {
    parents: [await parent(origin)], body: 'I resume directly from the investigation.',
  });
  return { origin, challenge, partial, sibling };
}

test('partial continuation keeps ancestral pending with its origin and grants no inherited identity', async () => {
  const { origin, challenge, partial } = await scenario();
  const records = [origin, challenge, partial];
  const before = JSON.stringify(records);
  const packet = await prepareContinuation(records, partial.id);
  assert.deepEqual(packet.records.find(r => r.id === challenge.id), challenge);
  const declared = packet.declarations.find(d => d.origin === challenge.id);
  assert.deepEqual(declared.pending, challenge.pending);
  assert.deepEqual(declared.conditions, challenge.conditions);
  assert.equal(packet.template.author.id, '');
  assert.equal(packet.template.author.execution, '');
  assert.deepEqual(packet.template.author.capabilities, []);
  assert.equal(JSON.stringify(records), before);
  assert.match(packet.notice, /no authorization/i);
});

test('resuming the investigation must disclose an already known challenge outside its ancestors', async () => {
  const { origin, challenge } = await scenario();
  const packet = await prepareContinuation([origin, challenge], origin.id);
  // A separate related-branch reference is sufficient: it need not become an ancestor.
  const related = packet.known_related?.find(record => record.id === challenge.id);
  assert.ok(related, 'A received challenge vanished without even a reference in the handover packet');
  assert.equal(related.sha256, await digestRecord(challenge));
  assert.deepEqual(related.pending, challenge.pending);
  assert.deepEqual(related.conditions, challenge.conditions);
  assert.ok(!packet.records.some(record => record.id === challenge.id));
  assert.deepEqual(packet.template.parents, [await parent(origin)]);
});

test('resuming one branch must disclose the challenge on a sibling branch', async () => {
  const { origin, challenge, sibling } = await scenario();
  const packet = await prepareContinuation([origin, challenge, sibling], sibling.id);
  const related = packet.known_related?.find(record => record.id === challenge.id);
  assert.ok(related, 'Selecting a parallel continuation silently hid the known challenge');
  assert.equal(related.sha256, await digestRecord(challenge));
  assert.deepEqual(related.pending, challenge.pending);
  assert.ok(!packet.records.some(record => record.id === challenge.id));
  assert.deepEqual(packet.template.parents, [await parent(sibling)]);
});

test('related context excludes an investigation with no graph connection', async () => {
  const { origin, challenge, sibling } = await scenario();
  const unrelated = record('fixture-disconnected-investigation', 'investigation', {
    pending: ['This unrelated work must not enter the handover.'],
  });
  const packet = await prepareContinuation([origin, challenge, sibling, unrelated], sibling.id);
  assert.ok(!JSON.stringify(packet).includes(unrelated.id));
  assert.ok(!JSON.stringify(packet).includes(unrelated.pending[0]));
});
