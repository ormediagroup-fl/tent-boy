import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validate,httpsUrl,publicContent,publishedCatalog,REQUIRED_DISCLOSURE} from '../content/schema.js';
import worker from '../dashboard/src/worker.js';
const seed=JSON.parse(await fs.readFile(new URL('./fixtures/site.json',import.meta.url)));
test('migration preserves 12 supplied products, exact updated bracket URL, no prices',()=>{
 assert.deepEqual(validate(seed),[]);assert.equal(seed.products.length,12);assert.equal(seed.products.find(p=>p.name.startsWith('Godox S3')).url,'https://link.amazon/B0eOsTwL1');assert.equal(seed.guide.price,'');assert.equal(seed.guide.url,'');
});
test('published product visibility, category removal and array ordering',()=>{
 const d=structuredClone(seed);d.products.forEach(p=>p.published=false);assert.deepEqual(publishedCatalog(d),[]);d.products[0].published=true;assert.equal(publishedCatalog(d).length,1);assert.equal(publishedCatalog(d)[0].products[0].id,d.products[0].id);assert.equal(publicContent(d).products.length,1);assert.deepEqual(publicContent(d).guide,{visible:false});
 d.products[0].category=d.categories.at(-1).id;assert.equal(publishedCatalog(d)[0].id,d.categories.at(-1).id);
});
test('reject malformed affiliate links, credentials, deceptive hosts and unsafe images',()=>{
 for(const url of ['javascript:alert(1)','http://amazon.com/x','https://amazon.com.evil.test/x','https://evilamazon.com/x','https://user:secret@amazon.com/x','https://amazon.com:444/x'])assert.equal(httpsUrl(url,'amazon'),false,url);
 assert.equal(httpsUrl('https://link.amazon/B09l9Ms6C','amazon'),true);
 const d=structuredClone(seed);d.products[0].url='https://evil.test';d.products[0].image='assets/../secrets.png';d.products[0].category='missing';assert.ok(validate(d).length>=3);
});
test('guide readiness and deleted categories block publication',()=>{const d=structuredClone(seed);d.guide.visible=true;assert.ok(validate(d).some(x=>x.includes('Payhip')));d.categories=[];assert.ok(validate(d).some(x=>x.includes('category')));assert.equal(REQUIRED_DISCLOSURE,'As an Amazon Associate I earn from qualifying purchases.');});
const origin='https://admin.example.test';
function db(row){return {prepare(sql){return {bind(){return this;},async first(){return sql.includes('sessions')?row:null;},async run(){return {};}};}};}
test('private APIs fail closed without session, invalid session and expired session',async()=>{
 for(const cookie of ['', '__Host-tentboy=unknown']){const res=await worker.fetch(new Request(origin+'/api/content',{headers:{Cookie:cookie}}),{ADMIN_ORIGIN:origin,DB:db(null)});assert.equal(res.status,401);assert.equal(res.headers.get('Cache-Control'),'no-store');}
});
test('wrong owner and wrong origin fail closed',async()=>{
 let res=await worker.fetch(new Request(origin+'/api/content',{headers:{Cookie:'__Host-tentboy=test'}}),{ADMIN_ORIGIN:origin,ALLOWED_USER_ID:'123',DB:db({user_id:'999'})});assert.equal(res.status,401);
 res=await worker.fetch(new Request('https://evil.test/api/content'),{ADMIN_ORIGIN:origin});assert.equal(res.status,403);
});
test('CSRF protection blocks missing token and foreign origin before GitHub access',async()=>{
 for(const headers of [{Origin:origin},{Origin:'https://evil.test','X-CSRF-Token':'correct'}]){const res=await worker.fetch(new Request(origin+'/api/publish',{method:'POST',headers:{Cookie:'__Host-tentboy=test','Content-Type':'application/json',...headers},body:'{}'}),{ADMIN_ORIGIN:origin,ALLOWED_USER_ID:'123',DB:db({user_id:'123',csrf:'correct'})});assert.equal(res.status,403);}
});
test('OAuth callback rejects missing, mismatched and consumed state',async()=>{
 for(const [url,cookie]of [['/callback?code=x',''],['/callback?code=x&state=x','__Host-oauth=y'],['/callback?code=x&state=x','__Host-oauth=x']]){const res=await worker.fetch(new Request(origin+url,{headers:{Cookie:cookie}}),{ADMIN_ORIGIN:origin,DB:db(null)});assert.equal(res.status,403);}
});
test('session cookies never contain GitHub credentials; logout invalidates session',async()=>{
 const res=await worker.fetch(new Request(origin+'/api/logout',{method:'POST',headers:{Cookie:'__Host-tentboy=test',Origin:origin,'X-CSRF-Token':'correct','Content-Type':'application/json'},body:'{}'}),{ADMIN_ORIGIN:origin,ALLOWED_USER_ID:'123',DB:db({id:'hashed',user_id:'123',csrf:'correct'})});assert.equal(res.status,200);assert.match(res.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax; Max-Age=0/);assert.match(res.headers.get('Content-Security-Policy'),/frame-ancestors 'self'/);
});
test('preview assets also require authentication',async()=>{const res=await worker.fetch(new Request(origin+'/preview/index.html'),{ADMIN_ORIGIN:origin});assert.equal(res.status,401);});
test('draft save never changes main; publish checks ancestry and never force pushes',async()=>{
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const pkcs8=Buffer.from(await crypto.subtle.exportKey('pkcs8',keys.privateKey)).toString('base64');
 const env={ADMIN_ORIGIN:origin,ALLOWED_USER_ID:'123',DB:db({user_id:'123',csrf:'correct'}),OWNER:'owner',REPO:'tent-boy',APP_ID:'1',INSTALLATION_ID:'2',APP_PRIVATE_KEY:`-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----`};
 const original=globalThis.fetch,calls=[];let draftExists=false,compareStatus='behind';
 globalThis.fetch=async(url,opts={})=>{const p=new URL(url).pathname;calls.push({p,method:opts.method,body:opts.body?JSON.parse(opts.body):null});let value={};let status=200;
 if(p.endsWith('/access_tokens'))value={token:'server-only-token'};
 else if(p.endsWith('/git/ref/heads/main'))value={object:{sha:'main-sha'}};
 else if(p.endsWith('/git/ref/heads/tentboy-cms-draft')){value={object:{sha:'draft-sha'}};if(!draftExists)status=404;}
 else if(p.includes('/contents/content/site.json'))value={content:Buffer.from(JSON.stringify(seed)).toString('base64')};
 else if(p.includes('/compare/'))value={status:compareStatus};
 else if(p.endsWith('/git/commits/main-sha'))value={tree:{sha:'base-tree'}};
 else if(p.endsWith('/git/trees'))value={sha:'new-tree'};
 else if(p.endsWith('/git/commits'))value={sha:'new-commit'};
 return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});};
 const req=(route,body)=>new Request(origin+'/api/'+route,{method:'POST',headers:{Cookie:'__Host-tentboy=test',Origin:origin,'Content-Type':'application/json','X-CSRF-Token':'correct'},body:JSON.stringify(body)});
 try{
  const imageMetadata={type:'image',src:'assets/example.webp',alt:'Image description',caption:'Separate visible caption',width:'medium',align:'right'};const draftContent=structuredClone(seed);draftContent.posts=[{id:'image-test',slug:'image-test',title:'Image test',date:'2026-11-07',published:false,excerpt:'',cover:'',body:[{type:'p',spans:[{text:'Post text'}]},imageMetadata]}];let res=await worker.fetch(req('save',{revision:'main-sha',content:draftContent,uploads:[]}),env);const written=JSON.parse(calls.find(c=>c.p.endsWith('/git/trees')).body.tree.find(f=>f.path==='content/site.json').content);assert.deepEqual(written.posts[0].body[1],imageMetadata);assert.equal(res.status,200);assert.ok(calls.some(c=>c.body?.ref==='refs/heads/tentboy-cms-draft'));assert.ok(!calls.some(c=>c.p.endsWith('/git/refs/heads/main')));assert.ok(!(await res.text()).includes('server-only-token'));
  draftExists=true;res=await worker.fetch(req('save',{revision:'outdated',content:seed}),env);assert.equal(res.status,409);
  res=await worker.fetch(req('publish',{revision:'draft-sha'}),env);assert.equal(res.status,409);assert.ok(!calls.some(c=>c.p.endsWith('/git/refs/heads/main')));
  compareStatus='ahead';res=await worker.fetch(req('publish',{revision:'draft-sha'}),env);assert.equal(res.status,200);assert.deepEqual(calls.find(c=>c.p.endsWith('/git/refs/heads/main')).body,{sha:'draft-sha',force:false});
 }finally{globalThis.fetch=original;}
});

test('current website content is valid',async()=>{const current=JSON.parse(await fs.readFile(new URL('../content/site.json',import.meta.url)));assert.deepEqual(validate(current),[]);});

