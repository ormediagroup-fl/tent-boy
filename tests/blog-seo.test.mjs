import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {postSEO,postMetadata,suggestSlug,suggestDescription,validatePosts,stampPublication,sitemapXML} from '../content/blog.js';
import {blogPage} from '../blog-view.js';
const post=()=>({id:'seo-test',slug:'existing-url',title:'A portrait market day',date:'2026-11-10',excerpt:'',published:true,cover:'',coverAlt:'',body:[{type:'p',spans:[{text:'Learn how to set up a canopy portrait studio, organize your market sessions, and deliver photographs that bring families back.'}]}]});
test('legacy defaults suggest readable metadata without changing content or URLs',()=>{
 const p=post(),before=JSON.stringify(p),s=postSEO(p);assert.equal(s.title,p.title);assert.match(s.description,/Learn how/);assert.equal(s.url,'https://tentboy.orportraits.com/blog/existing-url/');assert.equal(JSON.stringify(p),before);assert.equal(suggestSlug('John’s Café: Portraits & Markets!'),'johns-cafe-portraits-markets');
 assert.ok(suggestDescription({...p,excerpt:'A complete, useful introduction to a portrait studio at a local weekend market. '+('Further details follow here. '.repeat(8))}).endsWith('.'));
 assert.ok(suggestDescription({...p,excerpt:'Long paragraph without punctuation '.repeat(20)}).length<=160);
});
test('manual SEO survives edits and JSON save; SEO-only changes update sitemap lastmod',()=>{
 const p={...post(),seoTitle:'Custom '+('x'.repeat(70)),metaDescription:'Description '.repeat(20),focusKeyword:'canopy photography',socialTitle:'Share this',socialDescription:'For social media',socialImage:'assets/social.jpg'};
 assert.deepEqual(validatePosts([p]),[]);const data={posts:[p],socials:[],products:[],categories:[]};
 const first=stampPublication({posts:[],socials:[],products:[],categories:[]},data,'2026-11-10T12:00:00.000Z'),saved=JSON.parse(JSON.stringify(first));saved.posts[0].title='Revised article title';saved.posts[0].body[0].spans[0].text+=' More text.';
 const edit=stampPublication(first,saved,'2026-11-10T13:00:00.000Z');for(const k of ['seoTitle','metaDescription','focusKeyword','socialTitle','socialDescription','socialImage'])assert.equal(edit.posts[0][k],p[k]);
 const seoEdit=structuredClone(edit);seoEdit.posts[0].metaDescription='Updated search description';const updated=stampPublication(edit,seoEdit,'2026-11-10T14:00:00.000Z');assert.equal(updated.posts[0].modifiedAt,'2026-11-10T14:00:00.000Z');assert.match(sitemapXML(updated),/14:00:00/);
 assert.deepEqual(stampPublication(updated,updated,'2026-11-10T15:00:00.000Z'),updated);
});
test('article HTML has one metadata set, absolute URLs, dates, safe structured data and one H1',()=>{
 const p={...post(),seoTitle:'Search <title>',metaDescription:'Custom description',socialTitle:'Social title',socialDescription:'</script><script>alert(1)</script>',socialImage:'assets/social.jpg',publishedAt:'2026-11-10T12:00:00.000Z',modifiedAt:'2026-11-10T13:00:00.000Z'};
 const html=blogPage([p],p);for(const pattern of [/<title>/g,/<meta name="description"/g,/<link rel="canonical"/g,/<meta property="og:title"/g,/<h1>/g])assert.equal((html.match(pattern)||[]).length,1);
 assert.match(html,/Search &lt;title&gt;/);assert.match(html,/https:\/\/tentboy.orportraits.com\/assets\/social.jpg/);assert.match(html,/twitter:card/);assert.match(html,/article:modified_time/);assert.match(html,/index,follow/);
 const json=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],schema=JSON.parse(json);assert.equal(schema['@type'],'BlogPosting');assert.equal(schema.dateModified,p.modifiedAt);assert.equal(schema.mainEntityOfPage['@id'],postSEO(p).url);assert.ok(!json.includes('</script>'));
 assert.match(postMetadata({...p,published:false}),/noindex,nofollow/);
 assert.equal(postSEO({...post(),cover:'assets/cover.jpg'}).image,'https://tentboy.orportraits.com/assets/cover.jpg');
 assert.ok(validatePosts([{...post(),socialImage:'https://evil.test/image.jpg'}]).length);
 assert.ok(validatePosts([null]).length);assert.ok(validatePosts([{...post(),previousSlugs:'invalid'}]).length);
});
test('published slug changes retain history; collisions rejected and drafts/old URLs excluded from sitemap',()=>{
 const p=post(),a={posts:[p],socials:[],products:[],categories:[]},b=structuredClone(a);b.posts[0].slug='new-url';let next=stampPublication(a,b,'2026-11-10T12:00:00.000Z');assert.deepEqual(next.posts[0].previousSlugs,['existing-url']);
 const c=structuredClone(next);c.posts[0].slug='third-url';next=stampPublication(next,c,'2026-11-10T13:00:00.000Z');assert.deepEqual(next.posts[0].previousSlugs,['existing-url','new-url']);assert.ok(validatePosts([...next.posts,{...post(),id:'other'}]).length);
 next.posts.push({...post(),id:'draft',slug:'draft-url',published:false});const xml=sitemapXML(next);assert.match(xml,/third-url/);assert.ok(!xml.includes('existing-url'));assert.ok(!xml.includes('draft-url'));
});
test('static build emits SEO images and redirects, preserves source and excludes draft artifacts',async()=>{
 const root=path.resolve(import.meta.dirname,'..'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'tentboy-seo-'));
 try{
 for(const f of ['scripts','content','assets','index.html','styles.css','app.js','analytics.js','social-icons.js','blog.css','blog-view.js','blog-preview.js','contact-view.js','contact.css','contact.js','contact-form.js','.nojekyll','package.json'])await fs.cp(path.join(root,f),path.join(temp,f),{recursive:true});
 const seed=JSON.parse(await fs.readFile(path.join(temp,'content/site.json'),'utf8')),p={...post(),seoTitle:'Build SEO title',socialImage:'assets/04-finished-fall-set.jpg',previousSlugs:['old-url'],modifiedAt:'2026-11-10T13:00:00.000Z'};
 seed.products=[];seed.categories=[];seed.home.heroImage='assets/04-finished-fall-set.jpg';seed.guide.visible=false;seed.guide.cover='';
 seed.posts=[p,{...post(),id:'draft',slug:'hidden-draft',published:false}];const source=JSON.stringify(seed);await fs.writeFile(path.join(temp,'content/site.json'),source);await fs.mkdir(path.join(temp,'dashboard/public'),{recursive:true});
 const build=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,env:{...process.env,SHARP_MODULE:path.join(root,'node_modules/sharp')},encoding:'utf8'});assert.equal(build.status,0,build.stderr);
 const html=await fs.readFile(path.join(temp,'dist/blog/existing-url/index.html'),'utf8');assert.match(html,/<title>Build SEO title<\/title>/);assert.match(html,/og:image[^>]+\.webp/);const image=html.match(/property="og:image" content="https:\/\/tentboy.orportraits.com\/(.*?)"/)[1];await fs.access(path.join(temp,'dist',image));
 assert.match(await fs.readFile(path.join(temp,'dist/_redirects'),'utf8'),/old-url\/ https:\/\/tentboy.orportraits.com\/blog\/existing-url\/ 301/);assert.match(await fs.readFile(path.join(temp,'dist/blog/old-url/index.html'),'utf8'),/http-equiv="refresh"/);
 const xml=await fs.readFile(path.join(temp,'dist/sitemap.xml'),'utf8');assert.ok(!xml.includes('hidden-draft'));assert.ok(!xml.includes('old-url'));assert.match(xml,/<lastmod>2026-11-10T13:00:00.000Z<\/lastmod>/);await assert.rejects(fs.access(path.join(temp,'dist/blog/hidden-draft/index.html')));assert.equal(await fs.readFile(path.join(temp,'content/site.json'),'utf8'),source);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
