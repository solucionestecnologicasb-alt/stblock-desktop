import assert from 'node:assert/strict';
import { connect } from './mesh-edit-cdp.mjs';
const c = await connect();
const key = async (key, modifiers = 0) => { await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key, modifiers }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, modifiers }); };
const state = () => c.evaluate('({p:qaMesh.camera.position.toArray(),target:qaMesh.orbit.target.toArray(),vertices:qaMesh.mesh.positions.length/3,triangles:qaMesh.mesh.indices.length/3,faces:qaMesh.mesh.faces.length,selected:qaMesh.selected.size})');
const action = label => c.evaluate(`(()=>{const b=[...document.querySelectorAll('.mesh-edit-menus button')].find(b=>b.textContent.startsWith(${JSON.stringify(label)}));if(!b || b.disabled)throw Error('Unavailable action');b.click();})()`);
try {
  assert.equal(await c.evaluate('!!window.qaMesh && !!document.querySelector(".mesh-edit-menus")'), true, 'Run mesh-edit-browser-qa first');
  const before = await state();
  const rect = await c.evaluate('(()=>{const r=qaMesh.renderer.domElement.getBoundingClientRect();return {x:r.left+r.width*.6,y:r.top+r.height*.6}})()');
  const drag = async modifiers => { await c.send('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'right',clickCount:1,modifiers}); for(let i=1;i<=10;i++) await c.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+i*8,y:rect.y+i*3,button:'right',buttons:2,modifiers}); await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+80,y:rect.y+30,button:'right',clickCount:1,modifiers}); };
  await drag(0); const rotated=await state(); assert.notDeepEqual(rotated.p,before.p); assert.deepEqual(rotated.target,before.target);
  await drag(8); assert.notDeepEqual((await state()).target,rotated.target);
  await action('Frontal'); const front=await state(); assert.ok(Math.abs(front.p[0]-front.target[0])<1e-6); assert.ok(Math.abs(front.p[1]-front.target[1])<1e-6);
  await key('1'); await key('a'); await key('i',2); assert.equal((await state()).selected,0); await key('i',2); assert.equal((await state()).selected,before.vertices);
  await key('3'); await key('a'); const original=await state(); await action('Insertar puntos'); const inserted=await state(); assert.equal(inserted.vertices,original.vertices+original.triangles); assert.equal(inserted.triangles,original.triangles*3);
  await key('z',2); assert.equal((await state()).vertices,original.vertices); assert.equal((await state()).triangles,original.triangles);
  await key('3'); await key('a'); await key('t',2); assert.equal((await state()).faces,original.triangles); await key('z',2);
  console.log(JSON.stringify({passed:6,checks:['Right drag orbits with fixed target','Shift+right pans','Front view aligns around piece','Ctrl+I inverts multi-selection','Surface vertex insertion and undo','Ctrl+T triangulates and undo']},null,2));
} finally { c.close(); }
