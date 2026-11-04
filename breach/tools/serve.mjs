import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2),opt=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const root=process.cwd(),port=Number(opt('--port','8080')),host=opt('--host','127.0.0.1');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.md':'text/plain'};
http.createServer((req,res)=>{let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}let file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}if(file===root||url.endsWith('/'))file=path.join(file,'index.html');fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});}).listen(port,host,()=>console.log(`Breach ready at http://${host}:${port}`));
