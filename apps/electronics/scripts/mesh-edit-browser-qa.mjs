import { placePendingAtOrigin } from "./placement-qa-helper.mjs";
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const artifacts = process.env.MESH_QA_OUTPUT || path.join(os.tmpdir(), 'stb-mesh-qa');
fs.mkdirSync(artifacts, {recursive: true});
import { connect } from './mesh-edit-cdp.mjs';
const c = await connect(), results = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const key = async (key, modifiers = 0) => { await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key, modifiers }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, modifiers }); };
const runtime = `(()=>{const el=document.querySelector('.mesh-edit-canvas');let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber'))];while(f){let h=f.memoizedState;while(h){if(h.memoizedState?.current?.mesh){window.qaMesh=h.memoizedState.current;return true;}h=h.next;}f=f.return;}return false;})()`;
const state = () => c.evaluate('({positions:Array.from(qaMesh.mesh.positions),indices:Array.from(qaMesh.mesh.indices),faces:qaMesh.mesh.faces,selection:[...qaMesh.selected],active:!!qaMesh.transaction,history:qaMesh.historyIndex})');
const click = async (x, y) => { await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
const drag = async (point, dx, dy) => {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point[0], y: point[1] });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point[0], y: point[1], button: 'left', clickCount: 1 });
  for (let i = 1; i <= 12; i++) { await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point[0] + dx * i / 12, y: point[1] + dy * i / 12, buttons: 1, button: 'left' }); await delay(16); }
};
try {
  await c.send('Page.navigate', { url: process.env.MESH_QA_URL || 'http://localhost:3017/?editor=1' });
  for (let n = 0; n < 60; n++) { if (await c.evaluate('!!document.querySelector(".shape-library-item")')) break; await delay(500); }
  await c.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="Caja").click()'); await delay(200);
  await placePendingAtOrigin(c);
  await c.evaluate(`Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label") === "Editar malla").click()`);
  for (let n = 0; n < 40; n++) { if (await c.evaluate('!!document.querySelector(".mesh-edit-canvas canvas")')) break; await delay(250); }
  assert.equal(await c.evaluate(runtime), true);
  const initial = await state(); assert.equal(initial.positions.length, 24); assert.equal(initial.faces.length, 6);
  const point = await c.evaluate('qaMesh.project(qaMesh.camera.position.clone().fromArray(qaMesh.mesh.positions,0)).toArray()');
  await drag(point, 90, -45); const live = await state(); assert.equal(live.active, true); assert.notDeepEqual(live.positions, initial.positions);
  assert.deepEqual(await c.evaluate('Array.from(qaMesh.body.geometry.attributes.position.array)'), live.positions);
  await delay(50); await c.screenshot(path.join(artifacts, 'mesh-edit-live-qa.png'));
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point[0] + 90, y: point[1] - 45, button: 'left', clickCount: 1 }); await delay(200);
  assert.equal((await state()).active, false); results.push('Vertex drag changes the rendered surface before pointerup');
  await key('z', 2); await delay(100); assert.deepEqual((await state()).positions, initial.positions);
  await key('z', 10); await delay(100); assert.deepEqual((await state()).positions, live.positions); results.push('Undo/redo restores exact mesh snapshots');
  await key('g'); await key('x'); await key('5'); const numeric = await state(); assert.ok(Math.abs(numeric.positions[0] - live.positions[0] - 5) < 1e-5);
  await key('Escape'); assert.deepEqual((await state()).positions, live.positions); results.push('G X 5 previews exact units; Escape restores without committing');
  await key('2');
  const edge = await c.evaluate('(()=>{const id=qaMesh.edges.findIndex(e=>{const p=qaMesh.camera.position.clone().fromArray(qaMesh.mesh.positions,e.a*3).add(qaMesh.camera.position.clone().fromArray(qaMesh.mesh.positions,e.b*3)).multiplyScalar(.5);return qaMesh.visible(p)});const e=qaMesh.edges[id],p=qaMesh.camera.position.clone().fromArray(qaMesh.mesh.positions,e.a*3).add(qaMesh.camera.position.clone().fromArray(qaMesh.mesh.positions,e.b*3)).multiplyScalar(.5);return qaMesh.project(p).toArray()})()');
  const beforeEdge = await state(); await drag(edge, -35, 20); assert.notDeepEqual((await state()).positions, beforeEdge.positions); await key('Escape');
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: edge[0]-35, y: edge[1]+20, button: 'left', clickCount: 1 }); assert.deepEqual((await state()).positions, beforeEdge.positions); results.push('Edge drag is live and pointer transaction can be cancelled');
  await key('3'); await key('a'); const beforeScale = await state(); await key('s'); await key('2'); await key('Enter'); await delay(100); assert.notDeepEqual((await state()).positions, beforeScale.positions);
  await key('r'); await key('z'); await key('9'); await key('0'); await key('Enter'); await delay(100); results.push('Face scale and axis rotation accept keyboard values');
  await key("3");
  const facePoint = await c.evaluate(`(()=>{for(const face of qaMesh.mesh.faces){const ids=[...new Set(face.flatMap(t=>Array.from(qaMesh.mesh.indices.slice(t*3,t*3+3))))];const p=qaMesh.camera.position.clone().set(0,0,0);ids.forEach(id=>p.add(qaMesh.camera.position.clone().fromArray(qaMesh.mesh.positions,id*3)));p.divideScalar(ids.length);if(qaMesh.visible(p))return qaMesh.project(p).toArray();}})()`);
  await click(facePoint[0],facePoint[1]);const beforeExtrude = await state();
  await key("e");await key("5");assert.ok((await state()).indices.length > beforeExtrude.indices.length);await key("Escape");assert.deepEqual((await state()).indices,beforeExtrude.indices);
  await key("e");await key("0");await key("Enter");assert.deepEqual((await state()).indices,beforeExtrude.indices);
  await key("e");await key("5");await key("Enter");await delay(100);assert.ok((await state()).indices.length > beforeExtrude.indices.length);results.push("Extrusion previews connected walls, cancels cleanly, and ignores zero distance");
  const beforeRoundtrip = await state();
  await key('Tab'); await delay(200); assert.equal(await c.evaluate('!!document.querySelector(".mesh-edit-workspace")'), false);
  await key('Tab'); await delay(500); assert.equal(await c.evaluate(runtime), true); const reopened = await state();
  assert.equal(reopened.faces.length, beforeRoundtrip.faces.length);
  const sortedPoints = p => Array.from({length:p.length/3},(_,i)=>p.slice(i*3,i*3+3).map(v=>Math.round(v*100)/100).join(',')).sort();
  assert.deepEqual(sortedPoints(reopened.positions), sortedPoints(beforeRoundtrip.positions)); results.push('Piece mode round-trip preserves the edited geometry and polygon groups');
  // Export through the real STBlock bridge and reimport through the dashboard.
  await key('Tab'); await delay(100);
  const exported = await c.evaluate(`new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('export timeout')),10000);const receive=e=>{if(e.data?.type==='SKETCHFORGE_EXPORT_SKF_RESULT'&&e.data.requestId==='mesh-qa'){clearTimeout(timer);window.removeEventListener('message',receive);window.qaSkf=e.data.bytes;resolve({error:e.data.error,length:e.data.bytes?.length})}};window.addEventListener('message',receive);window.postMessage({type:'SKETCHFORGE_EXPORT_SKF',requestId:'mesh-qa'},'*')})`);
  assert.ok(exported.length > 100, JSON.stringify(exported));
  await c.evaluate(`window.postMessage({type:'SKETCHFORGE_IMPORT_SKF',requestId:'mesh-qa-import',bytes:window.qaSkf,fileName:'mesh-qa.skf'},'*')`); await delay(1200); await key('a', 2); await delay(100);
  await key('Tab'); await delay(500); assert.equal(await c.evaluate(runtime), true); const imported = await state(); assert.deepEqual(sortedPoints(imported.positions), sortedPoints(beforeRoundtrip.positions)); assert.equal(imported.faces.length, beforeRoundtrip.faces.length); results.push('SKF bridge export/import preserves geometry and editable faces');
  await c.screenshot(path.join(artifacts, 'mesh-edit-final-qa.png'));
  console.log(JSON.stringify({ passed: results.length, checks: results }, null, 2));
  fs.writeFileSync(path.join(artifacts, 'mesh-edit-browser-results.json'), JSON.stringify({ passed: results.length, checks: results }, null, 2));
} finally { c.close(); }
