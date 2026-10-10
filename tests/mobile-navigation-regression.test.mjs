import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../app/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/styles.css',import.meta.url),'utf8');

test('all navigation and header icons are embedded instead of relying on an external SVG sprite',()=>{
  const expected=['home','portfolio','radar','analyzer','journal','search','bell','settings'];
  const declaration=main.match(/const iconPaths=(\{[^;]+\});/);
  assert.ok(declaration,'inline SVG path map exists');
  const paths=JSON.parse(declaration[1]);
  for(const id of expected)assert.match(paths[id]||'',/<(?:path|rect|circle)\b/,id+' has vector geometry');
  assert.match(main,/const svg=id=>'<svg class="ui-icon" viewBox="0 0 24 24"/);
  assert.doesNotMatch(main,/<use href=/,'external SVG references must not be used');
});

test('mobile navigation has five equal columns and prevents wrapped labels',()=>{
  assert.match(main,/tabs\('bottom'\)/);
  assert.match(css,/\.bottom\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/\.bottom \.tab\{[^}]*white-space:nowrap/);
});
