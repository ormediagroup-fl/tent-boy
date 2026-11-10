import {stampPublication} from '../../content/blog.js';
import {validate,imagePath} from '../../content/schema.js';
const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const b64url=bytes=>b64(bytes).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const random=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
const hash=async value=>b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
const cookie=(req,name)=>req.headers.get('Cookie')?.split('; ').find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
function setCookie(name,value,age){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;}
async function github(token,route,body,method=body?'POST':'GET'){
 const r=await fetch('https://api.github.com'+route,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'TentBoyCMS','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 if(!r.ok){if(r.status===404)return null;fail(r.status===409||r.status===422?'Content changed elsewhere. Reload before saving; see draft recovery instructions.':'GitHub operation failed. Check installation permissions and service status.',r.status===409||r.status===422?409:502);}return r.status===204?{}:r.json();
}
async function installation(env){
 const now=Math.floor(Date.now()/1000),head=b64url(encoder.encode(JSON.stringify({alg:'RS256',typ:'JWT'}))),payload=b64url(encoder.encode(JSON.stringify({iat:now-60,exp:now+540,iss:env.APP_ID})));
 const pem=env.APP_PRIVATE_KEY.replace(/-----[^-]+-----|\s/g,'');
 const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),x=>x.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signature=b64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(`${head}.${payload}`))));
 const result=await github(`${head}.${payload}.${signature}`,`/app/installations/${env.INSTALLATION_ID}/access_tokens`,{repositories:[env.REPO],permissions:{contents:'write'}});
 if(!result?.token)fail('GitHub App installation unavailable.',503);return result.token;
}
const repo=env=>`/repos/${encodeURIComponent(env.OWNER)}/${encodeURIComponent(env.REPO)}`;
const draft='tentboy-cms-draft';
async function head(token,env,branch){return (await github(token,`${repo(env)}/git/ref/heads/${branch}`))?.object.sha;}
async function readContent(token,env,sha){const f=await github(token,`${repo(env)}/contents/content/site.json?ref=${sha}`);if(!f?.content)fail('Repository content/site.json not found.',502);return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(f.content.replaceAll('\n','')),c=>c.charCodeAt(0))));}
async function session(req,env){const id=cookie(req,'__Host-tentboy');if(!id)fail('Sign in to continue.',401);const row=await env.DB.prepare('SELECT * FROM sessions WHERE id = ? AND expires > ?').bind(await hash(id),Date.now()).first();if(!row||row.user_id!==String(env.ALLOWED_USER_ID))fail('Sign in to continue.',401);return row;}
export async function handle(req,env){
 const url=new URL(req.url),origin=url.origin;
 if(origin!==env.ADMIN_ORIGIN)fail('Unrecognized dashboard origin.',403);
 if(url.pathname==='/auth'){
  const state=random(),verifier=random();await env.DB.prepare('DELETE FROM oauth WHERE expires < ?').bind(Date.now()).run();
  await env.DB.prepare('INSERT INTO oauth (state,verifier,expires) VALUES (?,?,?)').bind(await hash(state),verifier,Date.now()+600000).run();
  const to=new URL('https://github.com/login/oauth/authorize');for(const [k,v]of Object.entries({client_id:env.OAUTH_CLIENT_ID,redirect_uri:`${origin}/callback`,state,code_challenge:await hash(verifier),code_challenge_method:'S256'}))to.searchParams.set(k,v);
  return new Response(null,{status:302,headers:{Location:to.href,'Set-Cookie':setCookie('__Host-oauth',state,600),'Cache-Control':'no-store'}});
 }
 if(url.pathname==='/callback'){
  const state=url.searchParams.get('state'),code=url.searchParams.get('code');if(!state||!code||cookie(req,'__Host-oauth')!==state)fail('Sign-in state mismatch. Please try again.',403);
  const row=await env.DB.prepare('DELETE FROM oauth WHERE state = ? AND expires > ? RETURNING verifier').bind(await hash(state),Date.now()).first();if(!row)fail('Sign-in expired. Try again.',403);
  const r=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.OAUTH_CLIENT_ID,client_secret:env.OAUTH_CLIENT_SECRET,code,redirect_uri:`${origin}/callback`,code_verifier:row.verifier})});
  const auth=await r.json();if(!r.ok||!auth.access_token)fail('GitHub sign-in failed.',403);const user=await github(auth.access_token,'/user');
  if(String(user?.id)!==String(env.ALLOWED_USER_ID))fail('This account is not authorized to manage Tent Boy.',403);
  const id=random(),csrf=random();await env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(Date.now()).run();await env.DB.prepare('INSERT INTO sessions (id,user_id,csrf,expires) VALUES (?,?,?,?)').bind(await hash(id),String(user.id),csrf,Date.now()+28800000).run();
  const headers=new Headers({Location:'/admin/','Cache-Control':'no-store'});headers.append('Set-Cookie',setCookie('__Host-tentboy',id,28800));headers.append('Set-Cookie',setCookie('__Host-oauth','',0));return new Response(null,{status:302,headers});
 }
 if(url.pathname.startsWith('/api/')){
  const s=await session(req,env);
  if(req.method!=='GET'){
   if(req.method!=='POST'||req.headers.get('Origin')!==origin||req.headers.get('X-CSRF-Token')!==s.csrf||!req.headers.get('Content-Type')?.startsWith('application/json'))fail('Invalid request origin or security token.',403);
   if(Number(req.headers.get('Content-Length')||0)>8000000)fail('Upload too large.',413);
  }
  if(url.pathname==='/api/session'&&req.method==='GET')return json({csrf:s.csrf});
  if(url.pathname==='/api/logout'&&req.method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(s.id).run();return json({ok:true},200,{'Set-Cookie':setCookie('__Host-tentboy','',0)});}
  const token=await installation(env),base=repo(env),main=await head(token,env,'main');if(!main)fail('main branch is missing.',503);
  const draftHead=await head(token,env,draft),revision=draftHead||main;
  if(url.pathname==='/api/content'&&req.method==='GET')return json({content:await readContent(token,env,revision),revision,mainRevision:main,hasDraft:revision!==main});
  if(url.pathname==='/api/image'&&req.method==='GET'){
   const file=url.searchParams.get('path');if(!file||!imagePath(file))fail('Invalid image path.');const asset=await github(token,`${base}/contents/${file}?ref=${revision}`);if(!asset?.content)fail('Image unavailable.',404);const bytes=Uint8Array.from(atob(asset.content.replaceAll('\n','')),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'image/jpeg','Cache-Control':'private, no-store'}});
  }
  const raw=await req.text();if(raw.length>8000000)fail('Upload too large.',413);let body;try{body=JSON.parse(raw);}catch{fail('Invalid JSON.');}
  if(body.revision!==revision)fail('A newer draft exists. Reload before saving.',409);
  if(url.pathname==='/api/save'&&req.method==='POST'){
   const errors=validate(body.content);if(errors.length)fail(errors.join('\n'));
   const uploads=body.uploads||[];if(!Array.isArray(uploads)||uploads.length>20)fail('Save no more than 20 uploaded images at once.');
   const commit=await github(token,`${base}/git/commits/${revision}`),tree=[];
   const seen=new Set();for(const upload of uploads){if(!/^assets\/uploads\/[a-f0-9-]{36}\.webp$/.test(upload.path)||seen.has(upload.path)||typeof upload.data!=='string'||upload.data.length>1400000)fail('Invalid uploaded image.');seen.add(upload.path);
    const bytes=Uint8Array.from(atob(upload.data),c=>c.charCodeAt(0));if(bytes.length<12||String.fromCharCode(...bytes.slice(0,4))!=='RIFF'||String.fromCharCode(...bytes.slice(8,12))!=='WEBP')fail('Uploads must be optimized WebP images.');
    const blob=await github(token,`${base}/git/blobs`,{content:upload.data,encoding:'base64'});tree.push({path:upload.path,mode:'100644',type:'blob',sha:blob.sha});}
   const text=JSON.stringify(body.content,null,2)+'\n';if(text.length>500000)fail('Catalog is too large.');
   tree.push({path:'content/site.json',mode:'100644',type:'blob',content:text});
   const nextTree=await github(token,`${base}/git/trees`,{base_tree:commit.tree.sha,tree});
   const next=await github(token,`${base}/git/commits`,{message:'Save Tent Boy CMS draft',tree:nextTree.sha,parents:[revision]});
   if(draftHead)await github(token,`${base}/git/refs/heads/${draft}`,{sha:next.sha,force:false},'PATCH');else await github(token,`${base}/git/refs`,{ref:`refs/heads/${draft}`,sha:next.sha});
   return json({revision:next.sha,hasDraft:true});
  }
  if(url.pathname==='/api/publish'&&req.method==='POST'){
   if(!draftHead||draftHead===main)fail('Save a draft before publishing.');const draftContent=await readContent(token,env,revision);const errors=validate(draftContent);if(errors.length)fail(errors.join('\n'));
   const compare=await github(token,`${base}/compare/${main}...${revision}`);if(compare.status!=='ahead')fail('The website changed since this draft began. Follow draft recovery instructions before publishing.',409);
   const published=stampPublication(await readContent(token,env,main),draftContent,new Date().toISOString());
   const publishedErrors=validate(published);if(publishedErrors.length)fail(publishedErrors.join('\n'));
   let publishRevision=revision;
   if(JSON.stringify(published)!==JSON.stringify(draftContent)){
    const commit=await github(token,`${base}/git/commits/${revision}`);
    const tree=await github(token,`${base}/git/trees`,{base_tree:commit.tree.sha,tree:[{path:'content/site.json',mode:'100644',type:'blob',content:JSON.stringify(published,null,2)+'\n'}]});
    const next=await github(token,`${base}/git/commits`,{message:'Record Tent Boy publication dates',tree:tree.sha,parents:[revision]});
    await github(token,`${base}/git/refs/heads/${draft}`,{sha:next.sha,force:false},'PATCH');publishRevision=next.sha;
   }
   // The installation token creates a push event; GITHUB_TOKEN would suppress it.
   await github(token,`${base}/git/refs/heads/main`,{sha:publishRevision,force:false},'PATCH');return json({ok:true,revision:publishRevision,buildUrl:`https://github.com/${env.OWNER}/${env.REPO}/actions`});
  }
  if(url.pathname==='/api/discard'&&req.method==='POST'){if(draftHead)await github(token,`${base}/git/refs/heads/${draft}`,{sha:main,force:true},'PATCH');return json({ok:true});}
  fail('Not found.',404);
 }
 if(url.pathname.startsWith('/preview/'))await session(req,env);
 if(url.pathname==='/' )return Response.redirect(`${origin}/admin/`,302);
 return env.ASSETS.fetch(req);
}
export default {async fetch(req,env){let response;try{response=await handle(req,env);}catch(e){response=json({error:e.status?e.message:'Service unavailable. Check server configuration.'},e.status||503);}const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('X-Frame-Options','SAMEORIGIN');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data:; connect-src 'self'; frame-src 'self' https://www.youtube-nocookie.com; frame-ancestors 'self'; form-action 'self'; base-uri 'self'");return new Response(response.body,{status:response.status,headers});}};
