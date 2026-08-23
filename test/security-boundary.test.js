'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function readTree(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return readTree(child);
    return entry.name.endsWith('.js') ? [fs.readFileSync(path.join(projectRoot, child), 'utf8')] : [];
  }).join('\n');
}

test('phase one source contains no input automation libraries or Windows input injection calls', () => {
  const source = readTree('src');
  const forbidden = [
    /require\(['"]robotjs['"]\)/i,
    /require\(['"]@nut-tree\/nut-js['"]\)/i,
    /require\(['"]iohook['"]\)/i,
    /\bSendInput\b/,
    /\bmouse_event\b/,
    /\bkeybd_event\b/
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});

test('renderer is isolated and sandboxed behind a preload bridge', () => {
  const mainSource = fs.readFileSync(path.join(projectRoot, 'src/main/main.js'), 'utf8');
  assert.match(mainSource, /contextIsolation:\s*true/);
  assert.match(mainSource, /nodeIntegration:\s*false/);
  assert.match(mainSource, /sandbox:\s*true/);
  assert.match(mainSource, /setPermissionRequestHandler/);
});
