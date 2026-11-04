// Run with: node tools/benchmark-visibility.mjs
// Compare the former sampled algorithms to DDA on identical expanded maps.
import {performance} from 'node:perf_hooks';
import {generateMap,rng,lineOfSight,raycast} from '../src/game.js';
function oldBlocked(map,x,y){const ix=Math.floor(x),iy=Math.floor(y);return ix<0||iy<0||ix>=map.w||iy>=map.h||map.tiles[iy*map.w+ix]!==0||map.doors.some(d=>!d.open&&d.x===ix&&d.y===iy);}
function oldSight(map,a,b){const steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/.12);for(let i=1;i<=steps;i++)if(oldBlocked(map,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;return true;}
function oldRay(map,x,y,angle,range=12){const dx=Math.cos(angle)*.08,dy=Math.sin(angle)*.08;let px=x,py=y;for(let d=0;d<range;d+=.08){px+=dx;py+=dy;if(oldBlocked(map,px,py))return {x:px,y:py};}return {x:px,y:py};}
const map=generateMap(42),random=rng(123),queries=[];
for(let i=0;i<2000;i++){
 let x,y;do{x=2+random()*(map.w-4);y=2+random()*(map.h-4);}while(oldBlocked(map,x,y));
 const angle=random()*Math.PI*2,range=2+random()*10;
 queries.push({a:{x,y},b:{x:x+Math.cos(angle)*range,y:y+Math.sin(angle)*range},angle,range});
}
let checksum=0;
function measure(fn){for(let i=0;i<3;i++)for(const q of queries)checksum+=fn(q);const start=performance.now();for(let i=0;i<50;i++)for(const q of queries)checksum+=fn(q);return performance.now()-start;}
for(const [name,oldFn,newFn] of [
 ['LOS',q=>Number(oldSight(map,q.a,q.b)),q=>Number(lineOfSight(map,q.a,q.b))],
 ['Raycast',q=>oldRay(map,q.a.x,q.a.y,q.angle,q.range).x,q=>raycast(map,q.a.x,q.a.y,q.angle,q.range).x]
]){
 const oldMs=measure(oldFn),newMs=measure(newFn);
 console.log(`${name}: sampled ${oldMs.toFixed(1)} ms; grid ${newMs.toFixed(1)} ms; ${(oldMs/newMs).toFixed(2)}x faster (100,000 queries)`);
}
if(!Number.isFinite(checksum))throw Error('Invalid benchmark result');
