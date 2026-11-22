import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
test('Konstellation exposes the reader on its own origin and never embeds a second catalog',()=>{
 const explorer=read('src/components/Explorer.svelte');
 const server=read('server/index.mjs');
 const page=read('public/kristals-publics/index.html');
 assert.match(explorer,/href="\/kristals-publics\/index\.html"/);
 assert.match(server,/publicKristalsProvider\.serve/);
 assert.match(page,/Retour|← Konstellation/);
 assert.match(page,/content="default-src 'self'/);
 assert.equal(fs.existsSync(path.join(root,'public/kristals-publics/data/catalog.json')),false);
 assert.equal(fs.existsSync(path.join(root,'public/kristals-publics/data')),false);
});
test('Light client uses only same-origin fetch and preserves SHA check for every pack',()=>{
 const app=read('public/kristals-publics/app.js');
 assert.match(app,/fetch\('\.\/data\/catalog\.json'/);
 assert.match(app,/fetch\(`\.\/\$\{entry\.path\}/);
 assert.match(app,/crypto\.subtle\.digest\('SHA-256'/);
 assert.doesNotMatch(app,/serviceWorker\.register/);
});
