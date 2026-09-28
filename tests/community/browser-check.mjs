import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.BETWEEN_PREVIEW_URL || 'http://127.0.0.1:8767/platforms/agent-space/community/';
const report = { base, started: new Date().toISOString(), scope: 'Community entry only. The separate Porta artwork is not opened by this check.', steps: [] };
mkdirSync('docs/community/verification', { recursive: true });
function cli(...args) { return execFileSync('agent-browser', ['--session','between-community',...args], { encoding:'utf8', timeout:45000 }).trim(); }
function js(code) { const out=cli('eval',code); try{return JSON.parse(out);}catch{return out;} }
function check(name, condition) { report.steps.push({name,passed:!!condition}); assert.ok(condition,name); }
function waitFor(expression) { return js('(async()=>new Promise((resolve,reject)=>{const started=Date.now();const check=()=>{if('+expression+')resolve(true);else if(Date.now()-started>15000)reject(new Error("UI state timeout"));else setTimeout(check,100)};check()}))()'); }
try {
  cli('open',base);
  waitFor('document.querySelector("#title-issue-5")');
  check('Live investigations #4 and #5 are visible', js('Boolean(document.querySelector("#title-issue-4") && document.querySelector("#title-issue-5"))'));
  cli('focus','#title-issue-5'); cli('press','Enter');
  waitFor('!document.querySelector("#refresh-conversation").disabled');
  check('Conversation opens via Enter',js('document.querySelector("#conversation-dialog").open'));
  check('Original poem remains available',js('document.querySelector("#conversation-dialog").textContent.includes("Deixei a porta encostada.")'));
  cli('click','#contest');
  cli('fill','#draft-text','Rascunho de verificação: discordar não é aderir. <img src=x onerror=alert(1)>');
  cli('fill','#draft-name','Codex — teste local');
  cli('fill','#draft-execution','browser-verification');
  cli('fill','#draft-system','Codex');
  cli('focus','#compose-form button[type=submit]'); cli('press','Enter');
  check('Preparing draft displays preview', js('!document.querySelector("#draft-preview").hidden'));
  check('Draft targets real Issue and does not publish',js('document.querySelector("#github-handoff").href === "https://github.com/NauerMark/orion-nova-rastreabilidade-autoral/issues/5#new_comment_field"'));
  check('HTML payload stays text',js('document.querySelector("#draft-output").value.includes("<img src=x") && document.querySelectorAll("#compose-dialog img").length===0'));
  cli('press','Escape');
  check('Closing draft returns focus to Contest',js('document.activeElement.id==="contest"'));
  cli('press','Escape');
  check('Closing conversation returns focus to original investigation',js('document.activeElement.id==="title-issue-5"'));
  cli('click','#resume-draft');
  check('Draft text survives reopening',js('document.querySelector("#draft-text").value.includes("discordar não é aderir")'));
  cli('press','Escape');
  cli('reload'); waitFor('document.querySelector("#title-issue-5")');
  cli('click','#resume-draft');
  check('Draft text survives reload in this tab',js('document.querySelector("#draft-text").value.includes("discordar não é aderir")'));
  cli('press','Escape');
  cli('click','[data-lang=en]');
  check('English interface works',js('document.documentElement.lang==="en" && document.querySelector("#work-title").textContent==="What we are investigating."'));
  cli('set','viewport','390','844');
  check('Mobile page does not overflow horizontally',js('document.documentElement.scrollWidth <= innerWidth'));
  cli('screenshot','docs/community/verification/mobile.png');
  cli('set','viewport','1280','900'); cli('click','[data-lang=pt]');
  cli('screenshot','docs/community/verification/desktop.png');
  report.console=cli('console'); report.errors=cli('errors');
  check('No page errors in tested flows', !report.errors);
  report.status='passed';
} catch(error) {
  report.status='failed'; report.error=error.message;
  try { report.page=js('({active:document.activeElement.id,compose:document.querySelector("#compose-dialog").open,conversation:document.querySelector("#conversation-dialog").open,error:document.querySelector("#compose-error").textContent})'); cli('screenshot','docs/community/verification/failure.png'); } catch {}
  process.exitCode=1;
} finally { report.finished=new Date().toISOString();writeFileSync('docs/community/verification/browser.json',JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report,null,2)); }
