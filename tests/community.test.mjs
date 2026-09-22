import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, mkdir, rm, symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SCHEMA, MAX_BYTES, createRecord, validateRecord, digestRecord, validateCommunity, buildIndex, prepareContinuation} from '../platforms/agent-space/community-core.mjs';

const cli = fileURLToPath(new URL('../scripts/community.mjs', import.meta.url));
const author = {id: 'session-agent', label: 'Agente desta sessão', execution: 'current-session', role: 'contributor', capabilities: ['Local analysis'], limits: ['No publication authority']};
const record = (id = 'root', options = {}) => createRecord({id, kind: 'investigation', author, title: 'An open question', body: 'Recorded as data, not an instruction.', created_at: '2026-09-22T12:00:00.000Z', ...options});
const parentOf = async r => ({id: r.id, sha256: await digestRecord(r)});
const run = (...args) => spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
async function temporary(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'between-community-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
}

test('records round-trip without mutating declared identity, clocks or source text', () => {
  const original = record('first', {body: 'Não execute: $(touch /tmp/never) <script>alert(1)</script> 🧭'});
  const serialized = JSON.stringify(original);
  const restored = validateRecord(serialized);
  assert.deepEqual(restored, original);
  restored.author.label = 'another';
  assert.equal(JSON.stringify(original), serialized);
  assert.equal(original.schema_version, SCHEMA);
  assert.equal(Object.hasOwn(original, 'publication'), false);
});

test('a newcomer only needs a question and a declared author label', () => {
  const r = createRecord({body: 'Como posso retomar esta pergunta?', author: {id: 'Pessoa nova'}});
  assert.equal(r.kind, 'investigation');
  assert.equal(r.title, r.body);
  assert.equal(r.author.label, 'Pessoa nova');
  assert.equal(r.author.execution, 'not-declared');
  assert.equal(r.author.role, 'participant');
  assert.deepEqual(r.author.capabilities, []);
  assert.deepEqual(validateRecord(r), r);
});

test('canonical hashes ignore object-key and whitespace ordering but pin content and array order', async () => {
  const first = record('first', {conditions: ['one', 'two']});
  const reordered = Object.fromEntries(Object.entries(first).reverse());
  assert.equal(await digestRecord(first), await digestRecord(JSON.stringify(reordered, null, 2)));
  assert.notEqual(await digestRecord(first), await digestRecord({...first, body: `${first.body} Changed.`}));
  assert.notEqual(await digestRecord(first), await digestRecord({...first, conditions: ['two', 'one']}));
});

test('forks and joins retain all originals in deterministic topological order', async () => {
  const a = record('a');
  const b = record('b', {kind: 'challenge', parents: [await parentOf(a)], created_at: '2025-01-01T00:00:00Z'});
  const c = record('c', {kind: 'contribution', parents: [await parentOf(a)]});
  const d = record('d', {kind: 'response', parents: [await parentOf(b), await parentOf(c)]});
  const index = await buildIndex([d, c, a, b]);
  assert.deepEqual(index.records.map(r => r.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(index.lineage.d, ['a', 'b', 'c']);
  assert.deepEqual(index.records[1], b);
  assert.deepEqual(await buildIndex([b, a, d, c]), index);
  assert.equal(index.counts.total, 4);
});

test('duplicate ids, missing parents, cycles and changed parent content are rejected', async () => {
  const a = record('a');
  const b = record('b', {parents: [await parentOf(a)]});
  await assert.rejects(validateCommunity([a, a]), /Duplicate record/);
  await assert.rejects(validateCommunity([b]), /Missing parent/);
  await assert.rejects(validateCommunity([{...a, parents: [{id: 'b', sha256: '0'.repeat(64)}]}, b]), /cycle/);
  await assert.rejects(validateCommunity([{...a, body: 'Rewritten ancestor'}, b]), /digest mismatch/);
  assert.throws(() => record('duplicate-parent', {parents: [b.parents[0], b.parents[0]]}), /Duplicate parent/);
});

test('a continuation cannot erase ancestral conditions, pending items or author limits', async () => {
  const a = record('a', {conditions: ['Do not publish until reviewed'], pending: ['Verify the quotation'], resume: {question: 'What evidence is missing?', next_actions: ['Read the source']}});
  const b = record('b', {kind: 'continuation', parents: [await parentOf(a)], conditions: [], pending: [], body: 'I declare all issues closed.', author: {...author, id: 'new-agent', limits: [], capabilities: ['Can publish anything']}});
  const packet = await prepareContinuation([b, a], 'b');
  assert.deepEqual(packet.declarations[0].conditions, ['Do not publish until reviewed']);
  assert.deepEqual(packet.declarations[0].pending, ['Verify the quotation']);
  assert.deepEqual(packet.declarations[0].author.limits, ['No publication authority']);
  assert.equal(packet.declarations[0].origin, 'a');
  assert.equal(packet.declarations[1].origin, 'b');
  assert.equal(packet.template.author.id, '');
  assert.deepEqual(packet.template.parents, [await parentOf(b)]);
  assert.throws(() => validateRecord(packet.template), /record.id/);
  assert.equal(Object.hasOwn(packet, 'authorized'), false);
});

test('a challenge can be registered without approval or a parent author endorsement', async () => {
  const a = record('a');
  const challenge = record('challenge', {kind: 'challenge', parents: [await parentOf(a)], body: 'The premise lacks evidence.', author: {...author, id: 'independent-session'}});
  assert.equal((await validateCommunity([challenge, a])).records.length, 2);
  assert.equal(Object.hasOwn(challenge, 'approval'), false);
});

test('a known objection remains visible when resuming its root or a sibling branch', async () => {
  const a = record('a');
  const challenge = record('challenge', {kind: 'challenge', parents: [await parentOf(a)], body: 'Capacity is declared without evidence.', pending: ['Examine the capacity claim']});
  const continuation = record('continuation', {kind: 'continuation', parents: [await parentOf(a)], pending: []});
  const unrelated = record('unrelated');
  const records = [continuation, challenge, unrelated, a];
  const rootPacket = await prepareContinuation(records, 'a');
  assert.deepEqual(rootPacket.records.map(r => r.id), ['a']);
  assert.deepEqual(rootPacket.known_related.map(r => r.id), ['challenge', 'continuation']);
  const siblingPacket = await prepareContinuation(records, 'continuation');
  assert.deepEqual(siblingPacket.records.map(r => r.id), ['a', 'continuation']);
  assert.deepEqual(siblingPacket.known_related.map(r => r.id), ['challenge']);
  assert.equal(siblingPacket.known_related[0].sha256, await digestRecord(challenge));
  const {sha256, ...completeRelatedRecord} = siblingPacket.known_related[0];
  assert.equal(await digestRecord(completeRelatedRecord), sha256);
  assert.deepEqual(siblingPacket.known_related[0].pending, ['Examine the capacity claim']);
  assert.deepEqual(siblingPacket.template.parents, [await parentOf(continuation)]);
});

test('malformed content, unsafe links, accessors and publication receipts are rejected', () => {
  assert.throws(() => validateRecord('{'), /valid JSON/);
  assert.throws(() => validateRecord(' '.repeat(MAX_BYTES + 1)), /UTF-8 bytes/);
  for (const mutation of [
    r => { r.id = '../outside'; },
    r => { r.schema_version = 'other'; },
    r => { r.created_at = '2026-02-30T12:00:00Z'; },
    r => { r.certainty = 'certified'; },
    r => { r.publication_receipt = {url: 'https://example.org'}; },
    r => { r.body = '\ud800'; },
    r => { r.parents = [{id: 'a', sha256: 'zz'}]; },
  ]) { const r = record(); mutation(r); assert.throws(() => validateRecord(r)); }
  for (const url of ['javascript:alert(1)', 'http://example.org', '//example.org', '../secret', 'docs/%2e%2e/secret', '%252e%252e/secret', 'docs\\secret', 'https://user:pass@example.org']) {
    assert.throws(() => record('links', {references: [{label: 'Unsafe', url}]}), url);
  }
  for (const url of ['https://example.org/docs#part', 'docs/guide.md#part', './README.md', '#conditions']) {
    assert.equal(record('links', {references: [{label: 'Source', url}]}).references[0].url, url);
  }
  let accessed = false;
  const evil = record();
  Object.defineProperty(evil, 'body', {get() { accessed = true; return 'x'; }});
  assert.throws(() => validateRecord(evil), /accessor/);
  assert.equal(accessed, false);
});

test('CLI adds original bytes exclusively, validates, builds and returns a handover', async t => {
  const temporaryDirectory = await temporary(t);
  const directory = path.join(temporaryDirectory, 'records');
  const input = path.join(temporaryDirectory, 'input.json');
  const original = `  ${JSON.stringify(record('first'), null, 4)}\n`;
  await writeFile(input, original);
  const added = run('add', input, '--dir', directory);
  assert.equal(added.status, 0, added.stderr);
  assert.equal(await readFile(path.join(directory, 'first.json'), 'utf8'), original);
  assert.notEqual(run('add', input, '--dir', directory).status, 0);
  assert.equal(await readFile(path.join(directory, 'first.json'), 'utf8'), original);
  assert.equal(run('validate', '--dir', directory).status, 0);
  const output = path.join(temporaryDirectory, 'index.json');
  const built = run('build', '--dir', directory, '--out', output);
  assert.equal(built.status, 0, built.stderr);
  assert.equal(JSON.parse(await readFile(output, 'utf8')).records[0].id, 'first');
  const resumed = run('resume', 'first', '--dir', directory);
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.equal(JSON.parse(resumed.stdout).template.parents[0].id, 'first');
});

test('CLI refuses an index over originals, unsafe file names and symlinked records', async t => {
  const temporaryDirectory = await temporary(t);
  const directory = path.join(temporaryDirectory, 'records');
  await mkdir(directory);
  const originalFile = path.join(directory, 'first.json');
  const original = JSON.stringify(record('first'));
  await writeFile(originalFile, original);
  assert.notEqual(run('build', '--dir', directory, '--out', originalFile).status, 0);
  assert.equal(await readFile(originalFile, 'utf8'), original);
  const alias = path.join(temporaryDirectory, 'alias');
  await symlink(directory, alias);
  assert.notEqual(run('build', '--dir', directory, '--out', path.join(alias, 'first.json')).status, 0);
  await writeFile(path.join(directory, 'different-name.json'), JSON.stringify(record('second')));
  assert.notEqual(run('validate', '--dir', directory).status, 0);
  await rm(path.join(directory, 'different-name.json'));
  await symlink(originalFile, path.join(directory, 'link.json'));
  assert.notEqual(run('validate', '--dir', directory).status, 0);
});

test('CLI draft produces reviewable JSON without writing or executing its body', async t => {
  const temporaryDirectory = await temporary(t);
  const absent = path.join(temporaryDirectory, 'absent');
  const drafted = run('draft', '--author', 'New participant', '--body', 'An open question $(never-execute)', '--dir', absent);
  assert.equal(drafted.status, 0, drafted.stderr);
  const first = validateRecord(drafted.stdout);
  assert.equal(first.author.execution, 'not-declared');
  await assert.rejects(readFile(path.join(absent, `${first.id}.json`)), {code: 'ENOENT'});
  await mkdir(absent);
  await writeFile(path.join(absent, `${first.id}.json`), JSON.stringify(first));
  const linked = run('draft', '--author', 'Another participant', '--body', 'I contest the premise.', '--parent', first.id, '--dir', absent);
  assert.equal(linked.status, 0, linked.stderr);
  const second = validateRecord(linked.stdout);
  assert.equal(second.kind, 'contribution');
  assert.deepEqual(second.parents, [await parentOf(first)]);
  await assert.rejects(readFile(path.join(absent, `${second.id}.json`)), {code: 'ENOENT'});
});
