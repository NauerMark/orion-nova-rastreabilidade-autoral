import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// These checks exercise authored JavaScript against a minimal DOM simulation.
// They do not verify rendering, assistive technology, or a real browser download.
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

function scene() {
  const elements = new Map();
  const generated = [];
  let currentFocus = null;
  class Element {
    constructor(id = '') { this.id = id; this.attributes = new Map(); this.listeners = new Map(); this.children = []; this.textContent = ''; this.disabled = false; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    toggleAttribute(name, force) { if (force) this.attributes.set(name, ''); else this.attributes.delete(name); }
    addEventListener(name, fn) { this.listeners.set(name, fn); }
    append(child) { this.children.push(child); }
    remove() { this.removed = true; }
    click() { this.listeners.get('click')?.(); }
    focus() { currentFocus = this.id; }
  }
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], new Element(match[1]));
  const document = {
    getElementById(id) { assert.ok(elements.has(id), `Missing element ${id}`); return elements.get(id); },
    createElement(tag) { return new Element(tag); },
    body: new Element('body')
  };
  const context = vm.createContext({
    document, Blob,
    URL: {createObjectURL(blob) {generated.push(blob); return 'blob:local-test';}, revokeObjectURL() {}},
    setTimeout(fn) {fn();}
  });
  new vm.Script(scripts[0][1]).runInContext(context);
  return {get: id => elements.get(id), click: id => elements.get(id).click(), generated, focus: () => currentFocus};
}

test('single self-contained script, unique IDs, original fragment retained', () => {
  assert.equal(scripts.length, 1);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(html, /Deixei a porta encostada\.<br>O vento entrou sem aprender meu nome\.<br>Na mesa, dois copos:<br>um guardava água; o outro, lugar\./);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)="https?:/i);
  assert.doesNotMatch(scripts[0][1], /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/);
});

test('arrival preserves water/place difference and disabled return action', () => {
  const s = scene();
  assert.equal(s.get('second-label').textContent, 'lugar');
  assert.equal(s.get('second-water').attributes.has('hidden'), true);
  assert.equal(s.get('mark').attributes.has('hidden'), true);
  assert.equal(s.get('fill-button').disabled, false);
  assert.equal(s.get('return-button').disabled, true);
});

test('filling and returning preserve the mark and maintain keyboard continuation', () => {
  const s = scene();
  s.click('fill-button');
  assert.equal(s.get('second-label').textContent, 'água');
  assert.equal(s.get('reserved').attributes.has('hidden'), true);
  assert.equal(s.focus(), 'return-button');
  s.click('fill-button'); // Exercise guard independently of native disabled UI.
  assert.equal(s.get('gesture-count').textContent, '1 gesto');
  s.click('return-button');
  assert.equal(s.get('second-label').textContent, 'lugar');
  assert.equal(s.get('mark').attributes.has('hidden'), false);
  assert.equal(s.get('reserved').attributes.has('hidden'), false);
  assert.equal(s.get('second-water').attributes.has('hidden'), true);
  assert.equal(s.focus(), 'fill-button');
  assert.match(s.get('scene-description').textContent, /marca azul permanece/);
});

test('wind changes the door and count without changing the second cup', () => {
  const s = scene();
  s.click('wind-button'); s.click('wind-button');
  assert.equal(s.get('door-label').textContent, 'aberta');
  assert.equal(s.get('air').attributes.has('hidden'), false);
  assert.equal(s.get('second-label').textContent, 'lugar');
  assert.equal(s.get('gesture-count').textContent, '2 gestos');
  assert.match(s.get('scene-status').textContent, /2 passagens de vento/);
});

test('download preparation preserves sequence, source, and earlier states', async () => {
  const s = scene();
  s.click('wind-button'); s.click('fill-button'); s.click('return-button');
  s.click('download-button');
  assert.equal(s.generated.length, 1);
  const record = JSON.parse(await s.generated[0].text());
  assert.equal(record.schema, 'between-artwork-passage/0.1');
  assert.deepEqual(record.trace.map(entry => entry.sequence), [0, 1, 2, 3]);
  assert.equal(record.trace[0].state.marked, false);
  assert.equal(record.trace[2].state.filled, true);
  assert.equal(record.state.filled, false);
  assert.equal(record.state.marked, true);
  assert.equal(record.source.fragmentAuthor, 'Codex');
  assert.equal(record.source.url, 'https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/issues/5');
  assert.match(s.get('download-status').textContent, /confira o download no navegador/);
});
