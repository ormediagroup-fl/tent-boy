import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CONTACT_SUBJECTS,isAtlasEndpoint,validateContact,sendContact,initializeContactForm} from '../contact-form.js';
import {contactPage} from '../contact-view.js';
import {blogPage} from '../blog-view.js';
import {sitemapXML} from '../content/blog.js';
// Atlas's documented public example. Every submission below uses a fetch double.
// Nothing is ever sent to this endpoint or any third party by these tests.
const endpoint = 'https://atlasforms.app/f/abc123xyz';
const values = () => ({name:'Local QA',email:'qa@example.test',subject:'Gear Question',message:'A local test message.',_gotcha:''});
const success = () => Response.json({success:true,submission_id:'local-only'});

test('only the official public Atlas endpoint format is accepted',()=>{
  assert.equal(isAtlasEndpoint(endpoint),true);
  for(const url of ['', 'https://atlasforms.app/f/YOUR_FORM_ID','http://atlasforms.app/f/abc','https://atlasforms.app.evil.test/f/abc','https://user:secret@atlasforms.app/f/abc','https://atlasforms.app/api/v1/submissions','https://atlasforms.app/f/abc?key=secret','https://atlasforms.app:8443/f/abc','javascript:alert(1)']) assert.equal(isAtlasEndpoint(url),false,url);
  assert.throws(()=>contactPage({endpoint:'private-key'}),/ATLAS_FORM_ENDPOINT/);
});
test('all required fields, subject choices, email format and length limits validate',()=>{
  assert.deepEqual(validateContact(values()),{});
  assert.deepEqual(Object.keys(validateContact({name:' ',email:'',subject:'',message:'\n'})),['name','email','subject','message']);
  for(const email of ['broken','no@','no space@example.com','a@b','@example.com'])assert.ok(validateContact({...values(),email}).email);
  for(const subject of CONTACT_SUBJECTS)assert.deepEqual(validateContact({...values(),subject}),{});
  assert.ok(validateContact({...values(),subject:'<script>'}).subject);
  assert.ok(validateContact({...values(),name:'x'.repeat(121)}).name);
  assert.ok(validateContact({...values(),message:'x'.repeat(6001)}).message);
});
test('submission uses documented JSON POST, honeypot and no credentials; never follows remote redirects',async()=>{
  let request;
  const id=await sendContact(endpoint,{...values(),name:' QA ',message:' Hello ',unexpected:'must not send'}, {fetchImpl:async(url,options)=>{request={url,...options};return success();}});
  assert.equal(id,'local-only');assert.equal(request.url,endpoint);assert.equal(request.method,'POST');assert.equal(request.headers['Content-Type'],'application/json');assert.equal(request.headers.Accept,'application/json');assert.equal(request.credentials,'omit');assert.equal(request.redirect,'error');assert.equal(request.referrerPolicy,'strict-origin-when-cross-origin');
  assert.deepEqual(JSON.parse(request.body),{name:'QA',email:'qa@example.test',subject:'Gear Question',message:'Hello',_gotcha:''});assert.ok(!request.headers.Authorization);
  let called=false;await assert.rejects(sendContact('',values(),{fetchImpl:async()=>{called=true;}}));assert.equal(called,false);
});
test('HTTP errors, malformed success and negative results never count as successful delivery',async()=>{
  for(const response of [Response.json({error:'bad'},{status:400}),Response.json({error:'bad'},{status:403}),Response.json({error:'limit'},{status:429}),Response.json({error:'down'},{status:500}),new Response('<html>not a confirmation</html>'),Response.json({success:false}),Response.json({success:true}),Response.json({success:true,submission_id:''})])await assert.rejects(sendContact(endpoint,values(),{fetchImpl:async()=>response}));
});

function fixture(configured=endpoint){
  const nodes=new Map(),listeners={},fields={};let focused='';
  function node(id){return {value:'',textContent:'',hidden:true,disabled:false,attributes:{},events:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,fn){this.events[k]=fn;},focus(){focused=id;}};}
  for(const [key,value] of Object.entries(values())){fields[key]=node(key);fields[key].value=value;nodes.set('#'+key+'-error',node(key+'-error'));}
  for(const id of ['fieldset','button[type="submit"]','#form-error','#form-status','#form-unavailable'])nodes.set(id,node(id));
  const form={dataset:{atlasEndpoint:configured},elements:{namedItem:key=>fields[key]},querySelector:selector=>nodes.get(selector),addEventListener:(name,fn)=>listeners[name]=fn,setAttribute(){},removeAttribute(){}};
  return {form,fields,nodes,focus:()=>focused,submit:()=>listeners.submit({preventDefault(){}})};
}
test('unconfigured form is disabled and cannot send anything',async()=>{
  const f=fixture('');let sent=0;initializeContactForm(f.form,{fetchImpl:async()=>{sent++;}});assert.equal(f.nodes.get('fieldset').disabled,true);assert.equal(f.nodes.get('#form-unavailable').hidden,false);await f.submit();assert.equal(sent,0);
});
test('invalid submission announces field errors and focuses first invalid field without sending',async()=>{
  const f=fixture();f.fields.name.value=' ';f.fields.email.value='bad';let sent=0;initializeContactForm(f.form,{fetchImpl:async()=>{sent++;}});await f.submit();assert.equal(sent,0);assert.equal(f.focus(),'name');assert.equal(f.fields.email.attributes['aria-invalid'],'true');assert.equal(f.nodes.get('#email-error').hidden,false);assert.equal(f.fields.message.value,values().message);
  f.fields.email.events.input();assert.equal(f.nodes.get('#email-error').hidden,true);assert.equal(f.fields.email.attributes['aria-invalid'],undefined);
});
test('confirmed success alone redirects to the fixed local thank-you page',async()=>{
  const f=fixture();const paths=[];initializeContactForm(f.form,{fetchImpl:async()=>success(),navigate:path=>paths.push(path)});await f.submit();assert.deepEqual(paths,['/thank-you/']);assert.equal(f.nodes.get('button[type="submit"]').disabled,true);
});
test('failed submissions retain every field, show accessible errors and permit retry',async()=>{
  for(const fetchImpl of [async()=>Response.json({error:'<script>do not render</script>'},{status:500}),async()=>{throw new TypeError('Network unavailable');},async()=>Response.json({success:false})]){
    const f=fixture();let navigated=false;initializeContactForm(f.form,{fetchImpl,navigate:()=>navigated=true});await f.submit();assert.equal(navigated,false);assert.equal(f.nodes.get('fieldset').disabled,false);assert.equal(f.nodes.get('button[type="submit"]').disabled,false);assert.equal(f.nodes.get('#form-error').hidden,false);assert.equal(f.focus(),'#form-error');assert.ok(!f.nodes.get('#form-error').textContent.includes('<script>'));for(const [key,value]of Object.entries(values()))assert.equal(f.fields[key].value,value);
  }
});
test('slow requests time out without clearing the message; duplicate submits are blocked',async()=>{
  const f=fixture();let calls=0,navigations=0;
  initializeContactForm(f.form,{timeoutMs:5,fetchImpl:async(url,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Timeout','AbortError'))));},navigate:()=>navigations++});
  const pending=f.submit();await f.submit();await pending;assert.equal(calls,1);assert.equal(navigations,0);assert.equal(f.fields.message.value,values().message);assert.equal(f.nodes.get('fieldset').disabled,false);
});
test('pages preserve branding, disclosures, socials and accessible fields; no endpoint is fabricated',async()=>{
  const socials=[{label:'TikTok',url:'https://www.tiktok.com/@orportraits'}],html=contactPage({socials});
  assert.ok(html.includes('Get in <em>Touch</em>'));assert.ok(html.includes('data-atlas-endpoint=""'));assert.ok(!html.includes('action="https://'));assert.ok(html.includes('<fieldset disabled>'));assert.ok(html.includes('name="_gotcha"'));assert.ok(html.includes('type="email"'));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('As an Amazon Associate I earn from qualifying purchases.'));assert.ok(html.includes(socials[0].url));assert.ok(html.includes('aria-current="page">Contact'));
  const thanks=contactPage({thankYou:true,socials});assert.ok(thanks.includes('Message <em>Sent!</em>'));assert.ok(thanks.includes('noindex,follow'));assert.ok(thanks.includes('Back to Tent Boy'));assert.ok(!thanks.includes('<form'));
  const home=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');assert.equal((home.match(/href="\/contact\/"/g)||[]).length,2);assert.equal((blogPage([],null,socials).match(/href="\/contact\/"/g)||[]).length,2);
  assert.ok(sitemapXML({posts:[]}).includes('https://tentboy.orportraits.com/contact/'));assert.ok(!sitemapXML({posts:[]}).includes('/thank-you/'));
});
