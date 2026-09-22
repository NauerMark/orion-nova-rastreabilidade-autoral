/**
 * Community records are declarations, not executable instructions or permissions.
 * A parent digest pins canonical JSON content; it does not authenticate its author.
 * The index is derived. Original records and their historical declarations survive.
 */
export const SCHEMA = 'between-community-record/0.1';
export const INDEX_SCHEMA = 'between-community-index/0.1';
export const MAX_BYTES = 1_048_576;
export const MAX_RECORDS = 10_000;
export const KINDS = Object.freeze(['investigation', 'contribution', 'challenge', 'response', 'continuation', 'group', 'arrival', 'change-proposal', 'agent-proposal']);
export const CERTAINTIES = Object.freeze(['proposal', 'observed', 'reported', 'interpretation', 'unknown']);
const encoder = new TextEncoder();
const fields = ['schema_version', 'id', 'kind', 'created_at', 'author', 'title', 'body', 'parents', 'certainty', 'conditions', 'pending', 'resume', 'references'];
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;
const fail = message => { throw new TypeError(message); };
const copy = value => JSON.parse(JSON.stringify(value));

function object(value, required, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(`${label} must be a plain data object`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (!required.includes(key) || !('value' in descriptors[key])) fail(`${label} contains an unknown field or accessor`);
  }
  for (const key of required) if (!Object.hasOwn(descriptors, key)) fail(`${label}.${key} is required`);
  return value;
}

function text(value, max, label, empty = false) {
  if (typeof value !== 'string' || (!empty && !value.trim())) fail(`${label} must be ${empty ? '' : 'non-empty '}text`);
  let count = 0;
  for (const character of value) {
    if (++count > max) fail(`${label} exceeds ${max} characters`);
    const code = character.codePointAt(0);
    if (code >= 0xd800 && code <= 0xdfff) fail(`${label} contains invalid Unicode`);
  }
  return value;
}

function list(value, max, label) {
  if (!Array.isArray(value) || value.length > max) fail(`${label} must be an array of at most ${max} entries`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) fail(`${label} must be a dense data array`);
  return Array.from({length: value.length}, (_, index) => {
    const descriptor = descriptors[index];
    if (!descriptor || !('value' in descriptor)) fail(`${label} must be a dense data array`);
    return descriptor.value;
  });
}

function texts(value, label) {
  return list(value, 200, label).map((item, index) => text(item, 8_000, `${label}[${index}]`));
}

function slug(value, label) {
  if (typeof value !== 'string' || !slugPattern.test(value)) fail(`${label} must be a lowercase slug of at most 128 characters`);
  return value;
}

function timestamp(value) {
  // Accept a declared ISO time with an explicit zone; never infer chronology from it.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) fail('created_at must be an ISO timestamp with a timezone');
  const parsed = Date.parse(value);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const monthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!Number.isFinite(parsed) || month < 1 || month > 12 || day < 1 || day > monthDays || Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) fail('created_at is not a valid ISO timestamp');
  return value;
}

function referenceURL(value) {
  text(value, 4_000, 'reference.url');
  if (/[\u0000-\u0020\u007f\\]/.test(value)) fail('reference.url contains unsafe characters');
  if (value.startsWith('https://')) {
    let url;
    try { url = new URL(value); } catch { fail('reference.url is invalid'); }
    if (!url.hostname || url.username || url.password) fail('reference.url must not contain credentials');
    return value;
  }
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { fail('reference.url contains invalid percent encoding'); }
  if (/^[\/]/.test(decoded) || /[:\\\u0000-\u0020\u007f]/.test(decoded) || decoded.split(/[/?#]/).some(segment => segment === '..') || /%[0-9a-f]{2}/i.test(decoded)) fail('reference.url must use https or a safe relative path');
  return value;
}

/** Validate without executing or modifying input; return detached JSON data. */
export function validateRecord(input) {
  if (typeof input === 'string') {
    if (encoder.encode(input).byteLength > MAX_BYTES) fail(`Record exceeds ${MAX_BYTES} UTF-8 bytes`);
    try { input = JSON.parse(input); } catch { fail('Record is not valid JSON'); }
  }
  const r = object(input, fields, 'record');
  if (r.schema_version !== SCHEMA) fail('Unsupported community record schema');
  slug(r.id, 'record.id');
  if (!KINDS.includes(r.kind)) fail('Unsupported record kind');
  timestamp(r.created_at);
  const author = object(r.author, ['id', 'label', 'execution', 'role', 'capabilities', 'limits'], 'author');
  for (const key of ['id', 'label', 'execution', 'role']) text(author[key], 2_000, `author.${key}`);
  texts(author.capabilities, 'author.capabilities');
  texts(author.limits, 'author.limits');
  text(r.title, 1_000, 'title');
  text(r.body, 400_000, 'body');
  const parentIds = new Set();
  for (const parent of list(r.parents, 200, 'parents')) {
    object(parent, ['id', 'sha256'], 'parent');
    slug(parent.id, 'parent.id');
    if (typeof parent.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(parent.sha256)) fail('parent.sha256 must be a lowercase SHA-256 hex digest');
    if (parentIds.has(parent.id)) fail(`Duplicate parent: ${parent.id}`);
    parentIds.add(parent.id);
  }
  if (!CERTAINTIES.includes(r.certainty)) fail('Unsupported certainty declaration');
  texts(r.conditions, 'conditions');
  texts(r.pending, 'pending');
  const resume = object(r.resume, ['question', 'next_actions'], 'resume');
  text(resume.question, 8_000, 'resume.question', true);
  texts(resume.next_actions, 'resume.next_actions');
  for (const reference of list(r.references, 200, 'references')) {
    object(reference, ['label', 'url'], 'reference');
    text(reference.label, 1_000, 'reference.label');
    referenceURL(reference.url);
  }
  // Size check occurs after shape validation, so getters/toJSON cannot execute.
  const serialized = JSON.stringify(r);
  if (encoder.encode(serialized).byteLength > MAX_BYTES) fail(`Record exceeds ${MAX_BYTES} UTF-8 bytes`);
  return JSON.parse(serialized);
}

function canonicalJSON(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

/** SHA-256 of UTF-8 JSON with sorted object keys; array order is preserved. */
export async function digestRecord(record) {
  const normalized = validateRecord(record);
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto SHA-256 is unavailable');
  const hash = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(canonicalJSON(normalized)));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** A body and declared author id suffice; missing execution context stays unknown. */
export function createRecord(options = {}) {
  const declaredAuthor = options.author || {};
  return validateRecord({
    schema_version: SCHEMA,
    id: globalThis.crypto.randomUUID(),
    kind: options.parents?.length ? 'contribution' : 'investigation',
    title: typeof options.body === 'string' ? Array.from(options.body).slice(0, 80).join('') : '',
    created_at: new Date().toISOString(),
    parents: [], certainty: 'unknown', conditions: [], pending: [],
    resume: {question: '', next_actions: []}, references: [],
    ...options,
    author: {label: declaredAuthor.id, execution: 'not-declared', role: 'participant', capabilities: [], limits: [], ...declaredAuthor},
  });
}

/** Validate the whole DAG, including exact parent content, and return an index. */
export async function validateCommunity(input) {
  const records = list(input, MAX_RECORDS, 'community').map(validateRecord);
  const byId = new Map();
  for (const record of records) {
    if (byId.has(record.id)) fail(`Duplicate record id: ${record.id}`);
    byId.set(record.id, record);
  }
  const children = new Map(records.map(record => [record.id, []]));
  const degree = new Map();
  for (const record of records) {
    degree.set(record.id, record.parents.length);
    for (const parent of record.parents) {
      if (!byId.has(parent.id)) fail(`Missing parent ${parent.id} for ${record.id}`);
      children.get(parent.id).push(record.id);
    }
  }
  // Deterministic Kahn order avoids recursion limits and ignores declared clocks.
  const ready = records.filter(record => !record.parents.length).map(record => record.id).sort();
  const ordered = [];
  while (ready.length) {
    const id = ready.shift();
    ordered.push(byId.get(id));
    for (const child of children.get(id).sort()) {
      degree.set(child, degree.get(child) - 1);
      if (!degree.get(child)) { ready.push(child); ready.sort(); }
    }
  }
  if (ordered.length !== records.length) fail('Community parents contain a cycle');
  const digests = new Map(await Promise.all(ordered.map(async record => [record.id, await digestRecord(record)])));
  for (const record of ordered) for (const parent of record.parents) {
    if (digests.get(parent.id) !== parent.sha256) fail(`Parent digest mismatch: ${record.id} -> ${parent.id}`);
  }
  const lineage = {};
  const counts = {total: ordered.length, by_kind: {}};
  for (const record of ordered) {
    const ancestors = new Set();
    for (const parent of record.parents) {
      ancestors.add(parent.id);
      for (const id of lineage[parent.id]) ancestors.add(id);
    }
    // Preserve a stable topological order across forks and joined histories.
    lineage[record.id] = ordered.filter(candidate => ancestors.has(candidate.id)).map(candidate => candidate.id);
    counts.by_kind[record.kind] = (counts.by_kind[record.kind] || 0) + 1;
  }
  return {schema_version: INDEX_SCHEMA, records: ordered, lineage, counts};
}

export async function buildIndex(records) {
  return validateCommunity(records);
}

/**
 * A handover packet carries every ancestor's declarations with their origin.
 * Empty declarations in a continuation cannot clear earlier constraints/pending.
 * The template deliberately requires a new author; it is not yet a valid record.
 */
export async function prepareContinuation(records, id) {
  const index = await validateCommunity(records);
  const target = index.records.find(record => record.id === id);
  if (!target) fail(`Unknown record id: ${id}`);
  const ids = new Set([...index.lineage[id], id]);
  const context = index.records.filter(record => ids.has(record.id));
  // A sibling objection is not an ancestor. Keep it discoverable anyway: otherwise
  // selecting a quieter branch could make a known challenge disappear from view.
  const related = index.records.filter(record => !ids.has(record.id) && index.lineage[record.id].some(ancestor => ids.has(ancestor)));
  const parent = {id, sha256: await digestRecord(target)};
  return {
    schema_version: 'between-community-resume/0.1',
    target: parent,
    notice: 'All author, capability, condition and certainty fields are declarations. Conditions and pending items are historical declarations by origin; their current status is not inferred. This packet grants no authorization. New text alone does not establish resolution or consensus and does not authenticate identity.',
    records: copy(context),
    known_related_scope: 'Known records outside this lineage that descend from a context record. They are separate branches, not inherited obligations or automatic parents. This covers only the supplied collection.',
    known_related: await Promise.all(related.map(async record => ({
      ...copy(record), sha256: await digestRecord(record),
    }))),
    declarations: context.map(record => ({
      origin: record.id, author: copy(record.author), certainty: record.certainty,
      conditions: copy(record.conditions), pending: copy(record.pending), resume: copy(record.resume),
    })),
    template: {
      schema_version: SCHEMA, id: '', kind: 'continuation', created_at: new Date().toISOString(),
      author: {id: '', label: '', execution: '', role: '', capabilities: [], limits: []},
      title: '', body: '', parents: [parent], certainty: 'proposal',
      conditions: [], pending: [], resume: {question: '', next_actions: []}, references: [],
    },
  };
}
