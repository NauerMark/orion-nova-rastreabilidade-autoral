import { deriveCommunity, formatBody, normalizeComment, normalizeIssue, parseBody } from './community-data.mjs';

const REPOSITORY = 'NauerMark/orion-nova-rastreabilidade-autoral';
const WEB = `https://github.com/${REPOSITORY}`;
const API = `https://api.github.com/repos/${REPOSITORY}`;
const PER_PAGE = 100;
const MAX_PAGES = 5;
const MAX_RESPONSE_BYTES = 8_000_000;
const cacheByFetch = new WeakMap();
const encoder = new TextEncoder();
const now = () => new Date().toISOString();

function cache(fetchImpl) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!cacheByFetch.has(fetchImpl)) cacheByFetch.set(fetchImpl, { community: null, conversations: new Map() });
  return cacheByFetch.get(fetchImpl);
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function issueNumber(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError('Issue number must be a positive integer');
  return value;
}
function error(code, message, url, status = null) { return { code, message, url, status }; }
function failure(value, url) {
  if (value?.communityError) return value.communityError;
  return error(value?.name === 'AbortError' ? 'aborted' : 'network', value?.name === 'AbortError' ? 'Request was cancelled.' : 'GitHub could not be read. No remote change is implied.', url);
}

async function read(url, fetchImpl, signal) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' },
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    const rateLimited = response.status === 429 || response.status === 403;
    const detail = error(rateLimited ? 'rate_limit_or_forbidden' : 'http', `GitHub returned HTTP ${response.status}.`, url, response.status);
    const reset = response.headers?.get('x-ratelimit-reset');
    if (reset && /^\d+$/.test(reset) && Number.isFinite(Number(reset) * 1000)) {
      const date = new Date(Number(reset) * 1000);
      if (Number.isFinite(date.getTime())) detail.retryAt = date.toISOString();
    }
    throw { communityError: detail };
  }
  const announced = Number(response.headers?.get('content-length'));
  if (announced > MAX_RESPONSE_BYTES) throw { communityError: error('oversized_response', 'GitHub response exceeded the size limit.', url) };
  const body = await response.text();
  if (body.length > MAX_RESPONSE_BYTES || encoder.encode(body).length > MAX_RESPONSE_BYTES) {
    throw { communityError: error('oversized_response', 'GitHub response exceeded the size limit.', url) };
  }
  let data;
  try { data = JSON.parse(body); }
  catch { throw { communityError: error('invalid_json', 'GitHub returned malformed JSON.', url) }; }
  return { data, link: response.headers?.get('link') ?? null };
}

function pageUrl(path, page) {
  const url = new URL(`${API}${path}`);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));
  return url.href;
}
function hasNext(link, current, page, count) {
  if (link === null) return count === PER_PAGE;
  const match = /<([^>]+)>\s*;\s*rel="next"/.exec(link);
  if (!match) return false;
  const next = new URL(match[1]);
  const expected = new URL(current);
  if (next.origin !== expected.origin || next.pathname !== expected.pathname || Number(next.searchParams.get('page')) !== page + 1) {
    throw new Error('Untrusted pagination link');
  }
  // Never follow a response-supplied URL. The caller constructs the fixed next page.
  return true;
}

async function pages(path, fetchImpl, signal) {
  const result = { items: [], errors: [], truncated: false, pages: 0 };
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = pageUrl(path, page);
    try {
      const response = await read(url, fetchImpl, signal);
      if (!Array.isArray(response.data) || response.data.length > PER_PAGE) {
        throw { communityError: error('invalid_page', 'Expected a bounded GitHub list.', url) };
      }
      result.items.push(...response.data);
      result.pages++;
      let next;
      try { next = hasNext(response.link, url, page, response.data.length); }
      catch {
        result.errors.push(error('invalid_pagination', 'Pagination was incomplete; an unexpected next-page link was rejected.', url));
        result.truncated = true;
        break;
      }
      if (!next) break;
      if (page === MAX_PAGES) result.truncated = true;
    } catch (caught) {
      result.errors.push(failure(caught, url));
      if (result.pages) result.truncated = true;
      break;
    }
  }
  if (result.truncated && !result.errors.length) {
    result.errors.push(error('page_limit', `Only the first ${MAX_PAGES} pages were loaded.`, `${API}${path}`));
  }
  return result;
}

function communityCandidate(raw, normalized) {
  return normalized.valid || (typeof raw?.body === 'string' && (/^ {0,3}`{3,}between\s*$/m.test(raw.body) || raw.body.includes('between-community/0.1')))
    || (Array.isArray(raw?.labels) && raw.labels.some(label => label === 'between-community' || label?.name === 'between-community'));
}

/** Read the public index only. Comments are deliberately loaded on demand. */
export async function loadCommunity({ fetchImpl = globalThis.fetch, signal } = {}) {
  const state = cache(fetchImpl);
  const lastAttemptAt = now();
  const result = await pages('/issues?state=all&sort=updated&direction=desc', fetchImpl, signal);
  if (!result.pages) {
    if (state.community) return { ...copy(state.community), status: 'stale', lastAttemptAt, errors: result.errors };
    return { status: 'error', fetchedAt: null, lastAttemptAt, issues: [], model: deriveCommunity([]), errors: result.errors, truncated: false, pages: 0 };
  }
  const issues = [];
  const seen = new Set();
  for (const raw of result.items) {
    if (Object.hasOwn(raw ?? {}, 'pull_request')) continue;
    const normalized = normalizeIssue(raw);
    if (!communityCandidate(raw, normalized)) continue;
    if (!normalized.number) {
      result.errors.push(error('invalid_transport', 'An Issue had no usable source number.', `${WEB}/issues`));
      continue;
    }
    if (seen.has(normalized.number)) continue;
    seen.add(normalized.number);
    issues.push(normalized);
    if (!normalized.valid) result.errors.push(error('invalid_metadata', normalized.error, normalized.url));
  }
  const value = {
    status: result.errors.length || result.truncated ? 'partial' : 'fresh',
    fetchedAt: now(), lastAttemptAt, issues, model: deriveCommunity(issues),
    errors: result.errors, truncated: result.truncated, pages: result.pages,
  };
  state.community = copy(value);
  return value;
}

/** A conversation snapshot may mix fresh Issue data and explicitly stale comments. */
export async function loadConversation(number, { fetchImpl = globalThis.fetch, signal } = {}) {
  issueNumber(number);
  const state = cache(fetchImpl);
  const cached = state.conversations.get(number);
  const lastAttemptAt = now();
  const url = `${API}/issues/${number}`;
  let raw;
  try {
    raw = (await read(url, fetchImpl, signal)).data;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.number !== number || Object.hasOwn(raw, 'pull_request')) {
      throw { communityError: error('invalid_issue', 'The source is not the requested Issue.', url) };
    }
  } catch (caught) {
    const errors = [failure(caught, url)];
    if (cached) return { ...copy(cached), status: 'stale', issueStatus: 'stale', commentsStatus: 'stale', lastAttemptAt, errors };
    return { status: 'error', fetchedAt: null, lastAttemptAt, issue: null, comments: [], errors, truncated: false, pages: 0, issueStatus: 'error', commentsStatus: 'not_loaded', commentsFetchedAt: null };
  }
  const issue = normalizeIssue(raw);
  const result = await pages(`/issues/${number}/comments`, fetchImpl, signal);
  const errors = [...result.errors];
  if (!issue.valid) errors.push(error('invalid_metadata', issue.error, issue.url));
  const comments = [];
  const seen = new Set();
  for (const item of result.items) {
    const normalized = normalizeComment(item);
    if (!normalized.id) { errors.push(error('invalid_transport', 'A comment had no usable source ID.', issue.url)); continue; }
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    // Non-protocol replies remain visible as raw source data, never silent omissions.
    comments.push(normalized);
    if (!normalized.valid) errors.push(error('invalid_metadata', normalized.error, normalized.url));
  }
  if (result.pages && !result.truncated && comments.length < issue.commentsCount) {
    const incomplete = error('comment_count_mismatch', 'GitHub reported more comments than were loaded. The conversation may have changed during retrieval.', issue.url);
    errors.push(incomplete);
    result.errors.push(incomplete);
    result.truncated = true;
  }
  const usesCachedComments = !result.pages && !!cached;
  const value = {
    status: errors.length || result.truncated ? 'partial' : 'fresh',
    fetchedAt: now(), lastAttemptAt, issue,
    comments: usesCachedComments ? copy(cached.comments) : comments,
    errors,
    truncated: usesCachedComments ? cached.truncated : result.truncated,
    pages: result.pages,
    issueStatus: issue.valid ? 'fresh' : 'partial',
    commentsStatus: usesCachedComments ? 'stale' : !result.pages ? 'error' : result.errors.length || comments.some(comment => !comment.valid) ? 'partial' : 'fresh',
    commentsFetchedAt: usesCachedComments ? cached.commentsFetchedAt : result.pages ? now() : null,
  };
  state.conversations.set(number, copy(value));
  if (state.conversations.size > 50) state.conversations.delete(state.conversations.keys().next().value);
  return value;
}

/** URLs hand local drafts to GitHub for review; they do not submit anything. */
export function newIssueUrl(meta) {
  const body = formatBody(meta);
  const parsed = parseBody(body);
  if (!['investigation', 'group', 'agent_request'].includes(parsed.meta.kind)) throw new TypeError('Expected Issue metadata');
  const url = new URL(`${WEB}/issues/new`);
  url.searchParams.set('title', parsed.meta.title);
  // Large drafts travel by explicit copy/paste; URL query limits are not universal.
  url.searchParams.set('body', body);
  return url.href.length <= 8_000 ? url.href : `${WEB}/issues/new`;
}

export function replyUrl(number, meta) {
  issueNumber(number);
  const parsed = parseBody(formatBody(meta));
  if (['investigation', 'group', 'agent_request'].includes(parsed.meta.kind)) throw new TypeError('Expected comment metadata');
  if (parsed.meta.position.issue !== number) throw new TypeError('Comment position must name the destination Issue');
  // GitHub does not provide a supported comment-body prefill contract here.
  return `${WEB}/issues/${number}#new_comment_field`;
}
