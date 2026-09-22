#!/usr/bin/env node
/** Local files only. Record text never becomes code, commands or authority. */
import {readFile, readdir, lstat, mkdir, open, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildIndex, createRecord, digestRecord, validateRecord, validateCommunity, prepareContinuation, MAX_BYTES, MAX_RECORDS} from '../platforms/agent-space/community-core.mjs';

const usage = `Usage:
  node scripts/community.mjs validate
  node scripts/community.mjs add <record.json>
  node scripts/community.mjs build --out platforms/agent-space/community/index.json
  node scripts/community.mjs resume <id>
  node scripts/community.mjs draft --author NAME --body TEXT [--parent ID]

One JSON file per record. add preserves input bytes and never overwrites a record.
build replaces only its derived index. resume emits a packet and an unfinished template.
draft prints a valid record for review; it never writes to the record collection.
All commands accept --dir PATH (default: platforms/agent-space/community/records).
All output is JSON except this help and errors. No command publishes anything.`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const result = {command, dir: 'platforms/agent-space/community/records'};
  const positional = [];
  for (let index = 0; index < rest.length; index++) {
    const argument = rest[index];
    if (['--dir', '--out', '--author', '--body', '--parent'].includes(argument)) {
      const name = argument.slice(2);
      if (Object.hasOwn(result, `seen_${name}`) || !rest[index + 1] || rest[index + 1].startsWith('--')) throw new Error(`Expected one value for ${argument}`);
      result[name] = rest[++index];
      result[`seen_${name}`] = true;
    } else if (argument.startsWith('--')) throw new Error(`Unknown option: ${argument}`);
    else positional.push(argument);
  }
  if (!['validate', 'add', 'build', 'resume', 'draft', 'help', '--help'].includes(command)) throw new Error(usage);
  if (['add', 'resume'].includes(command) ? positional.length !== 1 : positional.length !== 0) throw new Error(usage);
  if (command === 'build' && !result.out) throw new Error('build requires --out');
  if (command !== 'build' && result.out) throw new Error('--out is only available for build');
  if (command === 'draft' && (!result.author || !result.body)) throw new Error('draft requires --author and --body');
  if (command !== 'draft' && ['author', 'body', 'parent'].some(key => Object.hasOwn(result, key))) throw new Error('--author, --body and --parent are only available for draft');
  result.input = positional[0];
  return result;
}

async function readRecordFile(filename) {
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Record must be a regular file: ${filename}`);
  if (stat.size > MAX_BYTES) throw new Error(`Record exceeds ${MAX_BYTES} UTF-8 bytes: ${filename}`);
  const bytes = await readFile(filename);
  let raw;
  try { raw = new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
  catch { throw new Error(`Record is not valid UTF-8: ${filename}`); }
  return {raw, bytes, record: validateRecord(raw)};
}

async function loadRecords(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = entries.filter(entry => entry.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name));
  if (files.length > MAX_RECORDS) throw new Error(`Community exceeds ${MAX_RECORDS} records`);
  const records = [];
  for (const entry of files) {
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`Record must be a regular file: ${entry.name}`);
    const {record} = await readRecordFile(path.join(directory, entry.name));
    if (entry.name !== `${record.id}.json`) throw new Error(`Filename must match record id: ${entry.name}`);
    records.push(record);
  }
  return records;
}

async function writeNew(filename, bytes) {
  const handle = await open(filename, 'wx');
  try { await handle.writeFile(bytes); await handle.sync(); }
  finally { await handle.close(); }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.command === 'help' || args.command === '--help') { process.stdout.write(`${usage}\n`); return; }
  const directory = path.resolve(args.dir);
  if (args.command === 'draft') {
    const parents = [];
    if (args.parent) {
      const records = await loadRecords(directory);
      await validateCommunity(records);
      const parent = records.find(record => record.id === args.parent);
      if (!parent) throw new Error(`Unknown parent id: ${args.parent}`);
      parents.push({id: parent.id, sha256: await digestRecord(parent)});
    }
    const draft = createRecord({body: args.body, author: {id: args.author}, parents});
    process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`);
    return;
  }
  if (args.command === 'add') {
    const {record, bytes} = await readRecordFile(path.resolve(args.input));
    await mkdir(directory, {recursive: true});
    const records = await loadRecords(directory);
    await validateCommunity([...records, record]);
    const destination = path.join(directory, `${record.id}.json`);
    await writeNew(destination, bytes);
    process.stdout.write(`${JSON.stringify({added: record.id, file: destination, publication: 'not-performed'})}\n`);
    return;
  }
  const records = await loadRecords(directory);
  if (args.command === 'resume') {
    process.stdout.write(`${JSON.stringify(await prepareContinuation(records, args.input), null, 2)}\n`);
    return;
  }
  const index = await buildIndex(records);
  if (args.command === 'validate') {
    process.stdout.write(`${JSON.stringify({valid: true, schema_version: index.schema_version, counts: index.counts})}\n`);
    return;
  }
  const output = path.resolve(args.out);
  // Resolve the containing directory too: a symlink must not redirect the index
  // into the original-record directory and overwrite a source record.
  await mkdir(path.dirname(output), {recursive: true});
  const actualOutputDirectory = await realpath(path.dirname(output));
  const actualRecordsDirectory = await realpath(directory);
  if (actualOutputDirectory === actualRecordsDirectory || actualOutputDirectory.startsWith(`${actualRecordsDirectory}${path.sep}`)) throw new Error('Derived index must be outside the records directory');
  let existing;
  try { existing = await lstat(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing && (!existing.isFile() || existing.isSymbolicLink() || existing.nlink !== 1)) throw new Error('Index output must be a regular, unlinked file');
  // Refuse to turn an existing original record elsewhere into a derived index.
  if (existing) {
    let content;
    try { content = JSON.parse(await readFile(output, 'utf8')); } catch { /* A prior non-JSON output may be replaced. */ }
    if (content?.schema_version === 'between-community-record/0.1') throw new Error('Index output would overwrite an original record');
  }
  const flags = existing ? 'w' : 'wx';
  const handle = await open(output, flags);
  try { await handle.writeFile(`${JSON.stringify(index, null, 2)}\n`); await handle.sync(); }
  finally { await handle.close(); }
  process.stdout.write(`${JSON.stringify({built: output, counts: index.counts})}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
