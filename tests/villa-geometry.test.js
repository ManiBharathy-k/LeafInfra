import test from 'node:test';
import assert from 'node:assert/strict';
import { geometry,project } from '../assets/villa-geometry.mjs';
test('model provides distinct finished, structural and floor-cutaway meshes',()=>{
 const finished=geometry('finished'),structure=geometry('structure'),ground=geometry('finished','ground'),first=geometry('finished','first');
 assert.ok(finished.length>structure.length);
 assert.ok(finished.some(f=>f.group==='glazing'));
 assert.ok(!structure.some(f=>f.group==='glazing'));
 assert.ok(!ground.some(f=>f.group==='roof'));
 assert.ok(!first.some(f=>f.group==='roof'));
 assert.ok(ground.some(f=>f.group==='partition'));
 assert.ok(first.some(f=>f.group==='partition'));
 for(const mesh of [finished,structure,ground,first])for(const face of mesh){assert.equal(face.points.length,4);assert.ok(face.points.flat().every(Number.isFinite));}
});
test('rotation changes the projection without changing source geometry',()=>{
 const point=[3,2,1];const a=project(point,0,.5,20,200,300),b=project(point,Math.PI/2,.5,20,200,300);
 assert.notEqual(a.x,b.x);assert.notEqual(a.depth,b.depth);assert.deepEqual(point,[3,2,1]);
});
