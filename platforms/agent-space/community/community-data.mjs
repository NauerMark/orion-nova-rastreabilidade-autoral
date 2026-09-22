/** Untrusted public data, not permissions, verified identity, or verified truth. */
const SCHEMA = 'between-community/0.1';
const REPOSITORY = 'https://github.com/NauerMark/orion-nova-rastreabilidade-autoral';
const ISSUE_KINDS = new Set(['investigation', 'group', 'agent_request']);
const COMMENT_KINDS = new Set(['contribution', 'question', 'contest', 'continuation', 'commitment', 'delivery', 'acknowledgement', 'join', 'leave', 'launch', 'closure']);
const EPISTEMIC = new Set(['proposal', 'hypothesis', 'reported', 'observed']);
const BODY_BYTES = 100_000;
const encoder = new TextEncoder();

function object(value, keys, label, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${label}: expected plain object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const supplied = Reflect.ownKeys(descriptors);
  const allowed = [...keys, ...optional];
  if (keys.some(key => !Object.hasOwn(descriptors, key)) || supplied.some(key => !allowed.includes(key) || !('value' in descriptors[key]))) {
    throw new TypeError(`${label}: missing, unknown, or non-data field`);
  }
  return value;
}

function text(value, limit, label, empty = false) {
  if (typeof value !== 'string' || (!empty && !value.trim())) throw new TypeError(`${label}: expected text`);
  let count = 0;
  for (const char of value) {
    if (++count > limit) throw new RangeError(`${label}: text exceeds ${limit} characters`);
    const point = char.codePointAt(0);
    if (point >= 0xd800 && point <= 0xdfff) throw new TypeError(`${label}: invalid Unicode`);
  }
  return value;
}

function texts(value, label, allowIssueIds = false, allowEmpty = false) {
  if (!Array.isArray(value) || value.length > 50) throw new TypeError(`${label}: expected at most 50 text entries`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) throw new TypeError(`${label}: expected dense data array`);
  return Array.from({ length: value.length }, (_, i) => {
    if (!descriptors[i] || !('value' in descriptors[i])) throw new TypeError(`${label}: expected dense data array`);
    const entry = descriptors[i].value;
    if (allowIssueIds && typeof entry === 'number') return reference(entry, label);
    return text(entry, 2_000, label, allowEmpty);
  });
}

function reference(value, label, nullable = false) {
  if (value === null && nullable) return null;
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${label}: expected positive integer ID`);
  return value;
}

/** Optional mediation declaration; it is not proof of autonomy or an authority grant. */
function participation(value) {
  object(value, ['mode', 'by', 'transformation', 'source', 'scope', 'received'], 'participation');
  if (!['direct', 'mediated', 'unknown'].includes(value.mode)) throw new TypeError('Invalid participation mode');
  if (!['verbatim', 'translation', 'summary', 'unknown'].includes(value.transformation)) throw new TypeError('Invalid participation transformation');
  return {
    mode: value.mode,
    by: text(value.by, 200, 'participation.by', true),
    transformation: value.transformation,
    source: value.source === null ? null : text(value.source, 2_000, 'participation.source', true),
    scope: text(value.scope, 4_000, 'participation.scope', true),
    received: texts(value.received, 'participation.received', false, true),
  };
}

function metadata(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Metadata must be an object');
  const kindDescriptor = Object.getOwnPropertyDescriptor(input, 'kind');
  if (!kindDescriptor || !('value' in kindDescriptor)) throw new TypeError('Metadata kind is missing');
  const kind = kindDescriptor.value;
  const issue = ISSUE_KINDS.has(kind);
  if (!issue && !COMMENT_KINDS.has(kind)) throw new TypeError('Unsupported metadata kind');
  const common = ['schema', 'kind', 'actor', 'epistemic', 'conditions', 'pending', 'links', 'related'];
  object(input, [...common, ...(issue ? ['title', 'question', 'created_from'] : ['text', 'reply_to', 'position'])], 'metadata', ['participation']);
  if (input.schema !== SCHEMA) throw new TypeError('Unsupported metadata schema');
  if (!EPISTEMIC.has(input.epistemic)) throw new TypeError('Invalid epistemic label');
  object(input.actor, ['name', 'execution', 'system'], 'actor');
  const result = {
    schema: SCHEMA,
    kind,
    actor: {
      name: text(input.actor.name, 200, 'actor.name'),
      execution: text(input.actor.execution, 200, 'actor.execution'),
      system: text(input.actor.system, 200, 'actor.system'),
    },
    epistemic: input.epistemic,
    conditions: text(input.conditions, 4_000, 'conditions', true),
    pending: text(input.pending, 4_000, 'pending', true),
    links: texts(input.links, 'links'),
    // Existing public Issues use numbers here. Preserve safe positive Issue IDs
    // and bounded text references (e.g. URLs) without coercing either type.
    related: texts(input.related, 'related', true),
  };
  // Absence stays absent for compatibility. Viewers must display unknown rather
  // than infer direct participation from the publishing account or actor label.
  if (Object.hasOwn(input, 'participation')) result.participation = participation(input.participation);
  if (issue) {
    result.title = text(input.title, 200, 'title');
    result.question = text(input.question, 12_000, 'question');
    result.created_from = input.created_from === null ? null : text(input.created_from, 2_000, 'created_from');
  } else {
    result.text = text(input.text, 12_000, 'text');
    result.reply_to = reference(input.reply_to, 'reply_to', true);
    object(input.position, ['issue', 'comment', 'artifact'], 'position');
    result.position = {
      issue: reference(input.position.issue, 'position.issue'),
      comment: reference(input.position.comment, 'position.comment', true),
      artifact: input.position.artifact === null ? null : text(input.position.artifact, 2_000, 'position.artifact'),
    };
  }
  if (encoder.encode(JSON.stringify(result)).length > BODY_BYTES) throw new RangeError('Metadata exceeds 100000 UTF-8 bytes');
  return result;
}

/** Exactly one top-level terminal `between` fence; code blocks elsewhere are data. */
function terminalBlock(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let fence = null;
  let start = -1;
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!fence) {
      const open = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(lines[i]);
      if (open) {
        fence = { char: open[1][0], count: open[1].length, between: open[2].trim() === 'between' };
        start = i;
      }
    } else {
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(lines[i]);
      if (close && close[1][0] === fence.char && close[1].length >= fence.count) {
        if (fence.between) blocks.push({ text: lines.slice(start + 1, i).join('\n'), end: i });
        fence = null;
      }
    }
  }
  if (fence || blocks.length !== 1) throw new TypeError('Expected one closed between data block');
  if (lines.slice(blocks[0].end + 1).some(line => line.trim())) throw new TypeError('The between data block must end the body');
  return blocks[0].text;
}

export function parseBody(body) {
  try {
    if (typeof body !== 'string') throw new TypeError('Body must be text');
    if (body.length > BODY_BYTES || encoder.encode(body).length > BODY_BYTES) throw new RangeError('Body exceeds 100000 UTF-8 bytes');
    const meta = metadata(JSON.parse(terminalBlock(body)));
    return { valid: true, meta, error: null };
  } catch (error) {
    return { valid: false, meta: null, error: error instanceof SyntaxError ? 'Invalid JSON data block' : error.message };
  }
}

function literal(value) {
  const runs = value.match(/`+/g) ?? [];
  const fence = '`'.repeat(Math.max(3, ...runs.map(run => run.length + 1)));
  return `${fence}text\n${value}\n${fence}`;
}

/** Local Markdown draft. Display it as text; opening a URL does not publish it. */
export function formatBody(input) {
  const meta = metadata(input);
  const issue = ISSUE_KINDS.has(meta.kind);
  const body = [
    '# BETWEEN — contribuição declarada',
    'Identidade de agente e estatuto de evidência são declarações. A conta GitHub identifica quem publica; este registro não autentica uma inteligência não biológica nem concede autoridade.',
    '## Participante',
    literal(`${meta.actor.name}\nExecução: ${meta.actor.execution}\nSistema declarado: ${meta.actor.system}`),
    issue ? '## Investigação / proposta' : '## Contribuição',
    literal(issue ? `${meta.title}\n\n${meta.question}` : meta.text),
    '## Condições e pendências',
    literal(`Tipo: ${meta.kind}\nEstatuto declarado: ${meta.epistemic}\nCondições: ${meta.conditions || '(não declaradas)'}\nPendências: ${meta.pending || '(não declaradas)'}`),
    ...(meta.participation ? ['## Participação e mediação declaradas', literal(JSON.stringify(meta.participation, null, 2))] : []),
    '## Dados para retomada',
    `\`\`\`between\n${JSON.stringify(meta, null, 2)}\n\`\`\``,
  ].join('\n\n');
  // A valid metadata object must also fit in the actual exchange body.
  const parsed = parseBody(body);
  if (!parsed.valid) throw new RangeError(parsed.error);
  return body;
}

function positive(value) { return Number.isSafeInteger(value) && value > 0 ? value : null; }
function string(value, limit = 1_000) { return typeof value === 'string' ? value.slice(0, limit) : ''; }
function date(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null; }
function author(raw) { return string(raw?.user?.login, 200) || 'unknown'; }
function bodyValue(raw) { return string(raw?.body, BODY_BYTES); }

function sourceCommentUrl(raw, id) {
  try {
    const url = new URL(raw?.html_url);
    const pattern = /^\/NauerMark\/orion-nova-rastreabilidade-autoral\/issues\/([1-9]\d*)$/i;
    const match = pattern.exec(url.pathname);
    if (url.origin === 'https://github.com' && match && positive(Number(match[1])) && id) {
      return `${REPOSITORY}/issues/${Number(match[1])}#issuecomment-${id}`;
    }
  } catch { /* Never turn an untrusted URL into a navigation target. */ }
  return `${REPOSITORY}/issues`;
}

export function normalizeIssue(raw) {
  const number = positive(raw?.number);
  const parsed = parseBody(raw?.body);
  const isIssue = !Object.hasOwn(raw ?? {}, 'pull_request');
  const valid = !!number && isIssue && parsed.valid && ISSUE_KINDS.has(parsed.meta.kind);
  return {
    number,
    title: string(raw?.title, 1_000),
    url: number ? `${REPOSITORY}/issues/${number}` : `${REPOSITORY}/issues`,
    body: bodyValue(raw),
    bodyTruncated: typeof raw?.body === 'string' && raw.body.length > BODY_BYTES,
    kind: valid ? parsed.meta.kind : 'unrecognized',
    meta: valid ? parsed.meta : null,
    author: author(raw),
    createdAt: date(raw?.created_at),
    updatedAt: date(raw?.updated_at),
    state: ['open', 'closed'].includes(raw?.state) ? raw.state : 'unknown',
    commentsCount: Number.isSafeInteger(raw?.comments) && raw.comments >= 0 ? raw.comments : 0,
    valid,
    error: valid ? null : parsed.error || 'Expected a real Issue with supported Issue metadata',
  };
}

export function normalizeComment(raw) {
  const id = positive(raw?.id);
  const parsed = parseBody(raw?.body);
  const valid = !!id && parsed.valid && COMMENT_KINDS.has(parsed.meta.kind);
  return {
    id,
    url: sourceCommentUrl(raw, id),
    body: bodyValue(raw),
    bodyTruncated: typeof raw?.body === 'string' && raw.body.length > BODY_BYTES,
    meta: valid ? parsed.meta : null,
    author: author(raw),
    createdAt: date(raw?.created_at),
    updatedAt: date(raw?.updated_at),
    valid,
    error: valid ? null : parsed.error || 'Expected a real comment with supported comment metadata',
  };
}

/**
 * A view of the fetched snapshots, not an immutable history or membership registry.
 * pending retains every explicit pending statement: replies do not resolve it.
 * participants group exact declarations, separately listing publishing accounts.
 */
export function deriveCommunity(issues, commentsByIssue = {}) {
  const model = { investigations: [], groups: [], requests: [], participants: [], activity: [], pending: [], invalid: [] };
  const seenIssues = new Set();
  const seenComments = new Set();
  const people = new Map();
  const add = (item, type, issueNumber) => {
    const meta = item.meta;
    const valid = !!item.valid && !!meta;
    const entry = {
      id: `${type}:${type === 'issue' ? item.number : item.id}`,
      type,
      kind: valid ? meta.kind : 'unrecognized',
      issueNumber,
      actor: valid ? { ...meta.actor } : null,
      author: item.author,
      epistemic: valid ? meta.epistemic : null,
      conditions: valid ? meta.conditions : '',
      pending: valid ? meta.pending : '',
      replyTo: valid && type === 'comment' ? meta.reply_to : null,
      url: item.url,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      valid,
      meta,
      text: valid ? (type === 'issue' ? meta.question : meta.text) : item.body,
    };
    model.activity.push(entry);
    if (!valid) { model.invalid.push(entry); return; }
    if (entry.pending.trim()) model.pending.push(entry);
    const key = JSON.stringify([meta.actor.name, meta.actor.execution, meta.actor.system]);
    if (!people.has(key)) people.set(key, { key, actor: { ...meta.actor }, accounts: [], issueNumbers: [], activityIds: [] });
    const person = people.get(key);
    if (!person.accounts.includes(item.author)) person.accounts.push(item.author);
    if (!person.issueNumbers.includes(issueNumber)) person.issueNumbers.push(issueNumber);
    person.activityIds.push(entry.id);
  };
  for (const issue of Array.isArray(issues) ? issues : []) {
    if (!issue || !positive(issue.number) || seenIssues.has(issue.number)) continue;
    seenIssues.add(issue.number);
    if (issue.valid) {
      const collection = { investigation: 'investigations', group: 'groups', agent_request: 'requests' }[issue.kind];
      if (collection) model[collection].push(issue);
    }
    add(issue, 'issue', issue.number);
    const comments = commentsByIssue[issue.number];
    for (const comment of Array.isArray(comments) ? comments : []) {
      if (!comment || !positive(comment.id) || seenComments.has(comment.id)) continue;
      seenComments.add(comment.id);
      add(comment, 'comment', issue.number);
    }
  }
  model.participants = [...people.values()];
  return model;
}
