import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_WIDTH,MAP_HEIGHT,generateMap,createGame,blocked,lineOfSight,raycast,canSee,findPath,moveEntity,tick,interact,addPlayer,removePlayer,reload,snapshot} from '../src/game.js';

function arena(){
 const g=createGame({seed:42,bots:false});
 g.map={...g.map,w:12,h:10,tiles:Array.from({length:120},(_,i)=>i%12===0||i%12===11||i<12||i>=108?1:0),doors:[],rooms:[],hostage:{x:9.5,y:7.5,following:null,rescued:false},extraction:{x:2.5,y:2.5}};
 Object.assign(g.players[0],{x:2.5,y:2.5,angle:0});g.enemies=[];return g;
}
function steps(g,n,input={},dt=.05){for(let i=0;i<n;i++)tick(g,{host:input},dt);}

test('map generation is repeatable and every floor is reachable through doors across 160 seeds and both insertions',()=>{
 for(let seed=1;seed<=160;seed++)for(const entry of ['west','east']){
  const m=generateMap(seed,entry);assert.deepEqual(m,generateMap(seed,entry));
  assert.equal(blocked(m,m.spawn.x,m.spawn.y),false);assert.equal(blocked(m,m.hostage.x,m.hostage.y),false);
  assert.deepEqual(m.extraction,m.spawn);assert.equal(m.rooms.length,9);
  const start=Math.floor(m.spawn.y)*m.w+Math.floor(m.spawn.x),seen=new Set([start]),q=[start];
  for(let i=0;i<q.length;i++){const n=q[i],x=n%m.w,y=Math.floor(n/m.w);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*m.w+nx;if(!seen.has(k)&&!blocked(m,nx+.5,ny+.5,true)){seen.add(k);q.push(k);}}}
  assert.equal(seen.size,m.tiles.filter(t=>t===0).length,`disconnected seed ${seed} ${entry}`);
  assert.ok(findPath(m,m.spawn,m.hostage,true).length>0);
  for(const d of m.doors){assert.equal(m.tiles[d.y*m.w+d.x],0);assert.equal(d.open,false);}
  const g=createGame({seed,entry});for(const e of [...g.players,...g.enemies])assert.equal(blocked(m,e.x,e.y),false,`blocked spawn ${seed} ${entry} ${e.id}`);
 }
});
test('closed door blocks movement, pathfinding and sight, then E opens it',()=>{
 const g=arena(),m=g.map,p=g.players[0];for(let y=1;y<9;y++)m.tiles[y*m.w+4]=1;m.tiles[2*m.w+4]=0;m.doors=[{id:0,x:4,y:2,open:false}];p.x=3.5;
 assert.equal(lineOfSight(m,p,{x:5.5,y:2.5}),false);assert.equal(findPath(m,p,{x:5.5,y:2.5}).length,0);
 steps(g,10,{mx:1});assert.ok(p.x<4);interact(g,p);assert.equal(m.doors[0].open,true);
 assert.equal(lineOfSight(m,p,{x:5.5,y:2.5}),true);assert.ok(findPath(m,p,{x:5.5,y:2.5}).length);steps(g,12,{mx:1});assert.ok(p.x>4.5);
});
test('directional vision enforces cone, distance, walls and near peripheral awareness',()=>{
 const {map:m}=arena(),p={x:3.5,y:3.5,angle:0};
 assert.equal(canSee(m,p,{x:6.5,y:3.5}),true);assert.equal(canSee(m,p,{x:1.5,y:3.5}),false);
 assert.equal(canSee(m,p,{x:3.5,y:6.5}),false);assert.equal(canSee(m,p,{x:2.5,y:3.5}),true);
 assert.equal(canSee(m,p,{x:6.5,y:3.5},2),false);m.tiles[3*m.w+5]=1;assert.equal(canSee(m,p,{x:6.5,y:3.5}),false);
});
test('keyboard movement respects walls, normalizes diagonals and supports walking',()=>{
 const a=arena(),b=arena(),c=arena();steps(a,5,{mx:1});steps(b,5,{mx:1,my:1});steps(c,5,{mx:1,walk:true});
 const length=g=>Math.hypot(g.players[0].x-2.5,g.players[0].y-2.5);assert.ok(Math.abs(length(a)-length(b))<1e-10);assert.ok(length(c)<length(a));
 steps(a,100,{mx:-1,my:-1});assert.ok(a.players[0].x>=1.23&&a.players[0].y>=1.23);
 const p=a.players[0];assert.equal(blocked(a.map,p.x,p.y),false);
});
test('firing respects cadence and line of sight, kills, empties magazine and reloads',()=>{
 const g=arena(),p=g.players[0];g.enemies=[{id:'target',x:5.5,y:2.5,hp:60,cooldown:100,alert:0,stun:100,patrol:1}];
 tick(g,{host:{fire:true}},.05);assert.equal(p.ammo,17);assert.equal(g.enemies[0].hp,26);
 tick(g,{host:{fire:true}},.05);assert.equal(p.ammo,17);steps(g,5,{fire:true});assert.equal(g.enemies[0].hp,0);assert.equal(p.kills,1);
 p.cooldown=0;p.ammo=1;tick(g,{host:{fire:true}},.05);assert.equal(p.ammo,0);steps(g,6,{fire:true});assert.ok(p.reload>0);steps(g,24);assert.equal(p.ammo,p.maxAmmo);
 reload(p);assert.ok(p.reload<=0);p.ammo=3;reload(p);assert.equal(p.reload,1.15);steps(g,24);assert.equal(p.ammo,p.maxAmmo);
 const w=arena();w.map.tiles[2*12+4]=1;w.enemies=[{id:'behind-wall',x:5.5,y:2.5,hp:60,cooldown:100,alert:0,stun:100,patrol:1}];steps(w,10,{fire:true});assert.equal(w.enemies[0].hp,60);
});
test('hostage rescue requires proximity and sight, follows, and extracts after continuous hold',()=>{
 const g=arena(),p=g.players[0],h=g.map.hostage;interact(g,p);assert.equal(h.following,null);
 Object.assign(h,{x:3.5,y:2.5});interact(g,p);assert.equal(h.following,'host');
 p.x=6.5;const old=h.x;steps(g,10);assert.ok(h.x>old);
 Object.assign(p,g.map.extraction);Object.assign(h,{x:3,y:2.5});steps(g,10);assert.ok(g.extractionProgress>0);
 p.x=8;h.x=8;tick(g,{},.05);assert.equal(g.extractionProgress,0);
 Object.assign(p,g.map.extraction);Object.assign(h,{x:3,y:2.5});steps(g,31);assert.equal(g.phase,'won');assert.equal(h.rescued,true);assert.ok(g.score>0);
 const time=g.time;tick(g,{host:{fire:true}},.05);assert.equal(g.time,time);
});
test('lobby add replaces bot, caps at four humans, avoids duplicates, and remove releases hostage',()=>{
 const g=createGame({seed:9});assert.ok(g.players.some(p=>p.bot));assert.ok(addPlayer(g,'two','compact'));assert.equal(g.players.some(p=>p.bot),false);
 addPlayer(g,'two');assert.equal(g.players.length,2);addPlayer(g,'three');addPlayer(g,'four');addPlayer(g,'five');assert.equal(g.players.length,4);
 assert.equal(g.players.find(p=>p.id==='two').maxAmmo,26);g.map.hostage.following='two';removePlayer(g,'two');assert.equal(g.map.hostage.following,null);assert.equal(g.players.length,3);
});
test('downed operator cannot act, nearby teammate revives, lone human loss ends mission',()=>{
 const g=arena(),p=g.players[0];const a=addPlayer(g,'ally');Object.assign(a,{x:3,y:2.5,hp:0});
 for(let i=0;i<31;i++)interact(g,p,.05);assert.equal(a.hp,50);assert.equal(a.revive,0);
 p.hp=0;const before={x:p.x,ammo:p.ammo};tick(g,{host:{mx:1,fire:true,interact:true}},.05);assert.equal(p.x,before.x);assert.equal(p.ammo,before.ammo);assert.equal(g.phase,'active');
 a.hp=0;tick(g,{},.05);assert.equal(g.phase,'lost');
});
test('hostage stops following a downed leader',()=>{const g=arena();addPlayer(g,'ally');g.map.hostage.following='host';g.players[0].hp=0;tick(g,{},.05);assert.equal(g.map.hostage.following,null);});
test('external control values and oversized time steps remain bounded and finite',()=>{
 const g=arena();tick(g,{host:{mx:Infinity,my:-Infinity,ax:'bad',ay:NaN}},1000);
 assert.equal(g.time,.05);assert.ok(Number.isFinite(g.players[0].angle));assert.ok(Math.hypot(g.players[0].x-2.5,g.players[0].y-2.5)<=3.8*.05+1e-10);
 tick(g,{host:{mx:'nonsense',my:null,ax:Infinity,ay:-Infinity}},.05);assert.ok(Number.isFinite(g.players[0].x));assert.ok(Number.isFinite(g.players[0].angle));
 tick(g,{},NaN);assert.ok(Number.isFinite(g.time),'NaN dt must not poison simulation time');
});
test('snapshots are detached serializable state and exclude navigation caches',()=>{const g=arena();g.players[0].path=[{x:1,y:1}];g.players[0].pathTick=.5;const s=snapshot(g);assert.equal(s.players[0].path,undefined);assert.equal(s.players[0].pathTick,undefined);s.players[0].hp=1;assert.equal(g.players[0].hp,100);});
test('enemy spawn clearance accommodates its collision radius',()=>{
 for(let seed=1;seed<=160;seed++)for(const entry of ['west','east']){
  const g=createGame({seed,entry});for(const e of g.enemies)for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]])assert.equal(blocked(g.map,e.x+dx*.23,e.y+dy*.23),false,`embedded enemy ${seed} ${entry} ${e.id}`);
 }
});

test('expanded geometry keeps staging, all operators and both extraction points in bounds',()=>{
 assert.equal(MAP_WIDTH,45);assert.equal(MAP_HEIGHT,33);
 for(const entry of ['west','east']){
  const g=createGame({seed:42,entry});assert.equal(g.map.w,MAP_WIDTH);assert.equal(g.map.h,MAP_HEIGHT);
  assert.equal(g.map.tiles.length,MAP_WIDTH*MAP_HEIGHT);assert.equal(g.map.spawn.y,MAP_HEIGHT-1.5);
  assert.equal(g.map.spawn.x,entry==='west'?5.5:MAP_WIDTH-5.5);
  assert.equal(g.players[1].y,g.map.spawn.y);
  for(const id of ['two','three','four'])addPlayer(g,id);
  for(const p of g.players){assert.equal(p.y,g.map.spawn.y);assert.equal(blocked(g.map,p.x,p.y),false);}
  for(const room of g.map.rooms){assert.ok(room.x+room.w<MAP_WIDTH);assert.ok(room.y+room.h<=MAP_HEIGHT-3);}
 }
});
test('grid traversal hits exact walls, cover and doors without overshooting its range',()=>{
 const {map:m}=arena(),a={x:2.5,y:2.5};
 assert.deepEqual(raycast(m,a.x,a.y,0,2),{x:4.5,y:2.5});
 m.tiles[2*m.w+4]=2;
 assert.equal(lineOfSight(m,a,{x:8.5,y:2.5}),false);
 assert.deepEqual(raycast(m,a.x,a.y,0,8),{x:4,y:2.5});
 assert.equal(lineOfSight(m,a,{x:3.999,y:2.5}),true);
 assert.equal(lineOfSight(m,a,{x:4,y:2.5}),false);
 assert.equal(lineOfSight(m,{x:4.5,y:2.5},a),false);
 m.tiles[2*m.w+4]=0;m.doors=[{x:4,y:2,open:false}];
 assert.deepEqual(raycast(m,a.x,a.y,0,8),{x:4,y:2.5});
 m.doors[0].open=true;assert.equal(lineOfSight(m,a,{x:8.5,y:2.5}),true);
 assert.deepEqual(raycast(m,6.5,2.5,Math.PI,8),{x:1,y:2.5+Math.sin(Math.PI)*5.5});
 assert.equal(lineOfSight(m,a,a),true);
});
test('grid traversal seals diagonal corners and catches tiny crossed wall segments',()=>{
 const {map:m}=arena(),a={x:2.5,y:2.5},b={x:4.5,y:4.5};
 for(const [x,y] of [[3,2],[2,3]]){
  m.tiles[y*m.w+x]=1;
  assert.equal(lineOfSight(m,a,b),false);assert.equal(lineOfSight(m,b,a),false);
  const hit=raycast(m,a.x,a.y,Math.PI/4,8);
  assert.ok(Math.abs(hit.x-3)<1e-10&&Math.abs(hit.y-3)<1e-10);
  m.tiles[y*m.w+x]=0;
 }
 assert.equal(lineOfSight(m,a,b),true);
 m.tiles[2*m.w+3]=1;
 assert.equal(lineOfSight(m,{x:2.99,y:2.98},{x:3.03,y:3.02}),false);
 assert.equal(lineOfSight(m,{x:3.03,y:3.02},{x:2.99,y:2.98}),false);
 // A ray starting exactly on a grid edge must check the cell it enters.
 assert.equal(lineOfSight(m,{x:4,y:2.5},{x:2,y:2.5}),false);
});
test('door index follows live door changes, replacement arrays and replacement maps',()=>{
 const {map:m}=arena();m.doors=[{x:4,y:2,open:false}];
 assert.equal(blocked(m,4.5,2.5),true);
 m.doors[0].open=true;assert.equal(blocked(m,4.5,2.5),false);
 m.doors[0].open=false;assert.equal(blocked(m,4.5,2.5,true),false);
 m.doors=[{x:5,y:2,open:false}];assert.equal(blocked(m,4.5,2.5),false);assert.equal(blocked(m,5.5,2.5),true);
 m.doors.push({x:6,y:2,open:false});assert.equal(blocked(m,6.5,2.5),true);
 const next=JSON.parse(JSON.stringify(m));next.doors[0].open=true;
 assert.equal(blocked(next,5.5,2.5),false);assert.equal(blocked(m,5.5,2.5),true);
});
test('derived door lookup is non-enumerable and absent from snapshots',()=>{
 const g=createGame({seed:42}),keys=Object.keys(g.map),json=JSON.stringify(g.map);
 blocked(g.map,g.players[0].x,g.players[0].y);lineOfSight(g.map,g.players[0],g.map.hostage);
 const symbols=Object.getOwnPropertySymbols(g.map);assert.equal(symbols.length,1);
 assert.equal(Object.getOwnPropertyDescriptor(g.map,symbols[0]).enumerable,false);
 assert.deepEqual(Object.keys(g.map),keys);assert.equal(JSON.stringify(g.map),json);
 const next=snapshot(g);assert.equal(Object.getOwnPropertySymbols(next.map).length,0);
 assert.equal(blocked(next.map,next.players[0].x,next.players[0].y),false);
});
