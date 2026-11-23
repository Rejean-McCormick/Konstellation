// Regression: browser-imported ES modules must be served as JavaScript, not octet-stream.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=fs.readFileSync(path.join(root,'server','index.mjs'),'utf8');
const page=fs.readFileSync(path.join(root,'public','kristals-publics','index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'public','kristals-publics','app.js'),'utf8');

test('static server serves both .js and .mjs with the JavaScript MIME type',()=>{
  assert.match(server,/['"]\.js['"]\s*:\s*['"]text\/javascript; charset=utf-8['"]/);
  assert.match(server,/['"]\.mjs['"]\s*:\s*['"]text\/javascript; charset=utf-8['"]/);
  assert.match(server,/['"]Content-Type['"]\s*:\s*types\[path\.extname\(file\)\]/);
});

test('public Kristal reader imports local ES modules that exist in the static directory',()=>{
  assert.match(page,/<script\s+type="module"\s+src="\.\/app\.js"/);
  const imports=[...app.matchAll(/from\s+['"]\.\/([^'"]+\.mjs)['"]/g)].map(x=>x[1]);
  assert.deepEqual(imports.sort(),['graph-core.mjs','profile.mjs','semantic-display.mjs']);
  for(const name of imports){
    const f=path.join(root,'public','kristals-publics',name);
    assert.equal(fs.statSync(f).isFile(),true,name);
  }
});
