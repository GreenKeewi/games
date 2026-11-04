export const VERSION = '0.1.1';
export const TILE = 32;
export const TAU = Math.PI * 2;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function rng(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const angleDiff = (a,b) => Math.atan2(Math.sin(a-b), Math.cos(a-b));
const pick = (r, a) => a[Math.floor(r() * a.length)];

export function generateMap(seed = 1, entry = 'west') {
  const r = rng(seed), w = 39, h = 29, tiles = Array(w * h).fill(1), rooms = [], doors = [];
  const xs = [1, 12 + Math.floor(r()*3), 25 + Math.floor(r()*2), 38], ys = [1, 9 + Math.floor(r()*2), 18 + Math.floor(r()*2), 26];
  const names = ['RECEPTION', 'RECORDS', 'WORKSHOP', 'OFFICES', 'ATRIUM', 'STORAGE', 'SERVER ROOM', 'BREAK ROOM', 'HOLDING'];
  for(let row=0; row<3; row++) for(let col=0; col<3; col++) {
    const room={id:row*3+col,x:xs[col],y:ys[row],w:xs[col+1]-xs[col],h:ys[row+1]-ys[row],name:names[row*3+col],visited:false};
    rooms.push(room);
    for(let y=room.y+1;y<room.y+room.h;y++) for(let x=room.x+1;x<room.x+room.w;x++) tiles[y*w+x]=0;
  }
  const edges=[];
  for(let y=0;y<3;y++) for(let x=0;x<3;x++){const a=y*3+x;if(x<2)edges.push([a,a+1]);if(y<2)edges.push([a,a+3]);}
  edges.sort(()=>r()-.5); const parent=rooms.map(v=>v.id);const root=a=>parent[a]===a?a:(parent[a]=root(parent[a]));
  for(const [a,b] of edges){if(root(a)!==root(b)||r()<.38){parent[root(a)]=root(b);const A=rooms[a],B=rooms[b];let x,y;if(b-a===1){x=B.x;y=A.y+2+Math.floor(r()*(A.h-3));}else{x=A.x+2+Math.floor(r()*(A.w-3));y=B.y;}tiles[y*w+x]=0;doors.push({id:doors.length,x,y,open:false,rooms:[a,b]});}}
  // An outside staging strip connects either insertion point to the building.
  for(let y=27;y<28;y++)for(let x=2;x<37;x++)tiles[y*w+x]=0;
  const entrances=[{x:5,y:26,room:6},{x:33,y:26,room:8}];
  for(const e of entrances){tiles[e.y*w+e.x]=0;doors.push({id:doors.length,x:e.x,y:e.y,open:false,rooms:[e.room]});}
  const spawn={x:entry==='east'?33.5:5.5,y:27.5}, extraction={...spawn};
  const hostageRoom=entry==='east'?0:2;const R=rooms[hostageRoom];const hostage={x:R.x+R.w*.65,y:R.y+R.h*.5,room:hostageRoom,following:null,rescued:false};
  // Low furniture is cover, kept away from every doorway and the objective.
  const furniture=[];
  for(const room of rooms){const x=room.x+3+Math.floor(r()*Math.max(1,room.w-6)),y=room.y+3+Math.floor(r()*Math.max(1,room.h-6));if(dist({x:x+.5,y:y+.5},hostage)>2){tiles[y*w+x]=2;furniture.push({x,y});}}
  return {seed,w,h,tiles,rooms,doors,spawn,extraction,hostage,furniture};
}
export function blocked(map,x,y,ignoreDoors=false){const ix=Math.floor(x),iy=Math.floor(y);if(ix<0||iy<0||ix>=map.w||iy>=map.h||map.tiles[iy*map.w+ix]!==0)return true;return !ignoreDoors&&map.doors.some(d=>!d.open&&d.x===ix&&d.y===iy);}
export function lineOfSight(map,a,b){const d=dist(a,b),steps=Math.ceil(d/.12);for(let i=1;i<=steps;i++)if(blocked(map,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;return true;}
export function raycast(map,x,y,angle,range=12){const dx=Math.cos(angle)*.08,dy=Math.sin(angle)*.08;let px=x,py=y;for(let d=0;d<range;d+=.08){px+=dx;py+=dy;if(blocked(map,px,py))return {x:px,y:py};}return {x:px,y:py};}
export function canSee(map,observer,target,range=10,cone=1.3){const d=dist(observer,target);return d<range&&(d<1.25||Math.abs(angleDiff(Math.atan2(target.y-observer.y,target.x-observer.x),observer.angle))<cone/2)&&lineOfSight(map,observer,target);}
export function moveEntity(map,e,dx,dy){const radius=e.radius||.23;const fits=(x,y)=>![[-1,-1],[1,-1],[-1,1],[1,1]].some(([a,b])=>blocked(map,x+a*radius,y+b*radius));if(fits(e.x+dx,e.y))e.x+=dx;if(fits(e.x,e.y+dy))e.y+=dy;}
export function findPath(map,a,b,ignoreDoors=false){const sx=Math.floor(a.x),sy=Math.floor(a.y),tx=Math.floor(b.x),ty=Math.floor(b.y);const start=sy*map.w+sx,end=ty*map.w+tx,queue=[start],prev=new Map([[start,null]]);for(let i=0;i<queue.length;i++){const n=queue[i];if(n===end)break;const x=n%map.w,y=Math.floor(n/map.w);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*map.w+nx;if(!prev.has(k)&&!blocked(map,nx+.5,ny+.5,ignoreDoors)){prev.set(k,n);queue.push(k);}}}if(!prev.has(end))return [];const path=[];for(let n=end;n!==start&&n!==null;n=prev.get(n))path.push({x:n%map.w+.5,y:Math.floor(n/map.w)+.5});return path.reverse();}
export function makePlayer(id,spawn,kit='carbine',bot=false){return {id,x:spawn.x,y:spawn.y,angle:-Math.PI/2,radius:.23,hp:100,ammo:kit==='compact'?26:18,maxAmmo:kit==='compact'?26:18,kit,reload:0,cooldown:0,flashes:2,bot,hold:false,kills:0,interactCd:0,flashCd:0,revive:0};}
export function createGame({seed=Date.now()>>>0,entry='west',kit='carbine',difficulty='standard',bots=true}={}){
  const map=generateMap(seed,entry),r=rng(seed+121),players=[makePlayer('host',map.spawn,kit)];if(bots)players.push(makePlayer('bot',{x:map.spawn.x+(entry==='east'?-1:1),y:27.5},'carbine',true));
  const enemies=[];
  for(const room of map.rooms){const near=entry==='east'?8:6,count=room.id===near?1:(r()<.45?1:2);for(let i=0;i<count;i++){let e;for(let tries=0;tries<100;tries++){e={id:`e${enemies.length}`,x:room.x+2+r()*(room.w-3),y:room.y+2+r()*(room.h-3),angle:r()*TAU,hp:60,room:room.id,cooldown:.8+r(),alert:0,stun:0,patrol:r()*3};if(![[-.23,-.23],[.23,-.23],[-.23,.23],[.23,.23]].some(([dx,dy])=>blocked(map,e.x+dx,e.y+dy))&&dist(e,map.hostage)>1)break;}enemies.push(e);}}
  return {map,players,enemies,time:0,phase:'active',difficulty,seed,effects:[],noise:null,log:'Find the hostage. E opens doors.',extractionProgress:0,shots:0,startedAt:Date.now(),cleared:[],score:0};
}
export function addPlayer(game,id,kit='carbine'){if(game.players.some(p=>p.id===id)||game.players.filter(p=>!p.bot).length>=4)return;game.players=game.players.filter(p=>!p.bot);const i=game.players.length;const p=makePlayer(id,{x:clamp(game.map.spawn.x+i*.55,2.5,36.5),y:27.5},kit);game.players.push(p);return p;}
export function removePlayer(game,id){game.players=game.players.filter(p=>p.id!==id);if(game.map.hostage.following===id)game.map.hostage.following=null;}
function log(g,t){g.log=t;g.logAt=g.time;}
function shoot(g,p,enemy=false){if(p.cooldown>0||p.reload>0||p.hp<=0)return;if(!enemy&&p.ammo<=0){reload(p);return;}if(!enemy)p.ammo--;p.cooldown=enemy?.85:(p.kit==='compact'?.12:.2);const range=enemy?9:12,targets=enemy?g.players.filter(v=>v.hp>0):g.enemies.filter(v=>v.hp>0);const hits=targets.filter(v=>dist(v,p)<range&&Math.abs(angleDiff(Math.atan2(v.y-p.y,v.x-p.x),p.angle))<(enemy?.1:.38)&&lineOfSight(g.map,p,v)).sort((a,b)=>dist(a,p)-dist(b,p));let end=raycast(g.map,p.x,p.y,p.angle,range);if(hits.length){const t=hits[0];t.hp=Math.max(0,t.hp-(enemy?(g.difficulty==='training'?6:12):(p.kit==='compact'?24:34)));end={x:t.x,y:t.y};if(t.hp===0){if(!enemy)p.kills++;else log(g,'Operator down. Stand nearby and hold E to revive.');}}
 g.effects.push({type:'shot',x:p.x,y:p.y,ex:end.x,ey:end.y,ttl:.1,enemy});if(!enemy){g.shots++;g.noise={x:p.x,y:p.y,until:g.time+1};}}
export function reload(p){if(p.reload<=0&&p.ammo<p.maxAmmo)p.reload=1.15;}
export function interact(g,p,dt=.016){if(p.hp<=0)return;const ally=g.players.find(a=>a.id!==p.id&&a.hp<=0&&dist(a,p)<1.5&&lineOfSight(g.map,p,a));if(ally){ally.revive+=dt;if(ally.revive>=1.5){ally.hp=50;ally.revive=0;log(g,'Operator back up. Keep moving.');}return;}if(p.interactCd>0)return;const h=g.map.hostage;if(!h.rescued&&dist(p,h)<1.6&&lineOfSight(g.map,p,h)){h.following=p.id;p.interactCd=.4;log(g,'Hostage secured. Return to the green extraction zone.');return;}const d=g.map.doors.filter(d=>!d.open&&dist(p,{x:d.x+.5,y:d.y+.5})<1.7).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(d){d.open=true;p.interactCd=.35;g.effects.push({type:'door',x:d.x+.5,y:d.y+.5,ttl:.4});log(g,'Door open. Check your corners.');}}
function navigate(g,e,target,speed,dt){let t=target;if(!lineOfSight(g.map,e,target)){e.pathTick=(e.pathTick||0)-dt;if(!e.path||e.pathTick<=0){e.path=findPath(g.map,e,target);e.pathTick=.5;}while(e.path.length&&dist(e,e.path[0])<.18)e.path.shift();if(!e.path.length)return;t=e.path[0];}const d=dist(e,t);if(d>.1)moveEntity(g.map,e,(t.x-e.x)/d*speed*dt,(t.y-e.y)/d*speed*dt);}
function tickBot(g,p,dt){const leader=g.players.find(v=>!v.bot&&v.hp>0);if(!leader)return;const target=g.enemies.filter(e=>e.hp>0&&dist(e,p)<8&&lineOfSight(g.map,p,e)).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(target){p.angle=Math.atan2(target.y-p.y,target.x-p.x);shoot(g,p);}else{p.angle=leader.angle;if(!p.hold&&dist(p,leader)>1.4)navigate(g,p,leader,3.7,dt);}if(p.ammo===0)reload(p);}
export function tick(g,inputs={},dt=1/60){if(g.phase!=='active')return;dt=clamp(Number.isFinite(dt)?dt:0,0,.05);g.time+=dt;g.effects=g.effects.filter(e=>(e.ttl-=dt)>0);
 for(const p of g.players){p.cooldown=Math.max(0,p.cooldown-dt);p.interactCd=Math.max(0,p.interactCd-dt);p.flashCd=Math.max(0,p.flashCd-dt);if(p.reload>0){p.reload-=dt;if(p.reload<=0)p.ammo=p.maxAmmo;}if(p.hp<=0)continue;if(p.bot){tickBot(g,p,dt);continue;}const input=inputs[p.id]||{};const ax=clamp(Number(input.ax)||0,-1,1),ay=clamp(Number(input.ay)||0,-1,1);if(ax||ay)p.angle=Math.atan2(ay,ax);let mx=clamp(Number(input.mx)||0,-1,1),my=clamp(Number(input.my)||0,-1,1),len=Math.hypot(mx,my);if(len){if(len>1){mx/=len;my/=len;}const speed=input.walk?2:3.8;moveEntity(g.map,p,mx*speed*dt,my*speed*dt);}if(input.fire)shoot(g,p);if(input.reload)reload(p);if(input.interact)interact(g,p,dt);if(input.flash&&p.flashes>0&&p.flashCd<=0){p.flashes--;p.flashCd=.6;const end=raycast(g.map,p.x,p.y,p.angle,4);const spot={x:end.x-Math.cos(p.angle)*.2,y:end.y-Math.sin(p.angle)*.2};for(const e of g.enemies)if(dist(e,spot)<4&&lineOfSight(g.map,spot,e))e.stun=3.5;g.effects.push({type:'flash',...spot,ttl:.5});log(g,'Flash out. Move while they are stunned.');}}
 for(const e of g.enemies){if(e.hp<=0)continue;e.cooldown=Math.max(0,e.cooldown-dt);e.stun=Math.max(0,e.stun-dt);if(e.stun>0)continue;const target=g.players.filter(p=>p.hp>0&&dist(p,e)<9&&lineOfSight(g.map,e,p)).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(target){e.alert=Math.min(1.3,e.alert+dt);e.angle=Math.atan2(target.y-e.y,target.x-e.x);if(e.alert>.8){if(dist(e,target)>4)navigate(g,e,target,1.25,dt);shoot(g,e,true);}}else{e.alert=Math.max(0,e.alert-dt*.4);e.patrol-=dt;if(e.patrol<0){e.angle+=.8;e.patrol=2;}if(g.noise&&g.noise.until>g.time&&dist(e,g.noise)<8){e.angle=Math.atan2(g.noise.y-e.y,g.noise.x-e.x);}}}
 const h=g.map.hostage;if(h.following){let p=g.players.find(p=>p.id===h.following&&p.hp>0);if(!p){h.following=null;log(g,'Hostage waiting. Press E nearby to lead them again.');}else if(dist(h,p)>1.15)navigate(g,h,p,3.15,dt);}
 for(const room of g.map.rooms){if(g.players.some(p=>p.hp>0&&p.x>room.x&&p.x<room.x+room.w&&p.y>room.y&&p.y<room.y+room.h))room.visited=true;}
 g.cleared=g.map.rooms.filter(r=>r.visited&&!g.enemies.some(e=>e.hp>0&&e.room===r.id)).map(r=>r.id);
 if(h.following&&dist(h,g.map.extraction)<1.8&&g.players.some(p=>p.hp>0&&dist(p,g.map.extraction)<1.8)){g.extractionProgress+=dt;if(g.extractionProgress>=1.5){g.phase='won';h.rescued=true;g.score=Math.max(0,Math.round(1000+g.cleared.length*100+g.enemies.filter(e=>e.hp<=0).length*50-g.time*2));log(g,'Hostage extracted. Mission complete.');}}else g.extractionProgress=0;
 if(!g.players.some(p=>p.hp>0&&!p.bot)){g.phase='lost';log(g,'Squad down. Re-plan and try again.');}
}
export function snapshot(g){return JSON.parse(JSON.stringify(g,(k,v)=>['path','pathTick'].includes(k)?undefined:v));}
