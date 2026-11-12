import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import {parse} from 'acorn';

const source=await readFile(new URL('../scratch-gui/src/lib/sketchforge-url.js',import.meta.url),'utf8');
const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const executable=tree.body.map(node=>node.type==='ImportDeclaration'?'':source.slice(node.type==='ExportNamedDeclaration'?node.declaration.start:node.start,node.end)).join('\n')+'\nSTBLOCK_SKETCHFORGE_URL';
function editorUrl({origin='http://localhost:8601',mode='development',search='',stored=null,mobile=false,storageError=false}={}) {
  const url=new URL(origin);
  return vm.runInNewContext(executable,{process:{env:{NODE_ENV:mode}},isMobileDevice:()=>mobile,
    window:{location:{hostname:url.hostname,port:url.port,origin,search},localStorage:{getItem(){if(storageError)throw Error('Storage unavailable');return stored;}}},
    document:{getElementsByTagName:()=>[{src:origin+'/gui.js'}]},URLSearchParams});
}
test('tauri development loads the live editor, including loopback host alternatives',()=>{
  for(const origin of ['http://localhost:8601','http://127.0.0.1:8601','http://[::1]:8601']) assert.equal(editorUrl({origin}),'http://localhost:3000/?theme=light');
});
test('production keeps its bundled editor even on localhost',()=>{
  assert.equal(editorUrl({mode:'production'}),'http://localhost:8601/sketchforge/index.html?theme=light');
  assert.equal(editorUrl({mode:'production',origin:'http://tauri.localhost'}),'http://tauri.localhost/sketchforge/index.html?theme=light');
});
test('web deployments and other local ports keep their own editor',()=>{
  for(const origin of ['https://stbacademy.net','http://localhost:8080']) assert.equal(editorUrl({origin}),origin+'/sketchforge/index.html?theme=light');
});
test('explicit development opt-ins and opt-outs are respected',()=>{
  assert.match(editorUrl({search:'?dev_sketchforge=0'}),/8601\/sketchforge\//);
  assert.match(editorUrl({stored:'false'}),/8601\/sketchforge\//);
  assert.match(editorUrl({mode:'production',search:'?dev_sketchforge=1'}),/localhost:3000/);
  assert.match(editorUrl({search:'?dev_sketchforge=1',stored:'false'}),/localhost:3000/);
});
test('storage failures do not hide the live editor in development',()=>assert.match(editorUrl({storageError:true}),/localhost:3000/));
test('mobile mode works with both the live and the bundled editor',()=>{
  assert.ok(editorUrl({mobile:true}).endsWith('&mobile=1'));
  assert.ok(editorUrl({mode:'production',mobile:true}).endsWith('&mobile=1'));
});
test('webpack serves the current 3D export before the historical public snapshot',async()=>{
  const source=await readFile(new URL('../scratch-gui/webpack.config.js',import.meta.url),'utf8');
  const ast=parse(source,{ecmaVersion:'latest'});let array;
  const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='AssignmentExpression'&&node.left.property?.name==='static'&&node.left.object?.property?.name==='devServer')array=node.right;
    for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}};
  visit(ast);assert.ok(array);
  const guiRoot=fileURLToPath(new URL('../scratch-gui/',import.meta.url));
  const entries=vm.runInNewContext('('+source.slice(array.start,array.end)+')',{path,__dirname:guiRoot});
  const current=entries.findIndex(entry=>entry.directory===path.join(guiRoot,'build','sketchforge'));
  const historical=entries.findIndex(entry=>entry.directory===path.join(guiRoot,'public'));
  assert.ok(current>=0&&historical>current);
});
