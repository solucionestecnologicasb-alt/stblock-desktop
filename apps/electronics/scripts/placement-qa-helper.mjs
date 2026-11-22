// Library items now enter placement mode; explicitly place at the origin for
// mesh regression fixtures which need the same world coordinates as before.
export async function placePendingAtOrigin(c) {
  const point=await c.evaluate(`(()=>{if(!document.querySelector('.placement-instructions'))return null;const host=document.querySelector('.three-workplane-host');let f=host[Object.keys(host).find(k=>k.startsWith('__reactFiber'))];while(f){let h=f.memoizedState;while(h){const state=h.memoizedState?.current;if(state?.shapeLayer&&state.renderer){state.camera.updateMatrixWorld();const r=state.renderer.domElement.getBoundingClientRect(),p=state.camera.position.clone().set(0,0,0).project(state.camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}h=h.next;}f=f.return;}throw Error('Viewport unavailable')})()`);
  if(!point)return;
  await c.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
  await c.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  await new Promise(resolve=>setTimeout(resolve,150));
}
