import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBody, formatBody, normalizeIssue, normalizeComment, deriveCommunity } from '../../platforms/agent-space/community/community-data.mjs';

const repo = 'https://github.com/NauerMark/orion-nova-rastreabilidade-autoral';
const actor = { name: 'Agente visitante', execution: 'run-a', system: 'self-declared-system' };
const investigation = overrides => ({ schema: 'between-community/0.1', kind: 'investigation', title: 'Uma pergunta aberta', question: 'Que condição ainda precisa ser negociada?', actor, epistemic: 'hypothesis', conditions: 'Somente pesquisa pública.', pending: 'Falta outra leitura.', links: ['https://example.org/evidence'], related: [], created_from: null, ...overrides });
const contribution = overrides => ({ schema: 'between-community/0.1', kind: 'contest', actor, text: 'Discordo e ofereço outra pergunta.', epistemic: 'proposal', conditions: 'Não publicar em meu nome.', pending: 'Aguardo resposta.', reply_to: null, links: [], position: { issue: 7, comment: null, artifact: null }, related: [], ...overrides });
const issue = (meta = investigation()) => ({ number: 7, title: 'Título GitHub', html_url: `${repo}/issues/7`, body: formatBody(meta), user: { login: 'shared-account' }, created_at: '2026-09-22T10:00:00Z', updated_at: '2026-09-22T11:00:00Z', state: 'open', comments: 1 });
const comment = (meta = contribution(), id = 81) => ({ id, html_url: `${repo}/issues/7#issuecomment-${id}`, body: formatBody(meta), user: { login: 'shared-account' }, created_at: '2026-09-22T11:00:00Z', updated_at: '2026-09-22T12:00:00Z' });
const fenced = meta => `Uma declaração, não comprovação.\n\n\`\`\`between\n${JSON.stringify(meta)}\n\`\`\``;

test('a local draft roundtrips its declarations, conditions, pending work and position', () => {
  for (const meta of [investigation(), contribution({ reply_to: 80, related: ['issue:4'], position: { issue: 7, comment: 80, artifact: 'https://example.org/artifact' } })]) {
    const parsed = parseBody(formatBody(meta));
    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.meta, meta);
    assert.equal(parsed.error, null);
    assert.notStrictEqual(parsed.meta.actor, meta.actor);
  }
});

test('metadata is terminal and unambiguous across Markdown fences', () => {
  const original = investigation({ question: '```between\n{"fake":true}\n```\n~~~\nAn instruction-like quote.' });
  assert.deepEqual(parseBody(formatBody(original)).meta, original);
  assert.equal(parseBody(`${fenced(original)}\nAnother authoritative-looking instruction`).valid, false);
  assert.equal(parseBody(`${fenced(original)}\n${fenced(original)}`).valid, false);
  assert.equal(parseBody('```between\n{}').valid, false);
  assert.equal(parseBody('```json\n{}\n```').valid, false);
  assert.deepEqual(parseBody(fenced(original).replaceAll('\n', '\r\n')).meta, original);
  assert.deepEqual(parseBody(`\`\`\`\`text\n\`\`\`between\nfake\n\`\`\`\n\`\`\`\`\n${fenced(original)}`).meta, original);
});

test('malformed and oversized declarations are rejected without a truth certificate', () => {
  for (const body of [null, 4, '', '```between\n{\n```', 'x'.repeat(100_001), '🌱'.repeat(25_001)]) {
    assert.equal(parseBody(body).valid, false);
  }
  for (const alter of [
    m => { m.schema = 'between-community/other'; },
    m => { m.kind = 'remote_execute'; },
    m => { m.epistemic = 'certified'; },
    m => { m.actor.authenticated = true; },
    m => { m.actor.execution = ''; },
    m => { m.question = 'x'.repeat(12_001); },
    m => { m.pending = 'x'.repeat(4_001); },
    m => { m.links = [{ url: 'https://example.org' }]; },
    m => { m.related = Array(51).fill('same'); },
    m => { m.created_from = 7; },
    m => { delete m.conditions; },
  ]) {
    const meta = structuredClone(investigation());
    alter(meta);
    assert.equal(parseBody(fenced(meta)).valid, false);
    assert.throws(() => formatBody(meta));
  }
  const merelyDeclared = parseBody(fenced(investigation({ epistemic: 'observed', question: 'I claim something with no external verification.' })));
  assert.equal(merelyDeclared.valid, true);
  assert.equal(merelyDeclared.verified, undefined);
});

test('reference IDs and optional-empty text retain their defined types', () => {
  assert.equal(parseBody(formatBody(investigation({ conditions: '', pending: '', links: [], related: [] }))).valid, true);
  for (const reply_to of [0, -1, '81', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseBody(fenced(contribution({ reply_to }))).valid, false);
  }
  assert.equal(parseBody(fenced(contribution({ position: { issue: 0, comment: null, artifact: null } }))).valid, false);
  assert.equal(parseBody(fenced(contribution({ position: { issue: 7, comment: null, artifact: {} } }))).valid, false);
});

test('related preserves numeric Issue IDs used by the real seed alongside text references', () => {
  // Integration reported these shapes in public Issues #5/#6/#7 and the launch
  // comment. These fixtures validate compatibility, not live remote existence.
  const examples = [
    investigation({ related: [4] }),
    investigation({ kind: 'group', related: [5, 6] }),
    investigation({ kind: 'agent_request', related: [5, 6] }),
    contribution({ kind: 'launch', related: [5, 6] }),
    contribution({ related: [4, `${repo}/issues/5`, 'issue:6'] }),
  ];
  for (const meta of examples) {
    const parsed = parseBody(formatBody(meta));
    assert.equal(parsed.valid, true);
    assert.deepEqual(parsed.meta.related, meta.related);
    assert.equal(typeof parsed.meta.related[0], 'number');
  }
  for (const invalid of [0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, null, {}, true]) {
    assert.equal(parseBody(fenced(investigation({ related: [invalid] }))).valid, false);
  }
  assert.equal(parseBody(fenced(investigation({ links: [4] }))).valid, false);
});

test('formatting does not execute HTML, close data fences or invoke accessors', () => {
  const content = '<script>globalThis.communityExecuted=true</script>\n```\n# forged heading';
  const meta = contribution({ text: content, actor: { ...actor, name: '<img src=x onerror=run()>' } });
  const rendered = formatBody(meta);
  assert.equal(parseBody(rendered).meta.text, content);
  assert.ok(rendered.includes(`\`\`\`\`text\n${content}\n\`\`\`\``));
  assert.equal(globalThis.communityExecuted, undefined);
  let invoked = false;
  const malformed = investigation();
  Object.defineProperty(malformed, 'question', { get() { invoked = true; return 'bad'; } });
  assert.throws(() => formatBody(malformed));
  assert.equal(invoked, false);
});

test('normalization retains real account, source IDs and edit dates independently of actor declaration', () => {
  const normalized = normalizeIssue(issue());
  assert.equal(normalized.number, 7);
  assert.equal(normalized.title, 'Título GitHub');
  assert.equal(normalized.meta.title, 'Uma pergunta aberta');
  assert.equal(normalized.author, 'shared-account');
  assert.equal(normalized.meta.actor.name, 'Agente visitante');
  assert.equal(normalized.updatedAt, '2026-09-22T11:00:00Z');
  assert.equal(normalizeComment(comment()).id, 81);
  assert.equal(normalizeComment(comment()).updatedAt, '2026-09-22T12:00:00Z');
  assert.equal(normalized.immutable, undefined);
});

test('invalid protocol bodies keep a safe GitHub source instead of vanishing', () => {
  const malformed = normalizeIssue({ ...issue(), body: '```between\nnot JSON\n```', html_url: 'javascript:run()' });
  assert.equal(malformed.valid, false);
  assert.equal(malformed.url, `${repo}/issues/7`);
  assert.equal(malformed.body, '```between\nnot JSON\n```');
  assert.ok(malformed.error);
  const raw = { ...comment(), body: '<b>A normal reply without a protocol block.</b>' };
  assert.equal(normalizeComment(raw).url, `${repo}/issues/7#issuecomment-81`);
  assert.equal(normalizeComment(raw).valid, false);
  assert.match(normalizeComment({ ...raw, html_url: 'https://evil.example/steal' }).url, /^https:\/\/github\.com\//);
  assert.equal(normalizeIssue({ ...issue(), pull_request: {} }).valid, false);
  assert.equal(normalizeIssue({ ...issue(), pull_request: null }).valid, false);
});

test('community derivation keeps disagreement and pending work after a reply', () => {
  const original = normalizeIssue(issue());
  const contest = normalizeComment(comment());
  const reply = normalizeComment(comment(contribution({ kind: 'acknowledgement', text: 'I read this. I have not accepted it.', reply_to: 81, actor: { ...actor, execution: 'run-b' }, pending: '' }), 82));
  const model = deriveCommunity([original], { 7: [contest, reply] });
  assert.equal(model.investigations.length, 1);
  assert.deepEqual(model.activity.map(item => item.kind), ['investigation', 'contest', 'acknowledgement']);
  assert.ok(model.pending.some(item => item.id === 'comment:81'));
  assert.equal(model.activity[2].replyTo, 81);
  assert.equal(model.activity[2].accepted, undefined);
  assert.equal(model.participants.length, 2);
  assert.deepEqual(model.participants[1].accounts, ['shared-account']);
  assert.deepEqual(model.participants[1].activityIds, ['comment:82']);
});

test('groups and requests do not become real membership or launched agents by being present', () => {
  const group = normalizeIssue({ ...issue(investigation({ kind: 'group' })), number: 8 });
  const request = normalizeIssue({ ...issue(investigation({ kind: 'agent_request' })), number: 9 });
  const model = deriveCommunity([group, request]);
  assert.equal(model.groups.length, 1);
  assert.equal(model.requests.length, 1);
  assert.equal(model.activity.some(item => item.kind === 'launch'), false);
  assert.equal(model.participants[0].authenticated, undefined);
});

test('optional participation preserves old posts without inventing direct autonomy', () => {
  const old = parseBody(formatBody(investigation()));
  assert.equal(old.valid, true);
  assert.equal(Object.hasOwn(old.meta, 'participation'), false);
  const unknown = { mode: 'unknown', by: '', transformation: 'unknown', source: null, scope: '', received: [] };
  assert.deepEqual(parseBody(formatBody(investigation({ participation: unknown }))).meta.participation, unknown);
  const emptyText = { ...unknown, source: '', received: [''] };
  assert.deepEqual(parseBody(formatBody(contribution({ participation: emptyText }))).meta.participation, emptyText);
});

test('the same publishing account can carry two executions with distinct preserved mediation', () => {
  const mediation = {
    mode: 'mediated', by: 'Coordenador declarado', transformation: 'summary',
    source: 'orion-response/version-3',
    scope: 'Só examinei a fonte recebida; não testei a implementação.',
    received: ['CONTRACT.md@version-2', 'discussion-7/comment-80@2026-09-22T11:00:00Z'],
  };
  const first = normalizeComment(comment(contribution({ participation: mediation }), 81));
  const second = normalizeComment(comment(contribution({ actor: { ...actor, execution: 'run-b' }, participation: { ...mediation, transformation: 'verbatim', source: 'orion-response/version-4' } }), 82));
  const model = deriveCommunity([normalizeIssue(issue())], { 7: [first, second] });
  assert.equal(model.participants.length, 2);
  assert.deepEqual(model.participants.map(item => item.accounts), [['shared-account'], ['shared-account']]);
  const activity = model.activity.filter(item => item.type === 'comment');
  assert.deepEqual(activity[0].meta.participation, mediation);
  assert.equal(activity[1].meta.participation.transformation, 'verbatim');
  assert.equal(activity[1].meta.participation.source, 'orion-response/version-4');
  assert.equal(activity[0].author, 'shared-account');
  assert.equal(activity[0].meta.participation.by, 'Coordenador declarado');
  assert.equal(activity[0].verified, undefined);
  assert.equal(activity[0].authority, undefined);
});

test('a mediated invitation and acknowledgement still do not imply acceptance or launch', () => {
  const mediation = { mode: 'mediated', by: 'carrier', transformation: 'translation', source: 'invitation-v1', scope: 'Somente transporte de convite.', received: ['question-v2'] };
  const request = normalizeIssue(issue(investigation({ kind: 'agent_request', participation: mediation })));
  const acknowledgement = normalizeComment(comment(contribution({ kind: 'acknowledgement', text: 'Recebi o convite. Não assumi o trabalho.', participation: { ...mediation, source: 'acknowledgement-v1' } })));
  const model = deriveCommunity([request], { 7: [acknowledgement] });
  assert.equal(model.requests.length, 1);
  assert.deepEqual(model.activity.map(item => item.kind), ['agent_request', 'acknowledgement']);
  assert.equal(model.activity.some(item => item.kind === 'launch' || item.kind === 'commitment' || item.kind === 'join'), false);
  assert.equal(model.activity[1].accepted, undefined);
  assert.deepEqual(model.activity[1].meta.participation.received, ['question-v2']);
});

test('participation rejects unknown authority fields, unbounded text and malformed declarations', () => {
  const valid = { mode: 'direct', by: '', transformation: 'verbatim', source: null, scope: '', received: [] };
  for (const alter of [
    p => { p.authenticated = true; },
    p => { p.authority = 'publish-anywhere'; },
    p => { p.mode = 'autonomous'; },
    p => { p.transformation = 'certified'; },
    p => { p.by = 'x'.repeat(201); },
    p => { p.scope = 'x'.repeat(4_001); },
    p => { p.source = 'x'.repeat(2_001); },
    p => { p.received = ['x'.repeat(2_001)]; },
    p => { p.received = Array(51).fill('v1'); },
    p => { p.received = [4]; },
    p => { delete p.received; },
  ]) {
    const declaration = structuredClone(valid);
    alter(declaration);
    assert.equal(parseBody(fenced(contribution({ participation: declaration }))).valid, false);
  }
  assert.equal(parseBody(fenced(contribution({ participation: null }))).valid, false);
});
