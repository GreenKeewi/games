/** Offscreen rendering assertions, independent of browser/UI automation. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
import {Renderer} from '../src/render.js';
import {createGame,TILE,MAP_WIDTH,MAP_HEIGHT} from '../src/game.js';
globalThis.innerWidth=1200;globalThis.innerHeight=800;globalThis.devicePixelRatio=1;
globalThis.document={createElement:()=>createCanvas(1,1)};
const canvas=createCanvas(1200,800),renderer=new Renderer(canvas),g=createGame({seed:314,bots:false});
renderer.cache(g.map);
const pixel=(ctx,x,y)=>Array.from(ctx.getImageData(Math.round(x),Math.round(y),1,1).data);
const black=p=>p[0]===0&&p[1]===0&&p[2]===0&&p[3]===255;
let interiorCount=0;
for(let y=0;y<g.map.h;y++)for(let x=0;x<g.map.w;x++)if(g.map.tiles[y*g.map.w+x]!==1){assert.ok(black(pixel(renderer.plan.getContext('2d'),(x+.5)*TILE,(y+.5)*TILE)),`unseen interior ${x},${y} must be opaque black`);interiorCount++;}
assert.ok(interiorCount>1000);
const tiles=Array.from({length:MAP_WIDTH*MAP_HEIGHT},(_,i)=>i%MAP_WIDTH===0||i%MAP_WIDTH===MAP_WIDTH-1||i<MAP_WIDTH||i>=MAP_WIDTH*(MAP_HEIGHT-1)?1:0);
for(let y=1;y<MAP_HEIGHT-1;y++)tiles[y*MAP_WIDTH+20]=1;
tiles[16*MAP_WIDTH+20]=0;
g.map={...g.map,seed:991,tiles,rooms:[],furniture:[],doors:[{id:0,x:20,y:16,open:false}],hostage:{x:24.5,y:14.5,following:null,rescued:false}};
g.seed=991;Object.assign(g.players[0],{x:19,y:16.5,angle:0});g.enemies=[{id:'e-hidden',x:24.5,y:16.5,hp:60,angle:0,stun:0}];
const scale=1200/(34*TILE),point=(x,y)=>({x:600+(x-19)*TILE*scale,y:800*.59+(y-16.5)*TILE*scale});
const target=point(24.5,16.5);
renderer.render(g,'host');assert.ok(black(pixel(canvas.getContext('2d'),target.x,target.y)),'closed door must hide both room floor and enemy');
g.map.doors[0].open=true;renderer.render(g,'host');assert.ok(!black(pixel(canvas.getContext('2d'),target.x,target.y)),'opened sightline must reveal the enemy');
g.players[0].angle=Math.PI;renderer.render(g,'host');assert.ok(black(pixel(canvas.getContext('2d'),target.x,target.y)),'turning away must make interior/contents black again');
const outline=point(20,10.5);const wallPixel=pixel(canvas.getContext('2d'),outline.x+.7,outline.y);assert.ok(wallPixel[0]+wallPixel[1]+wallPixel[2]>0,'architectural wall outline must remain visible outside the cone');
console.log(`PASS: ${interiorCount} unknown floor/cover cells are black; closed door hides entities; open door reveals; turn-away conceals again; unseen wall outlines remain visible.`);
