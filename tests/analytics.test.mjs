import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const code=await fs.readFile(new URL('../analytics.js',import.meta.url),'utf8');
function run(saved,hostname='tentboy.orportraits.com'){
 const scripts=[],sections=[],footer={append(){}};
 function element(tag){return {tag,children:[],setAttribute(){},append(...items){this.children.push(...items)},focus(){},querySelector(){return this.children[0]}};}
 const context={location:{hostname,pathname:'/',reload(){}},Date,localStorage:{getItem(){return saved?JSON.stringify({choice:saved,time:Date.now()}):null},setItem(){}},window:{},document:{cookie:'',createElement:element,head:{append(s){scripts.push(s)}},body:{append(s){sections.push(s)}},querySelector(){return footer}}};
 vm.runInNewContext(code,context);return {scripts,sections,context};
}
test('no Google script before consent or after decline',()=>{for(const saved of [null,'declined'])assert.equal(run(saved).scripts.length,0)});
test('accept loads only the supplied measurement tag once',()=>{const d=run(null);d.sections[0].children[1].children[0].onclick();assert.equal(d.scripts.length,1);assert.equal(d.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-CETQYEJ9XJ');d.sections[0].children[1].children[0].onclick();assert.equal(d.scripts.length,1);assert.equal(d.context.window.dataLayer[0][2].analytics_storage,'denied')});
test('saved acceptance loads analytics; local and preview hosts never load it',()=>{assert.equal(run('accepted').scripts.length,1);assert.equal(run('accepted','localhost').scripts.length,0);assert.equal(run('accepted','tent-boy-admin.orportraits.workers.dev').scripts.length,0)});


