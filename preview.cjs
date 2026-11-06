// Local preview only; serves files within this project and binds to loopback.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = fs.existsSync(path.join(__dirname,'dist/index.html')) ? path.join(__dirname,'dist') : __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let name; try { name=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if(name.endsWith('/'))name+='index.html';if(name==='/admin')name='/admin/index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
