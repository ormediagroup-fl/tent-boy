// Loopback-only browser QA fixture. No GitHub, Cloudflare or production writes.
// Posts and uploads live only in memory. Stop the process to discard everything.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),uploaded=new Map();let revision='image-qa-1',published=null;
async function start(){
 const {validate,imagePath}=await import(pathToFileURL(path.join(root,'content/schema.js'))),{blogPage}=await import(pathToFileURL(path.join(root,'blog-view.js')));
 let content=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/site.json')));
 content.posts=[{id:'image-editor-qa',slug:'image-editor-qa',title:'Image editor QA — local only',date:'2026-11-07',published:false,excerpt:'An isolated image-editing check; never saved to the real repository.',cover:'',coverAlt:'',body:[{type:'p',spans:[{text:'Local image editing and publishing check.'}]},{type:'image',src:'assets/christmas-market-exterior.png',alt:'Legacy image: the Christmas market canopy'},{type:'image',src:'assets/04-finished-fall-set.jpg',alt:'Autumn portrait set',caption:'Existing independent caption',width:'medium',align:'left'},{type:'image',src:'assets/08-about-tent-boy-selfie.jpg',alt:'Tent Boy at the portrait booth',caption:'Another image caption',width:'small',align:'right'}]}];
 const send=(res,status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Robots-Tag':'noindex'}).end(type==='application/json'?JSON.stringify(data):data);};
 const server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://127.0.0.1'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
  if(u.pathname.startsWith('/api/')){
   let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};
   if(u.pathname==='/api/session')return send(res,200,{csrf:'local-image-fixture'});
   if(u.pathname==='/api/content')return send(res,200,{content,revision,hasDraft:true});
   if(u.pathname==='/api/image'){const key=u.searchParams.get('path');if(!key||!imagePath(key))return send(res,403,{});if(uploaded.has(key))return send(res,200,uploaded.get(key),'image/webp');const file=path.resolve(root,key||'');if(!file.startsWith(root+path.sep))return send(res,403,{});return send(res,200,await fs.readFile(file),mime[path.extname(file)]||'application/octet-stream');}
   if(u.pathname==='/api/save'){const errors=validate(body.content);if(errors.length)return send(res,400,{error:errors.join('\n')});if(body.revision!==revision)return send(res,409,{error:'Reload the local draft.'});for(const upload of body.uploads||[])uploaded.set(upload.path,Buffer.from(upload.data,'base64'));content=structuredClone(body.content);revision='image-qa-'+Date.now();return send(res,200,{revision,hasDraft:true});}
   if(u.pathname==='/api/publish'){const errors=validate(content);if(errors.length)return send(res,400,{error:errors.join('\n')});published=structuredClone(content);return send(res,200,{buildUrl:'/qa-published/blog/image-editor-qa/'});}
   return send(res,404,{error:'Unsupported QA operation'});
  }
  if(u.pathname.startsWith('/qa-published/blog/')){if(!published)return send(res,404,'No local publication yet.','text/plain');const post=published.posts.find(p=>p.published&&u.pathname===`/qa-published/blog/${p.slug}/`);return post?send(res,200,blogPage(published.posts,post),'text/html'):send(res,404,'Not published.','text/plain');}
  if(u.pathname.startsWith('/assets/')){const key=u.pathname.slice(1);if(uploaded.has(key))return send(res,200,uploaded.get(key),'image/webp');const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(path.join(root,'assets')+path.sep))return send(res,403,{});return send(res,200,await fs.readFile(file),mime[path.extname(file)]||'application/octet-stream');}
  let name=decodeURIComponent(u.pathname);if(name.endsWith('/'))name+='index.html';let base=path.join(root,'dashboard/public');if(['/styles.css','/blog.css','/analytics.js'].includes(u.pathname))base=root;const file=path.resolve(base,'.'+name);if(!file.startsWith(base+path.sep))return send(res,403,{});return send(res,200,await fs.readFile(file),mime[path.extname(file)]||'application/octet-stream');
 }catch(e){send(res,e.code==='ENOENT'?404:500,{error:e.message});}});
 server.listen(4175,'127.0.0.1',()=>console.log('Image editor QA only: http://127.0.0.1:4175/admin/'));
}
start();


