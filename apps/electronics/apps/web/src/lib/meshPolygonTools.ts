import { ShapeUtils, Vector2, Vector3 } from 'three';
import { cloneEditableMesh, faceBoundary, meshPoint, type EditableMesh, type EditEdge } from './editableMesh';

export const edgeKey = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;
const EPS = 1e-5;
export function polygonLoop(mesh: EditableMesh, face: number): number[] {
  const edges = faceBoundary(mesh, face), next = new Map(edges.map(e => [e.a, e.b]));
  if (!edges.length || next.size !== edges.length) throw new Error('La cara tiene un contorno ambiguo');
  const loop = [edges[0].a]; let id = next.get(loop[0])!;
  while (id !== loop[0] && !loop.includes(id) && next.has(id)) { loop.push(id); id = next.get(id)!; }
  if (id !== loop[0] || loop.length !== edges.length) throw new Error('Esta herramienta requiere caras sin agujeros');
  return loop;
}
export function polygonNormal(points: Vector3[]) {
  const n = new Vector3(); points.forEach((a, i) => { const b = points[(i + 1) % points.length]; n.x += (a.y - b.y) * (a.z + b.z); n.y += (a.z - b.z) * (a.x + b.x); n.z += (a.x - b.x) * (a.y + b.y); });
  if (n.lengthSq() < 1e-16) throw new Error('Contorno degenerado'); return n.normalize();
}
export function requirePlanar(points: Vector3[]) {
  const n = polygonNormal(points), size = Math.max(1, ...points.map(p => p.distanceTo(points[0])));
  if (points.some(p => Math.abs(n.dot(p.clone().sub(points[0]))) > size * 1e-5)) throw new Error('La herramienta requiere una cara plana');
  return n;
}
function requireConvex(points: Vector3[], n: Vector3) {
  if (points.some((a, i) => points[(i + 1) % points.length].clone().sub(a).cross(points[(i + 2) % points.length].clone().sub(points[(i + 1) % points.length])).dot(n) < -EPS)) throw new Error('Esta operación requiere caras convexas');
}
export function fromPolygons(positions: number[], polygons: number[][], compact = true): EditableMesh {
  const indices: number[] = [], faces: number[][] = [];
  for (const loop of polygons) {
    if (loop.length < 3) continue;
    const points = loop.map(id => new Vector3().fromArray(positions, id * 3)), n = polygonNormal(points), u = points[1].clone().sub(points[0]).normalize(), v = n.clone().cross(u);
    const flat = points.map(p => { const d = p.clone().sub(points[0]); return new Vector2(d.dot(u), d.dot(v)); });
    const triangles = ShapeUtils.triangulateShape(flat, []), group: number[] = [];
    if (triangles.length !== loop.length - 2) throw new Error('No se puede triangular el contorno sin perder geometría');
    for (const tri of triangles) {
      const ids = tri.map(i => loop[i]); const [a,b,c] = ids.map(id => new Vector3().fromArray(positions, id*3));
      if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-16) throw new Error('La operación produciría triángulos degenerados');
      group.push(indices.length / 3); indices.push(...ids);
    }
    faces.push(group);
  }
  const result = { positions: new Float32Array(positions), indices: new Uint32Array(indices), faces }; return compact ? compactMesh(result) : result;
}
export function compactMesh(mesh: EditableMesh): EditableMesh {
  const used = [...new Set(mesh.indices)], remap = new Map(used.map((id, i) => [id,i]));
  return { positions: new Float32Array(used.flatMap(id => Array.from(mesh.positions.slice(id*3,id*3+3)))), indices: new Uint32Array(Array.from(mesh.indices, id => remap.get(id)!)), faces: mesh.faces.map(f => [...f]) };
}

/** Cut a planar face along the line through two surface points. Propagate
 * split points into adjacent triangles, including non-planar neighboring faces. */
export function knifeFace(mesh: EditableMesh, faceId: number, start: Vector3, end: Vector3): EditableMesh {
  const loop = polygonLoop(mesh, faceId), points = loop.map(id => meshPoint(mesh,id)), normal = requirePlanar(points);
  requireConvex(points, normal);
  const cutNormal = end.clone().sub(start).cross(normal).normalize();
  if (start.distanceTo(end) < EPS) throw new Error('Marca dos puntos distintos');
  const positions = Array.from(mesh.positions), insertions = new Map<string, number>(), positive: number[] = [], negative: number[] = [];
  loop.forEach((a,i) => {
    const b = loop[(i+1)%loop.length], pa = meshPoint(mesh,a), pb = meshPoint(mesh,b), da = pa.clone().sub(start).dot(cutNormal), db = pb.clone().sub(start).dot(cutNormal);
    if (da >= -EPS) positive.push(a); if (da <= EPS) negative.push(a);
    if (da * db < -EPS * EPS) { const id = positions.length/3; positions.push(...pa.lerp(pb, da/(da-db)).toArray()); insertions.set(edgeKey(a,b),id); positive.push(id); negative.push(id); }
  });
  if (positive.length < 3 || negative.length < 3) throw new Error('El corte debe atravesar el interior de la cara');
  const indices: number[] = [], faces: number[][] = [];
  mesh.faces.forEach((face,id) => {
    if (id === faceId) return;
    const group: number[] = [];
    face.forEach(t => {
      const tri = Array.from(mesh.indices.slice(t*3,t*3+3)); let tris = [tri];
      insertions.forEach((mid,key) => { const [a,b] = key.split(':').map(Number); tris = tris.flatMap(tr => { const j = tr.findIndex((x,j) => edgeKey(x,tr[(j+1)%3]) === edgeKey(a,b)); return j < 0 ? [tr] : [[tr[j],mid,tr[(j+2)%3]], [mid,tr[(j+1)%3],tr[(j+2)%3]]]; }); });
      tris.forEach(tr => { group.push(indices.length/3); indices.push(...tr); });
    }); faces.push(group);
  });
  // Keep new vertex identifiers stable until both halves have been emitted.
  for (const half of [positive,negative]) {
    const n=normal, u=points[1].clone().sub(points[0]).normalize(), v=n.clone().cross(u);
    const flat=half.map(id=>{const p=new Vector3().fromArray(positions,id*3).sub(points[0]);return new Vector2(p.dot(u),p.dot(v));});
    const group:number[]=[]; ShapeUtils.triangulateShape(flat,[]).forEach(tr=>{group.push(indices.length/3);indices.push(...tr.map(i=>half[i]));}); faces.push(group);
  }
  return compactMesh({positions:new Float32Array(positions),indices:new Uint32Array(indices),faces});
}

/** Preserve original triangulation on untouched (possibly bent) polygons. */
function replacePolygons(mesh: EditableMesh, positions: number[], replacements: Map<number, number[][]>, splits = new Map<string, number>()): EditableMesh {
  const indices: number[] = [], faces: number[][] = [];
  mesh.faces.forEach((face,id) => {
    if (replacements.has(id)) return;
    const group: number[] = [];
    face.forEach(t => {
      let triangles = [Array.from(mesh.indices.slice(t*3,t*3+3))];
      for (const [key,mid] of splits) triangles = triangles.flatMap(tr => {
        const j=tr.findIndex((a,j)=>edgeKey(a,tr[(j+1)%3])===key);
        return j<0?[tr]:[[tr[j],mid,tr[(j+2)%3]],[mid,tr[(j+1)%3],tr[(j+2)%3]]];
      });
      triangles.forEach(tr=>{group.push(indices.length/3);indices.push(...tr);});
    });faces.push(group);
  });
  const changed=fromPolygons(positions,[...replacements.values()].flat(),false), offset=indices.length/3;
  for(const index of changed.indices)indices.push(index);
  changed.faces.forEach(face=>faces.push(face.map(t=>t+offset)));
  return compactMesh({positions:new Float32Array(positions),indices:new Uint32Array(indices),faces});
}

export function loopCut(mesh: EditableMesh, seed: EditEdge, fraction: number): EditableMesh {
  if (!(fraction > .001 && fraction < .999)) throw new Error('Posición del corte: entre 0,1 y 99,9 %');
  const loops=mesh.faces.map((_,id)=>polygonLoop(mesh,id)), splits=new Map<string,{a:number;b:number;t:number}>(), crossed=new Map<number,[string,string]>();
  const queue=[{a:seed.a,b:seed.b,t:fraction}];
  for(let q=0;q<queue.length;q++) {
    const entry=queue[q], key=edgeKey(entry.a,entry.b); if(splits.has(key))continue; splits.set(key,entry);
    loops.forEach((loop,id)=>{const i=loop.findIndex((a,i)=>edgeKey(a,loop[(i+1)%loop.length])===key);if(i<0||loop.length!==4||crossed.has(id))return;
      requirePlanar(loop.map(v=>meshPoint(mesh,v)));
      const t=loop[i]===entry.a?entry.t:1-entry.t, opposite={a:loop[(i+3)%4],b:loop[(i+2)%4],t};
      const other=edgeKey(opposite.a,opposite.b);crossed.set(id,[key,other]);queue.push(opposite);
    });
  }
  if(!crossed.size)throw new Error('Selecciona una arista de una banda de cuadriláteros');
  const positions=Array.from(mesh.positions), mids=new Map<string,number>();
  splits.forEach((e,key)=>{mids.set(key,positions.length/3);positions.push(...meshPoint(mesh,e.a).lerp(meshPoint(mesh,e.b),e.t).toArray());});
  const replacements=new Map<number,number[][]>();
  loops.forEach((loop,id)=>{
    const expanded=loop.flatMap((a,i)=>{const mid=mids.get(edgeKey(a,loop[(i+1)%loop.length]));return mid===undefined?[a]:[a,mid];});
    const cut=crossed.get(id);if(!cut)return;
    let a=expanded.indexOf(mids.get(cut[0])!),b=expanded.indexOf(mids.get(cut[1])!);if(a>b)[a,b]=[b,a];replacements.set(id,[expanded.slice(a,b+1),[...expanded.slice(b),...expanded.slice(0,a+1)]]);
  });
  return replacePolygons(mesh,positions,replacements,mids);
}

export function insetFaces(mesh: EditableMesh, selected: ReadonlySet<number>, distance: number): EditableMesh {
  if (!(distance>0)) throw new Error('El borde interior debe medir más de cero');
  const positions=Array.from(mesh.positions), replacements=new Map<number,number[][]>();
  mesh.faces.forEach((_,id)=>{
    if(!selected.has(id))return;const loop=polygonLoop(mesh,id),polygons:number[][]=[];replacements.set(id,polygons);
    const points=loop.map(v=>meshPoint(mesh,v)), n=requirePlanar(points);requireConvex(points,n);
    const inward=points.map((a,i)=>n.clone().cross(points[(i+1)%points.length].clone().sub(a).normalize()));
    const inner=points.map((p,i)=>{const prev=inward[(i+points.length-1)%points.length],curr=inward[i],sum=prev.clone().add(curr),denom=sum.dot(curr);if(denom<1e-6)throw new Error('Esquina demasiado cerrada');return p.clone().addScaledVector(sum,distance/denom);});
    if(inner.some(p=>inward.some((v,i)=>p.clone().sub(points[i]).dot(v)<distance-EPS)))throw new Error('El borde es demasiado ancho para esta cara');
    if(polygonNormal(inner).dot(n)<.99)throw new Error('El borde interior se cruza');
    const ids=inner.map(p=>{const id=positions.length/3;positions.push(...p.toArray());return id;});polygons.push(ids);
    loop.forEach((a,i)=>{const j=(i+1)%loop.length;polygons.push([a,loop[j],ids[j],ids[i]]);});
  });return replacePolygons(mesh,positions,replacements);
}

/** Closed convex solids: clipping by edge planes creates joined bevel strips
 * and corner caps without disconnected overlay geometry. */
export function bevelEdges(mesh: EditableMesh, selected: EditEdge[], width: number, segments=1): EditableMesh {
  if(!(width>0)||!selected.length)throw new Error('Selecciona aristas y un ancho mayor que cero');
  const loops=mesh.faces.map((_,id)=>polygonLoop(mesh,id)), points=loops.map(loop=>loop.map(id=>meshPoint(mesh,id))), normals=points.map(requirePlanar);
  const all=Array.from({length:mesh.positions.length/3},(_,id)=>meshPoint(mesh,id));
  normals.forEach((n,i)=>{if(all.some(p=>p.clone().sub(points[i][0]).dot(n)>EPS))throw new Error('El bisel actual requiere un sólido convexo con normales hacia fuera');});
  const owners=new Map<string,number[]>();loops.forEach((loop,id)=>loop.forEach((a,i)=>{const key=edgeKey(a,loop[(i+1)%loop.length]),list=owners.get(key)??[];list.push(id);owners.set(key,list);}));
  if([...owners.values()].some(ids=>ids.length!==2))throw new Error('El bisel requiere una superficie cerrada');
  let polys=points;segments=Math.max(1,Math.min(8,Math.round(segments)));
  for(const edge of selected){
    const ids=owners.get(edgeKey(edge.a,edge.b));if(!ids||ids.length!==2)throw new Error('Arista no válida');
    const n1=normals[ids[0]],n2=normals[ids[1]],dot=n1.dot(n2);if(dot>.99999)throw new Error('Selecciona aristas con ángulo, no divisiones planas');
    const angle=Math.acos(Math.max(-1,Math.min(1,dot))), bisector=n1.clone().add(n2).normalize(), origin=meshPoint(mesh,edge.a);
    for(let s=0;s<segments;s++){
      const t=(s+.5)/segments, n=n1.clone().multiplyScalar(Math.sin((1-t)*angle)).addScaledVector(n2,Math.sin(t*angle)).normalize();
      const radius=width/Math.tan(angle/2), center=origin.clone().addScaledVector(bisector,-radius/Math.cos(angle/2));
      const offset=segments===1?origin.dot(n)-width*Math.sin(angle/2):center.dot(n)+radius*Math.cos(angle/(2*segments));
      const cap:Vector3[]=[], next:Vector3[][]=[];
      for(const poly of polys){const out:Vector3[]=[];poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length],da=a.dot(n)-offset,db=b.dot(n)-offset;if(da<=EPS)out.push(a);if(Math.abs(da)<=EPS&&!cap.some(v=>v.distanceToSquared(a)<EPS*EPS))cap.push(a);if(da*db< -EPS*EPS){const p=a.clone().lerp(b,da/(da-db));out.push(p);if(!cap.some(v=>v.distanceToSquared(p)<EPS*EPS))cap.push(p);}});if(out.length>=3)next.push(out);}
      if(cap.length>=3){const c=cap.reduce((a,b)=>a.add(b),new Vector3()).divideScalar(cap.length),u=cap[0].clone().sub(c).normalize(),v=n.clone().cross(u);cap.sort((a,b)=>Math.atan2(a.clone().sub(c).dot(v),a.clone().sub(c).dot(u))-Math.atan2(b.clone().sub(c).dot(v),b.clone().sub(c).dot(u)));next.push(cap);}
      polys=next;
    }
  }
  if(polys.length<4)throw new Error('El bisel es demasiado ancho');
  const positions:number[]=[], lookup=new Map<string,number>();
  const polygons=polys.map(poly=>poly.map(p=>{const key=p.toArray().map(v=>Math.round(v/1e-5)).join(':');if(!lookup.has(key)){lookup.set(key,positions.length/3);positions.push(...p.toArray());}return lookup.get(key)!;}));
  return fromPolygons(positions,polygons);
}

export function weldVertices(mesh: EditableMesh, selected: ReadonlySet<number>, tolerance: number | null): EditableMesh {
  if(selected.size<2)throw new Error('Selecciona al menos dos vértices');
  const result=cloneEditableMesh(mesh), ids=[...selected], parents=new Map(ids.map(id=>[id,id]));
  const root=(id:number):number=>{while(parents.get(id)!==id){parents.set(id,parents.get(parents.get(id)!)!);id=parents.get(id)!;}return id;};
  if(tolerance===null)ids.forEach(id=>parents.set(id,ids[0]));
  else {
    if(!(tolerance>0))throw new Error('La tolerancia debe ser mayor que cero');
    const buckets=new Map<string,number[]>(),key=(x:number,y:number,z:number)=>`${x}:${y}:${z}`,point=new Vector3(),other=new Vector3();
    for(const id of ids){
      point.fromArray(mesh.positions,id*3);const [x,y,z]=point.toArray().map(v=>Math.floor(v/tolerance));let duplicate=false;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)for(const candidate of buckets.get(key(x+dx,y+dy,z+dz))??[]){
        const distance=other.fromArray(mesh.positions,candidate*3).distanceToSquared(point);
        if(distance<=tolerance*tolerance)parents.set(root(id),root(candidate));
        if(distance<1e-20)duplicate=true;
      }
      if(!duplicate){const k=key(x,y,z),list=buckets.get(k)??[];list.push(id);buckets.set(k,list);}
    }
  }

  const groups=new Map<number,number[]>();ids.forEach(id=>{const key=root(id),list=groups.get(key)??[];list.push(id);groups.set(key,list);});
  if(groups.size===ids.length)throw new Error('No hay vértices dentro de la tolerancia');
  groups.forEach((members,id)=>members.reduce((p,v)=>p.add(meshPoint(mesh,v)),new Vector3()).divideScalar(members.length).toArray(result.positions,id*3));
  const indices:number[]=[],faces:number[][]=[],seen=new Set<string>();
  mesh.faces.forEach(face=>{const group:number[]=[];face.forEach(t=>{const tri=Array.from(mesh.indices.slice(t*3,t*3+3),id=>parents.has(id)?root(id):id),key=[...tri].sort((a,b)=>a-b).join(':');const [a,b,c]=tri.map(id=>meshPoint(result,id));if(new Set(tri).size<3||seen.has(key)||b.sub(a).cross(c.sub(a)).lengthSq()<1e-14)return;seen.add(key);group.push(indices.length/3);indices.push(...tri);});if(group.length)faces.push(group);});
  if(!indices.length)throw new Error('Soldar eliminaría toda la superficie');result.indices=new Uint32Array(indices);result.faces=faces;return compactMesh(result);
}

export function dissolveEdges(mesh: EditableMesh, edges: EditEdge[]): EditableMesh {
  const result=cloneEditableMesh(mesh), parents=mesh.faces.map((_,id)=>id), root=(id:number):number=>parents[id]===id?id:root(parents[id]);let changes=0;
  for(const edge of edges){const owners=mesh.faces.map((_,id)=>id).filter(id=>faceBoundary(mesh,id).some(e=>edgeKey(e.a,e.b)===edgeKey(edge.a,edge.b)));if(owners.length!==2)throw new Error('Solo se pueden disolver aristas entre dos caras');
    const [a,b]=owners,pa=polygonLoop(mesh,a).map(id=>meshPoint(mesh,id)),pb=polygonLoop(mesh,b).map(id=>meshPoint(mesh,id)),n=requirePlanar(pa);
    if(n.dot(requirePlanar(pb))<.99999||pb.some(p=>Math.abs(p.clone().sub(pa[0]).dot(n))>EPS))throw new Error('Disolver requiere caras coplanares para conservar la superficie');parents[root(b)]=root(a);changes++;
  }
  if(!changes)throw new Error('Selecciona aristas para disolver');const groups=new Map<number,number[]>();mesh.faces.forEach((face,id)=>{const key=root(id),list=groups.get(key)??[];list.push(...face);groups.set(key,list);});result.faces=[...groups.values()];return result;
}
