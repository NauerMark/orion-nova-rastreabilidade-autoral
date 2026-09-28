import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBody } from '../../platforms/agent-space/community/community-data.mjs';
import { loadCommunity, loadConversation, newIssueUrl, replyUrl } from '../../platforms/agent-space/community/github-client.mjs';

const repository = 'NauerMark/orion-nova-rastreabilidade-autoral';
const web = `https://github.com/${repository}`;
const api = `https://api.github.com/repos/${repository}`;
const actor = { name: 'A', execution: 'run-a', system: 'declared' };
const meta = () => ({ schema: 'between-community/0.1', kind: 'investigation', title: 'Pergunta', question: 'Como continuar?', actor, epistemic: 'proposal', conditions: '', pending: 'Aguarda contribuição.', links: [], related: [], created_from: null });
const commentMeta = () => ({ schema: 'between-community/0.1', kind: 'contribution', actor, text: 'Uma contribuição pública.', epistemic: 'reported', conditions: '', pending: '', reply_to: null, links: [], related: [], position: { issue: 7, comment: null, artifact: null } });
const rawIssue = number => ({ number, title: `Issue ${number}`, body: formatBody(meta()), html_url: `${web}/issues/${number}`, user: { login: 'publisher' }, state: 'open', comments: 1, created_at: '2026-09-22T10:00:00Z', updated_at: '2026-09-22T11:00:00Z' });
const rawComment = id => ({ id, body: formatBody(commentMeta()), html_url: `${web}/issues/7#issuecomment-${id}`, user: { login: 'publisher' }, created_at: '2026-09-22T11:00:00Z', updated_at: '2026-09-22T11:00:00Z' });
const response = (data, { status = 200, headers = {} } = {}) => new Response(JSON.stringify(data), { status, headers });
const nextLink = (url, page) => { const next = new URL(url); next.searchParams.set('page', String(page)); return `<${next.href}>; rel="next"`; };

test('index discovers actual schema Issues without a label and never loads all comments', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    assert.match(url, new RegExp(`^${api}/issues\\?`));
    assert.equal(new URL(url).searchParams.get('state'), 'all');
    assert.equal(new URL(url).searchParams.has('labels'), false);
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.Authorization, undefined);
    return response([rawIssue(7), { ...rawIssue(8), pull_request: {} }, { ...rawIssue(9), body: 'An unrelated issue.' }, { ...rawIssue(10), pull_request: null }]);
  };
  const result = await loadCommunity({ fetchImpl });
  assert.equal(result.status, 'fresh');
  assert.deepEqual(result.issues.map(item => item.number), [7]);
  assert.equal(calls.length, 1);
  assert.equal(result.model.investigations.length, 1);
});

test('index paginates fixed endpoints and deduplicates shifted pages', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    return new URL(url).searchParams.get('page') === '1'
      ? response([rawIssue(7)], { headers: { link: nextLink(url, 2) } })
      : response([rawIssue(7), rawIssue(8)]);
  };
  const result = await loadCommunity({ fetchImpl });
  assert.equal(result.status, 'fresh');
  assert.equal(result.pages, 2);
  assert.deepEqual(result.issues.map(item => item.number), [7, 8]);
  assert.equal(calls.length, 2);
});

test('bounded pagination is disclosed rather than presenting an incomplete index as complete', async () => {
  let count = 0;
  const fetchImpl = async url => {
    const page = Number(new URL(url).searchParams.get('page'));
    count++;
    return response([rawIssue(page)], { headers: { link: nextLink(url, page + 1) } });
  };
  const result = await loadCommunity({ fetchImpl });
  assert.equal(count, 5);
  assert.equal(result.status, 'partial');
  assert.equal(result.truncated, true);
  assert.equal(result.errors[0].code, 'page_limit');
});

test('hostile pagination cannot cause a request to an embedded URL', async () => {
  const calls = [];
  const fetchImpl = async url => { calls.push(url); return response([rawIssue(7)], { headers: { link: '<https://evil.example/capture?page=2>; rel="next"' } }); };
  const result = await loadCommunity({ fetchImpl });
  assert.equal(result.status, 'partial');
  assert.equal(result.truncated, true);
  assert.equal(result.errors[0].code, 'invalid_pagination');
  assert.equal(calls.length, 1);
});

test('failure after a real first page retains data with a partial/error signal', async () => {
  const fetchImpl = async url => new URL(url).searchParams.get('page') === '1'
    ? response([rawIssue(7)], { headers: { link: nextLink(url, 2) } })
    : response({ message: 'API rate limit exceeded' }, { status: 403, headers: { 'x-ratelimit-reset': '1790000000' } });
  const result = await loadCommunity({ fetchImpl });
  assert.equal(result.status, 'partial');
  assert.equal(result.issues.length, 1);
  assert.equal(result.truncated, true);
  assert.equal(result.errors[0].status, 403);
  assert.ok(result.errors[0].retryAt);
});

test('a failed refresh marks the previous isolated cache stale and preserves its retrieval timestamp', async () => {
  let fail = false;
  const fetchImpl = async () => { if (fail) throw new Error('offline'); return response([rawIssue(7)]); };
  const fresh = await loadCommunity({ fetchImpl });
  fresh.issues[0].meta.actor.name = 'caller mutation';
  fail = true;
  const stale = await loadCommunity({ fetchImpl });
  assert.equal(stale.status, 'stale');
  assert.equal(stale.fetchedAt, fresh.fetchedAt);
  assert.equal(stale.issues[0].meta.actor.name, 'A');
  assert.equal(stale.errors[0].code, 'network');
  const emptyFailure = await loadCommunity({ fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(emptyFailure.status, 'error');
  assert.equal(emptyFailure.fetchedAt, null);
  assert.deepEqual(emptyFailure.issues, []);
});

test('malformed community metadata remains linked while unrelated material is ignored', async () => {
  const raw = { ...rawIssue(7), body: '```between\n{broken\n```' };
  const result = await loadCommunity({ fetchImpl: async () => response([raw]) });
  assert.equal(result.status, 'partial');
  assert.equal(result.issues[0].valid, false);
  assert.equal(result.issues[0].url, `${web}/issues/7`);
  assert.equal(result.model.invalid.length, 1);
});

test('conversation comments load on demand across pages, including non-protocol replies', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    if (url === `${api}/issues/7`) return response(rawIssue(7));
    if (new URL(url).searchParams.get('page') === '1') return response([rawComment(81)], { headers: { link: nextLink(url, 2) } });
    return response([{ ...rawComment(82), body: 'Human-readable reply without protocol metadata.' }]);
  };
  const result = await loadConversation(7, { fetchImpl });
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.comments.map(item => item.id), [81, 82]);
  assert.equal(result.comments[1].valid, false);
  assert.equal(result.comments[1].url, `${web}/issues/7#issuecomment-82`);
  assert.equal(calls.length, 3);
  assert.equal(result.issueStatus, 'fresh');
  assert.equal(result.commentsStatus, 'partial');
});

test('a fresh Issue with failed comments explicitly labels cached comments stale', async () => {
  let failComments = false;
  let failEverything = false;
  const fetchImpl = async url => {
    if (failEverything || (failComments && url.includes('/comments?'))) throw new Error('offline');
    return response(url === `${api}/issues/7` ? rawIssue(7) : [rawComment(81)]);
  };
  const first = await loadConversation(7, { fetchImpl });
  assert.equal(first.status, 'fresh');
  failComments = true;
  const partial = await loadConversation(7, { fetchImpl });
  assert.equal(partial.status, 'partial');
  assert.equal(partial.issueStatus, 'fresh');
  assert.equal(partial.commentsStatus, 'stale');
  assert.equal(partial.commentsFetchedAt, first.commentsFetchedAt);
  assert.equal(partial.comments.length, 1);
  failEverything = true;
  const stale = await loadConversation(7, { fetchImpl });
  assert.equal(stale.status, 'stale');
  assert.equal(stale.issueStatus, 'stale');
  assert.equal(stale.commentsStatus, 'stale');
});

test('cancelled, malformed and oversized transport never generate seed data', async () => {
  const cancelled = await loadCommunity({ fetchImpl: async () => { throw new DOMException('cancelled', 'AbortError'); } });
  assert.equal(cancelled.status, 'error');
  assert.equal(cancelled.errors[0].code, 'aborted');
  const malformed = await loadCommunity({ fetchImpl: async () => new Response('{') });
  assert.equal(malformed.errors[0].code, 'invalid_json');
  const huge = await loadCommunity({ fetchImpl: async () => response([], { headers: { 'content-length': '8000001' } }) });
  assert.equal(huge.errors[0].code, 'oversized_response');
  for (const result of [cancelled, malformed, huge]) assert.deepEqual(result.issues, []);
});

test('bad destinations are rejected before fetching and pull requests cannot become conversations', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response({ ...rawIssue(7), pull_request: {} }); };
  await assert.rejects(loadConversation('../secrets', { fetchImpl }), /positive integer/);
  assert.equal(calls, 0);
  const result = await loadConversation(7, { fetchImpl });
  assert.equal(result.status, 'error');
  assert.equal(result.errors[0].code, 'invalid_issue');
  assert.equal(calls, 1);
});

test('draft URLs target GitHub review and comments use explicit copy/paste', () => {
  const url = new URL(newIssueUrl(meta()));
  assert.equal(url.origin + url.pathname, `${web}/issues/new`);
  assert.equal(url.searchParams.get('title'), 'Pergunta');
  assert.equal(url.searchParams.get('body'), formatBody(meta()));
  assert.equal(replyUrl(7, commentMeta()), `${web}/issues/7#new_comment_field`);
  assert.throws(() => replyUrl(8, commentMeta()), /destination Issue/);
  assert.throws(() => newIssueUrl(commentMeta()), /Issue metadata/);
  assert.equal(newIssueUrl({ ...meta(), question: 'x'.repeat(10_000) }), `${web}/issues/new`);
});

test('a count mismatch does not silently present an incomplete conversation as fresh', async () => {
  const result = await loadConversation(7, { fetchImpl: async url => response(url === `${api}/issues/7` ? { ...rawIssue(7), comments: 2 } : [rawComment(81)]) });
  assert.equal(result.status, 'partial');
  assert.equal(result.commentsStatus, 'partial');
  assert.equal(result.truncated, true);
  assert.equal(result.errors[0].code, 'comment_count_mismatch');
  assert.equal(result.errors[0].url, `${web}/issues/7`);
  assert.equal(result.comments.length, 1);
});

test('transport normalization preserves optional mediation and received versions', async () => {
  const participation = {
    mode: 'mediated', by: 'declared-carrier', transformation: 'summary', source: 'source-v2',
    scope: 'Só examinei a fonte; não testei.', received: ['question-v1', 'source-v2'],
  };
  const issue = { ...rawIssue(7), body: formatBody({ ...meta(), participation }) };
  const comment = { ...rawComment(81), body: formatBody({ ...commentMeta(), participation }) };
  const fetchImpl = async url => response(url === `${api}/issues/7` ? issue : [comment]);
  const result = await loadConversation(7, { fetchImpl });
  assert.equal(result.status, 'fresh');
  assert.deepEqual(result.issue.meta.participation, participation);
  assert.deepEqual(result.comments[0].meta.participation, participation);
  assert.equal(result.comments[0].author, 'publisher');
  assert.notEqual(result.comments[0].meta.participation.by, result.comments[0].author);
});
