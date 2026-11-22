import {beforeAll, describe, expect, it} from "vitest";
import manifoldModule, {type ManifoldToplevel} from "manifold-3d";
import {cutSolidByPlanes, cutFragmentToShape, cutPlaneNormal, cutPlaneOffsets, type PlaneCutSettings, type CutSolid} from "@/lib/planeCut";
import type {WorkplaneShape} from "@/types/sketchforge";

const settings = (patch: Partial<PlaneCutSettings> = {}): PlaneCutSettings => ({position:[0,0,0], rotation:[-90,0,0], keep:"both", count:1, spacing:2,
  kerf:0, separation:0, splitDisconnected:false, keepOriginals:false, union:false, gizmo:"translate", snap:0, ...patch});

describe("closed plane cuts with the real Manifold kernel", () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {runtime = await manifoldModule(); runtime.setup();});
  const box = () => runtime.Manifold.cube([10,10,10], true);
  const volume = (fragments: ReturnType<typeof cutSolidByPlanes>) => fragments.reduce((sum,f) => sum + f.volume,0);
  const closed = (positions: number[]) => {
    const mesh = new runtime.Mesh({numProp:3, vertProperties:Float32Array.from(positions), triVerts:Uint32Array.from({length:positions.length/3},(_,i)=>i)});
    mesh.merge();
    const solid = runtime.Manifold.ofMesh(mesh);
    try {expect(solid.status()).toBe("NoError"); expect(solid.volume()).toBeGreaterThan(0);} finally {solid.delete();}
  };
  const withBox = (action: (solid: CutSolid) => void) => {const solid=box();try{action(solid);}finally{solid.delete();}};

  it("splits a box horizontally into two capped solids without modifying the input", () => withBox(solid => {
    const fragments = cutSolidByPlanes(solid,settings());
    expect(fragments).toHaveLength(2); expect(volume(fragments)).toBeCloseTo(1000,5);
    expect(fragments[0].volume).toBeCloseTo(500,5); fragments.forEach(f=>closed(f.positions));
    expect(solid.volume()).toBeCloseTo(1000,5);
  }));
  it.each([[0,90,0],[0,0,0],[37,23,11]])("cuts vertical or oblique planes %s", (x,y,z) => withBox(solid => {
    const fragments=cutSolidByPlanes(solid,settings({rotation:[x,y,z]}));
    expect(fragments).toHaveLength(2); expect(volume(fragments)).toBeCloseTo(1000,4); fragments.forEach(f=>closed(f.positions));
  }));
  it("keeps the chosen half at an exact height", () => withBox(solid => {
    const positive=cutSolidByPlanes(solid,settings({position:[0,2,0],keep:"positive"}));
    const negative=cutSolidByPlanes(solid,settings({position:[0,2,0],keep:"negative"}));
    expect(volume(positive)).toBeCloseTo(300,4); expect(volume(negative)).toBeCloseTo(700,4);
  }));
  it("removes a symmetric kerf instead of merely separating rendered pieces", () => withBox(solid => {
    const fragments=cutSolidByPlanes(solid,settings({kerf:2}));
    expect(volume(fragments)).toBeCloseTo(800,4); expect(fragments.map(f=>f.volume)).toEqual([400,400]);
  }));
  it("produces four closed bands with three parallel cuts", () => withBox(solid => {
    const fragments=cutSolidByPlanes(solid,settings({count:3,spacing:2}));
    expect(fragments.map(f=>f.band)).toEqual([0,1,2,3]); expect(volume(fragments)).toBeCloseTo(1000,4); fragments.forEach(f=>closed(f.positions));
  }));
  it("accounts for the material removed by every parallel plane", () => withBox(solid => {
    expect(volume(cutSolidByPlanes(solid,settings({count:3,spacing:2,kerf:0.5})))).toBeCloseTo(850,4);
  }));
  it("cuts a fused union and preserves an existing bore", () => {
    const a=box(), b=runtime.Manifold.cube([10,10,10],true).translate([5,0,0]);
    const united=a.add(b), bore=runtime.Manifold.cylinder(30,1,1,32,true).rotate([90,0,0]);
    const source=united.subtract(bore);
    try {const parts=cutSolidByPlanes(source,settings());expect(volume(parts)).toBeCloseTo(source.volume(),3);parts.forEach(f=>closed(f.positions));}
    finally {[a,b,united,bore,source].forEach(s=>s.delete());}
  });
  it("optionally separates disconnected bodies on the same side", () => {
    const a=box(), b=box().translate([20,0,0]), source=runtime.Manifold.union([a,b]);
    try {expect(cutSolidByPlanes(source,settings({splitDisconnected:true}))).toHaveLength(4);expect(cutSolidByPlanes(source,settings())).toHaveLength(2);}
    finally {[a,b,source].forEach(s=>s.delete());}
  });
  it("rejects external and tangent planes, invalid measures and cuts that remove the whole solid", () => withBox(solid => {
    for (const patch of [{position:[0,6,0]},{position:[0,5,0]},{kerf:20},{count:2,spacing:1,kerf:1},{position:[NaN,0,0]}] as Partial<PlaneCutSettings>[]) {
      expect(()=>cutSolidByPlanes(solid,settings(patch))).toThrow();
    }
    expect(solid.volume()).toBeCloseTo(1000,5);
  }));
  it("uses the same world plane for the gizmo and the solid", () => {
    expect(cutPlaneNormal([-90,0,0])[1]).toBeCloseTo(1,10);
    cutPlaneOffsets(settings({position:[42,12,99],count:3,spacing:4})).forEach((value,i)=>expect(value).toBeCloseTo(8+i*4,10));
    expect(()=>cutPlaneOffsets(settings({count:33}))).toThrow();
  });
  it("bakes results with exact dimensions, separation and no stale group/CAD operands", () => withBox(solid => {
    const s=settings({position:[0,1.234,0],separation:4});
    const source={id:"source", name:"Union",kind:"mesh",color:"#ff0000",x:0,z:0,size:10,width:10,depth:10,height:10,rotation:40,groupedShapes:[{}],cadBrep:"stale"} as WorkplaneShape;
    const fragments=cutSolidByPlanes(solid,s);
    const outputs=fragments.map((f,i)=>cutFragmentToShape(source,f,s,`part${i}`,`Part ${i}`));
    expect(outputs[0].height).toBeCloseTo(6.234,5);expect(outputs[1].height).toBeCloseTo(3.766,5);
    expect(outputs[1].elevation! - (outputs[0].elevation! + outputs[0].height)).toBeCloseTo(4,5);
    for (const output of outputs) {expect(output.groupedShapes).toBeUndefined();expect(output.cadBrep).toBeUndefined();expect(output.rotation).toBe(0);expect(output.color).toBe(source.color);}
  }));
});
