import {it,expect} from 'vitest';
import {BoxGeometry} from 'three';
import {createEditableMesh,editableEdges} from '@/lib/editableMesh';
import {loopCut,insetFaces,bevelEdges} from '@/lib/meshPolygonTools';
import {editableMeshToShape} from '@/lib/editableMeshShape';
import type {WorkplaneShape} from '@/types/sketchforge';
it('preserves cut, inset and rounded bevel topology when converted back into a piece',()=>{
  const g=new BoxGeometry(20,20,20),mesh=createEditableMesh(new Float32Array(g.attributes.position.array),new Uint32Array(g.index!.array));
  const source={id:'mesh',name:'Mesh',kind:'box',color:'red',x:0,z:0,rotation:0,size:20,height:20} as WorkplaneShape;
  for(const edited of [loopCut(mesh,editableEdges(mesh)[0],.25),insetFaces(mesh,new Set([0]),2),bevelEdges(mesh,editableEdges(mesh),2,3)]){
    const shape=editableMeshToShape(source,edited),local=new Float32Array(shape.importedMesh!.positions),indices=new Uint32Array(Array.from({length:local.length/3},(_,i)=>i));
    const restored=createEditableMesh(local,indices,shape.importedMesh!.editFaceGroups);
    expect(restored.faces).toEqual(edited.faces);expect(restored.positions.length).toBe(edited.positions.length);expect(restored.indices.length).toBe(edited.indices.length);
    for(let i=0;i<edited.indices.length;i++){const original=edited.indices[i],target=restored.indices[i];expect(restored.positions[target*3]+shape.x).toBeCloseTo(edited.positions[original*3],4);expect(restored.positions[target*3+1]+shape.elevation!).toBeCloseTo(edited.positions[original*3+1],4);expect(restored.positions[target*3+2]+shape.z).toBeCloseTo(edited.positions[original*3+2],4);}
  }
});
