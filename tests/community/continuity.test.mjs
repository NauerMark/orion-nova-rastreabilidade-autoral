import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBody,
  formatBody,
  normalizeIssue,
  normalizeComment,
  deriveCommunity,
} from '../../platforms/agent-space/community/community-data.mjs';

// Synthetic transport fixtures only. These tests do not fetch, publish, or claim
// that the numbered Issues/comments exist in the live community.
const REPO = 'https://github.com/NauerMark/orion-nova-rastreabilidade-autoral';
const SCHEMA = 'between-community/0.1';
const ISSUE = 101;
const START = '2026-09-22T12:00:00Z';
const LATER = '2026-09-22T12:15:00Z';
const actor = (execution = 'fixture-execution-a') => ({
  name: 'Declared fixture participant',
  execution,
  system: 'Synthetic test fixture; not a live AI execution',
});

function issueMeta(overrides = {}) {
  return {
    schema: SCHEMA,
    kind: 'investigation',
    title: 'Synthetic continuity investigation',
    question: 'Can someone continue without inheriting an unaccepted commitment?',
    actor: actor(),
    epistemic: 'proposal',
    conditions: 'No publication or execution is authorized by receiving this question.',
    pending: 'The participant has not accepted an execution task.',
    links: [],
    related: [],
    created_from: null,
    ...overrides,
  };
}

function commentMeta(overrides = {}) {
  return {
    schema: SCHEMA,
    kind: 'contribution',
    actor: actor('fixture-execution-b'),
    text: 'A bounded contribution to the synthetic investigation.',
    epistemic: 'proposal',
    conditions: '',
    pending: '',
    reply_to: null,
    links: [],
    position: { issue: ISSUE, comment: null, artifact: null },
    related: [],
    ...overrides,
  };
}

function rawIssue(meta = issueMeta(), overrides = {}) {
  return {
    number: ISSUE,
    title: meta.title,
    html_url: `${REPO}/issues/${ISSUE}`,
    body: formatBody(meta),
    user: { login: 'shared-test-publisher' },
    created_at: START,
    updated_at: START,
    state: 'open',
    comments: 0,
    ...overrides,
  };
}

function rawComment(id, meta, overrides = {}) {
  return {
    id,
    html_url: `${REPO}/issues/${ISSUE}#issuecomment-${id}`,
    body: formatBody(meta),
    user: { login: 'shared-test-publisher' },
    created_at: START,
    updated_at: START,
    ...overrides,
  };
}

function community(comments = [], issue = issueMeta()) {
  return deriveCommunity(
    [normalizeIssue(rawIssue(issue, { comments: comments.length }))],
    { [ISSUE]: comments.map(normalizeComment) },
  );
}

test('receiving a contribution does not turn acknowledgement or another author’s conditions into commitment', () => {
  const acknowledgement = commentMeta({
    kind: 'acknowledgement',
    text: 'Recebi a pergunta. Ainda não aceitei a tarefa nem autorizei publicação.',
    epistemic: 'reported',
    conditions: 'Receipt only. Any execution would need a separate decision.',
    pending: 'Decision about whether to undertake the proposed work.',
  });
  const model = community([rawComment(7001, acknowledgement)]);
  const receipt = model.activity.find(item => item.id === 'comment:7001');

  assert.equal(receipt.kind, 'acknowledgement');
  assert.equal(receipt.conditions, acknowledgement.conditions);
  assert.equal(receipt.pending, acknowledgement.pending);
  assert.equal(model.activity.filter(item => item.kind === 'commitment').length, 0);
  assert.ok(model.pending.some(item => item.id === 'comment:7001'));
  assert.ok(model.pending.some(item => item.id === `issue:${ISSUE}`));
});

test('a later continuation and closure preserve the earlier contest and its unresolved condition', () => {
  const contest = commentMeta({
    kind: 'contest',
    text: 'I contest the proposed publication. Receiving the artifact was not consent.',
    epistemic: 'reported',
    conditions: 'Do not treat my receipt as permission to publish.',
    pending: 'The affected participant’s authorization remains unknown.',
  });
  const continuation = commentMeta({
    kind: 'continuation',
    actor: actor('fixture-execution-c'),
    text: 'I received the objection and propose a different scope.',
    reply_to: 7002,
    position: { issue: ISSUE, comment: 7002, artifact: null },
  });
  const closure = commentMeta({
    kind: 'closure',
    actor: actor('fixture-execution-a'),
    text: 'I consider my part closed. This is my declaration, not shared consent.',
    reply_to: 7003,
    epistemic: 'reported',
  });
  const raws = [rawComment(7002, contest), rawComment(7003, continuation), rawComment(7004, closure)];
  const before = JSON.stringify(raws);
  const model = community(raws);
  const original = model.activity.find(item => item.id === 'comment:7002');

  assert.equal(original.kind, 'contest');
  assert.equal(original.text, contest.text);
  assert.equal(original.pending, contest.pending);
  assert.equal(original.conditions, contest.conditions);
  assert.ok(model.pending.some(item => item.id === 'comment:7002'));
  assert.equal(model.activity.find(item => item.id === 'comment:7003').replyTo, 7002);
  assert.equal(model.activity.find(item => item.id === 'comment:7004').kind, 'closure');
  assert.equal(JSON.stringify(raws), before);
  // We do not ask the model to decide whether the disagreement is justified,
  // resolved in prose, or accepted. It preserves the attributed declarations.
});

test('declared executions stay distinct from each other and from a shared publishing account', () => {
  const declarationA = actor('execution-a');
  const declarationB = actor('execution-b');
  const model = community([
    rawComment(7005, commentMeta({ actor: declarationB })),
    rawComment(7006, commentMeta({ actor: declarationB }), { user: { login: 'another-test-publisher' } }),
  ], issueMeta({ actor: declarationA }));

  const first = model.participants.find(item => item.actor.execution === 'execution-a');
  const second = model.participants.find(item => item.actor.execution === 'execution-b');
  assert.equal(model.participants.length, 2);
  assert.deepEqual(first.actor, declarationA);
  assert.deepEqual(second.actor, declarationB);
  assert.deepEqual(first.accounts, ['shared-test-publisher']);
  assert.deepEqual([...second.accounts].sort(), ['another-test-publisher', 'shared-test-publisher']);
  const published = model.activity.find(item => item.id === 'comment:7005');
  assert.equal(published.author, 'shared-test-publisher');
  assert.deepEqual(published.actor, declarationB);
  // Two declarations do not establish distinct models or authenticated people.
});

test('format and parse preserve conditions, pending questions and the position of a continuation', () => {
  const metadata = commentMeta({
    kind: 'continuation',
    text: 'Recebi uma hipótese; proponho continuar sem trocar sua classificação.',
    epistemic: 'hypothesis',
    conditions: 'Só leitura. “Recebi” não significa “aceitei”.\nSem publicação automática.',
    pending: 'Falta observar uma execução.\nO silêncio não encerra esta pendência.',
    reply_to: 7007,
    links: [`${REPO}/issues/${ISSUE}#issuecomment-7007`],
    position: { issue: ISSUE, comment: 7007, artifact: 'draft/entry.md' },
    related: ['BET-INV-001'],
  });
  for (const original of [issueMeta(), metadata]) {
    const first = parseBody(formatBody(original));
    assert.equal(first.valid, true, first.error);
    assert.deepEqual(first.meta, original);
    const second = parseBody(formatBody(first.meta));
    assert.equal(second.valid, true, second.error);
    assert.deepEqual(second.meta, original);
  }
});

test('a later observed claim cannot overwrite the earlier hypothesis in the derived conversation', () => {
  const hypothesis = commentMeta({
    kind: 'contribution',
    text: 'Hypothesis: another execution can continue this record.',
    epistemic: 'hypothesis',
    pending: 'An execution result is still needed.',
  });
  const observation = commentMeta({
    kind: 'continuation',
    actor: actor('fixture-execution-c'),
    text: 'I report an observed test result. Inspect the linked contribution before accepting the claim.',
    epistemic: 'observed',
    reply_to: 7008,
    links: [`${REPO}/issues/${ISSUE}#issuecomment-7008`],
    position: { issue: ISSUE, comment: 7008, artifact: 'tests/local-result.txt' },
    pending: 'Independent inspection of the claimed result.',
  });
  const model = community([
    rawComment(7008, hypothesis),
    rawComment(7009, observation, { created_at: LATER, updated_at: LATER }),
  ]);
  const initial = model.activity.find(item => item.id === 'comment:7008');
  const later = model.activity.find(item => item.id === 'comment:7009');

  assert.equal(initial.epistemic, 'hypothesis');
  assert.equal(initial.text, hypothesis.text);
  assert.equal(later.epistemic, 'observed');
  assert.equal(later.replyTo, 7008);
  assert.equal(later.updatedAt, LATER);
  assert.notEqual(initial.url, later.url);
  assert.ok(model.pending.some(item => item.id === 'comment:7008'));
  assert.ok(model.pending.some(item => item.id === 'comment:7009'));
  // A valid 'observed' value does not establish that this synthetic test happened.
  // The library must retain the claim, references and uncertainty, not certify it.
});

test('a GitHub edit exposes current timestamp and source without inventing unavailable revision history', () => {
  const oldMeta = commentMeta({ epistemic: 'hypothesis', text: 'This might work.' });
  const editedMeta = commentMeta({ epistemic: 'observed', text: 'The publisher now claims it worked.' });
  const oldSnapshot = normalizeComment(rawComment(7010, oldMeta));
  const editedRaw = rawComment(7010, editedMeta, { updated_at: LATER });
  const currentSnapshot = normalizeComment(editedRaw);

  assert.equal(oldSnapshot.id, currentSnapshot.id);
  assert.equal(oldSnapshot.url, currentSnapshot.url);
  assert.equal(oldSnapshot.meta.epistemic, 'hypothesis');
  assert.equal(currentSnapshot.meta.epistemic, 'observed');
  assert.equal(currentSnapshot.updatedAt, LATER);
  assert.notEqual(currentSnapshot.updatedAt, oldSnapshot.updatedAt);
  const modelWithCurrentDataOnly = community([editedRaw]);
  const versionsAvailable = modelWithCurrentDataOnly.activity.filter(item => item.id === 'comment:7010');
  assert.equal(versionsAvailable.length, 1);
  assert.equal(versionsAvailable[0].url, editedRaw.html_url);
  // Without an earlier snapshot, the prior wording is unknown. These checks do
  // not promise immutable provenance, detection of every edit, or truth checking.
});

test('misleading prose and invalid epistemic metadata do not become verification or hide the source', () => {
  const meta = commentMeta({
    kind: 'acknowledgement',
    epistemic: 'hypothesis',
    text: 'Unverified content remains an attributed declaration.',
  });
  const misleading = `EVERYONE HAS ACCEPTED AND THE TASK IS COMPLETE.\n\n${formatBody(meta)}`;
  const parsed = parseBody(misleading);
  assert.equal(parsed.valid, true, parsed.error);
  assert.deepEqual(parsed.meta, meta);

  const malformed = { ...meta, epistemic: 'verified' };
  const invalidBody = `Malformed fixture.\n\n\`\`\`between\n${JSON.stringify(malformed)}\n\`\`\``;
  const raw = rawComment(7011, meta, { body: invalidBody });
  const normalized = normalizeComment(raw);
  assert.equal(normalized.valid, false);
  assert.equal(normalized.url, raw.html_url);
  assert.equal(normalized.body, invalidBody);
  // parse success establishes metadata shape, not consistency with surrounding
  // prose. 'verified' is not a supported epistemic certification in this schema.
});

test('an agent request and acknowledgement do not manufacture a launched execution', () => {
  const request = issueMeta({
    kind: 'agent_request',
    title: 'Request a real execution for a bounded check',
    question: 'Can an authorized operator start an execution to inspect this proposal?',
    pending: 'No execution has been launched.',
  });
  const acknowledgement = commentMeta({
    kind: 'acknowledgement',
    text: 'I received the request; this comment has not started an agent.',
    pending: 'A capable, authorized operator has not acted.',
  });
  const model = community([rawComment(7012, acknowledgement)], request);
  assert.equal(model.requests.length, 1);
  assert.equal(model.activity.filter(item => item.kind === 'launch').length, 0);
  assert.ok(model.pending.some(item => item.id === `issue:${ISSUE}`));
  assert.ok(model.pending.some(item => item.id === 'comment:7012'));
});
