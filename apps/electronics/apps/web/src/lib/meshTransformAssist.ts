import { Matrix4, Vector3 } from 'three';
import type { EditEdge } from './editableMesh';
export type AssistSettings = { snap: 'off' | 'grid' | 'vertex' | 'edge'; step: number; proportional: boolean; radius: number; symmetry: 'off' | 'x' | 'y' | 'z' };
export const defaultAssist: AssistSettings = { snap:'off', step:1, proportional:false, radius:10, symmetry:'off' };
type KD = { id:number; axis:number; left:KD|null; right:KD|null };
function kdTree(ids:number[], p:Float32Array, depth=0):KD|null { if(!ids.length)return null;const axis=depth%3;ids.sort((a,b)=>p[a*3+axis]-p[b*3+axis]);const mid=ids.length>>1;return {id:ids[mid],axis,left:kdTree(ids.slice(0,mid),p,depth+1),right:kdTree(ids.slice(mid+1),p,depth+1)}; }
function nearest(node:KD|null,p:Float32Array,q:Vector3,best:number):number {if(!node)return best;const dx=p[node.id*3]-q.x,dy=p[node.id*3+1]-q.y,dz=p[node.id*3+2]-q.z;best=Math.min(best,dx*dx+dy*dy+dz*dz);const delta=q.getComponent(node.axis)-p[node.id*3+node.axis];best=nearest(delta<0?node.left:node.right,p,q,best);return delta*delta<best?nearest(delta<0?node.right:node.left,p,q,best):best;}
export function influenceWeights(base:Float32Array, selected:readonly number[], radius:number):Float32Array {
  const weights=new Float32Array(base.length/3),chosen=new Set(selected),tree=radius>0?kdTree([...selected],base):null,p=new Vector3();
  for(let id=0;id<weights.length;id++){if(chosen.has(id)){weights[id]=1;continue;}if(!tree)continue;const d=Math.sqrt(nearest(tree,base,p.fromArray(base,id*3),radius*radius))/radius;weights[id]=d>=1?0:1-d*d*(3-2*d);}
  return weights;
}
export function symmetryPairs(base:Float32Array,axis:'x'|'y'|'z',plane:number):Array<[number,number]> {
  const offset={x:0,y:1,z:2}[axis],epsilon=1e-4,grid=new Map<string,number[]>(),key=(x:number,y:number,z:number)=>`${x}:${y}:${z}`;
  for(let id=0;id<base.length/3;id++){const k=key(Math.floor(base[id*3]/epsilon),Math.floor(base[id*3+1]/epsilon),Math.floor(base[id*3+2]/epsilon)),ids=grid.get(k)??[];ids.push(id);grid.set(k,ids);}
  const result:Array<[number,number]>=[],p=new Vector3();
  for(let id=0;id<base.length/3;id++){if(base[id*3+offset]<plane-epsilon)continue;p.fromArray(base,id*3);p.setComponent(offset,2*plane-p.getComponent(offset));const cells=p.toArray().map(v=>Math.floor(v/epsilon));let match=-1,best=epsilon*epsilon;
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const other of grid.get(key(cells[0]+x,cells[1]+y,cells[2]+z))??[]){const d=new Vector3().fromArray(base,other*3).distanceToSquared(p);if(d<=best){best=d;match=other;}}
    if(match>=0)result.push([id,match]);
  }return result;
}
export function assistedTransform(base:Float32Array,output:Float32Array,matrix:Matrix4,weights:Float32Array,pairs:Array<[number,number]>,axis:'off'|'x'|'y'|'z') {
  const p=new Vector3(),q=new Vector3(); output.set(base);
  for(let id=0;id<weights.length;id++)if(weights[id]>0){p.fromArray(base,id*3);q.copy(p).applyMatrix4(matrix);p.lerp(q,weights[id]).toArray(output,id*3);}
  if(axis==='off')return;const offset={x:0,y:1,z:2}[axis];
  for(const [positive,negative] of pairs){if(positive===negative){output[positive*3+offset]=base[positive*3+offset];continue;}const source=weights[positive]>=weights[negative]?positive:negative,target=source===positive?negative:positive;if(!weights[source])continue;for(let a=0;a<3;a++)output[target*3+a]=base[target*3+a]+(output[source*3+a]-base[source*3+a])*(a===offset?-1:1);}
}
export function snapPosition(point:Vector3,base:Float32Array,edges:EditEdge[],excluded:ReadonlySet<number>,mode:AssistSettings['snap'],step:number,maxDistance:number):Vector3 {
  if(mode==='grid')return point.clone().divideScalar(step).round().multiplyScalar(step);
  const best=point.clone();let distance=maxDistance*maxDistance;const a=new Vector3(),b=new Vector3(),q=new Vector3();
  const consider=(p:Vector3)=>{const d=p.distanceToSquared(point);if(d<distance){best.copy(p);distance=d;}};
  if(mode==='vertex')for(let id=0;id<base.length/3;id++)if(!excluded.has(id))consider(a.fromArray(base,id*3));
  if(mode==='edge')for(const e of edges)if(!excluded.has(e.a)&&!excluded.has(e.b)){a.fromArray(base,e.a*3);b.fromArray(base,e.b*3).sub(a);const t=Math.max(0,Math.min(1,q.copy(point).sub(a).dot(b)/(b.lengthSq()||1)));consider(q.copy(a).addScaledVector(b,t));}
  return best;
}
