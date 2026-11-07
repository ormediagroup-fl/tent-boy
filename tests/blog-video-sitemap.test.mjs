import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {youtubeId,VIDEO_RATIOS,validVideo,validatePosts,renderBody,stampPublication,sitemapXML,IMAGE_WIDTHS,IMAGE_ALIGNMENTS,safeLink} from '../content/blog.js';
import {validate,publicContent,REQUIRED_DISCLOSURE} from '../content/schema.js';
const seed=JSON.parse(await fs.readFile(new URL('./fixtures/site.json',import.meta.url)));
const post=()=>({id:'video-post',slug:'video-post',title:'Video post',date:'2026-11-07',excerpt:'Summary',published:true,cover:'',body:[{type:'p',spans:[{text:'Video field notes'}]}]});
const video=extra=>({type:'video',url:'https://youtu.be/M7lc1UVf-VE',aspectRatio:'16:9',caption:'An optional caption',...extra});
const time1='2026-11-07T12:00:00.000Z',time2='2026-11-08T12:00:00.000Z';
test('YouTube URL parser accepts only supported HTTPS routes with exact video IDs',()=>{
 for(const url of ['https://youtube.com/watch?v=M7lc1UVf-VE','https://www.youtube.com/shorts/M7lc1UVf-VE?feature=share','https://m.youtube.com/watch?v=M7lc1UVf-VE&t=2','https://youtu.be/M7lc1UVf-VE?si=abc'])assert.equal(youtubeId(url),'M7lc1UVf-VE');
 for(const url of ['http://youtu.be/M7lc1UVf-VE','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://evil.test/M7lc1UVf-VE','https://user:secret@youtube.com/watch?v=M7lc1UVf-VE','https://youtube.com:444/watch?v=M7lc1UVf-VE','https://youtube.com/embed/M7lc1UVf-VE','https://youtu.be/short','https://youtu.be/M7lc1UVf-VE/extra','javascript:alert(1)','<iframe>'])assert.equal(youtubeId(url),null,url);
});
test('video blocks validate, escape captions, restrict CSS and render privacy-enhanced lazy embeds',()=>{
 for(const aspectRatio of VIDEO_RATIOS){const v=video({aspectRatio,caption:'<script>bad</script>'});assert.deepEqual(validatePosts([{...post(),body:[...post().body,v]}]),[]);const html=renderBody([v]);assert.match(html,/https:\/\/www.youtube-nocookie.com\/embed\/M7lc1UVf-VE/);assert.match(html,/loading="lazy"/);assert.match(html,/allowfullscreen/);assert.match(html,/referrerpolicy="strict-origin-when-cross-origin"/);assert.ok(!html.includes('autoplay'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!renderBody([video({caption:''})]).includes('figcaption'));}
 for(const extra of [{aspectRatio:'9/16'},{aspectRatio:'16:9" onload="evil'},{caption:1},{caption:'x'.repeat(2001)},{url:'https://evil.test/'}]){assert.equal(validVideo(video(extra)),false);assert.equal(renderBody([video(extra)]),'');assert.ok(validatePosts([{...post(),body:[video(extra)]}]).length);}
});
test('editor serializer preserves video fields and excludes image controls',async()=>{
 const code=(await fs.readFile(new URL('../dashboard/public/admin/rich-editor.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/,'').replaceAll('export function ','function ');
 const context={renderBody,IMAGE_WIDTHS,IMAGE_ALIGNMENTS,youtubeId,VIDEO_RATIOS,AbortController,safeLink};vm.createContext(context);vm.runInContext(code,context);
 const f={nodeType:1,tagName:'FIGURE',dataset:{videoUrl:video().url,videoRatio:'9:16'},querySelector:()=>({textContent:'Original caption'})};
 let blocks=context.readBody({childNodes:[f,{nodeType:1,dataset:{imageControls:'true'}}]});assert.equal(blocks.length,1);assert.deepEqual(JSON.parse(JSON.stringify(blocks[0])),video({aspectRatio:'9:16',caption:'Original caption'}));
 f.dataset.videoUrl='https://youtube.com/shorts/M7lc1UVf-VE';f.querySelector=()=>null;blocks=context.readBody({childNodes:[f]});assert.equal(blocks[0].caption,'');assert.equal(blocks[0].url,f.dataset.videoUrl);assert.equal(blocks[0].aspectRatio,'9:16');
});
test('publication stamps new posts, ignores client-supplied dates, and survives serialization',()=>{
 const next={...structuredClone(seed),posts:[{...post(),body:[...post().body,video()],publishedAt:time2,modifiedAt:time2}],publication:{homeModifiedAt:time2}};
 const published=stampPublication(seed,next,time1);assert.equal(published.posts[0].publishedAt,time1);assert.equal(published.posts[0].modifiedAt,time1);assert.equal(published.publication.blogModifiedAt,time1);assert.equal(published.publication.homeModifiedAt,undefined);assert.deepEqual(validate(published),[]);
 assert.deepEqual(JSON.parse(JSON.stringify(published)).posts[0].body.at(-1),video());
 assert.match(sitemapXML(published),new RegExp('<lastmod>'+time1+'</lastmod>'));assert.match(sitemapXML(published),/\/blog\/video-post\//);
});
test('material post edits update only relevant lastmod; draft saves and unchanged rebuilds stay stable',()=>{
 const first=stampPublication(seed,{...structuredClone(seed),posts:[post()]},time1),changed=structuredClone(first);changed.posts[0].body.push(video());
 const edited=stampPublication(first,changed,time2);assert.equal(edited.posts[0].modifiedAt,time2);assert.equal(edited.posts[0].publishedAt,time1);assert.equal(edited.publication.blogModifiedAt,time1); // index summary did not change
 const unchanged=stampPublication(edited,structuredClone(edited),'2026-11-09T12:00:00.000Z');assert.equal(sitemapXML(unchanged),sitemapXML(edited));
 const draft={...post(),id:'draft',slug:'private-draft',published:false};const saved=structuredClone(edited);saved.posts.push(draft);saved.posts[1].body.push(video());assert.equal(sitemapXML(saved),sitemapXML(edited));assert.equal(sitemapXML(stampPublication(edited,saved,'2026-11-10T12:00:00.000Z')),sitemapXML(edited));
});
test('unpublishing removes URLs and updates index; republishing retains original publication',()=>{
 const first=stampPublication(seed,{...structuredClone(seed),posts:[post()]},time1),hidden=structuredClone(first);hidden.posts[0].published=false;
 const unpublished=stampPublication(first,hidden,time2);assert.ok(!sitemapXML(unpublished).includes('/blog/video-post/'));assert.equal(unpublished.publication.blogModifiedAt,time2);assert.equal(publicContent(unpublished).posts.length,0);
 hidden.posts[0].published=true;const republished=stampPublication(unpublished,hidden,'2026-11-09T12:00:00.000Z');assert.equal(republished.posts[0].publishedAt,time1);assert.equal(republished.posts[0].modifiedAt,'2026-11-09T12:00:00.000Z');
});
test('legacy timestamps are omitted if unknown; invalid dates rejected and sitemap URLs stable',()=>{
 const data={...structuredClone(seed),posts:[post()]};assert.ok(!sitemapXML(data).includes('lastmod'));assert.ok(sitemapXML(data).includes('<loc>https://tentboy.orportraits.com/</loc>'));assert.ok(sitemapXML(data).includes('<loc>https://tentboy.orportraits.com/blog/</loc>'));
 data.posts[0].modifiedAt='<script>';assert.ok(validate(data).length);assert.ok(!sitemapXML(data).includes('<script>'));assert.throws(()=>stampPublication(seed,seed,'today'));
 const changed=structuredClone(seed);changed.home.intro+=' More.';const stamped=stampPublication(seed,changed,time1);assert.equal(stamped.publication.homeModifiedAt,time1);
});
test('Amazon unavailable mode preserves products, links, uploads and disclosure without secrets or network access',async()=>{
 const data=structuredClone(seed);data.products[0].image='assets/custom.webp';data.products[0].alt='My photo';const result=publicContent(data);assert.equal(result.products[0].image,'assets/custom.webp');assert.deepEqual(result.products.map(p=>p.url),data.products.filter(p=>p.published).map(p=>p.url));assert.equal(REQUIRED_DISCLOSURE,'As an Amazon Associate I earn from qualifying purchases.');
 const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');assert.ok(app.includes('Product photo coming soon'));assert.ok(app.includes('img.onerror='));assert.ok(!app.includes('AMAZON_CLIENT_SECRET'));assert.ok(!app.includes('m.media-amazon.com'));assert.ok(app.includes('if(p.image)'));
});
test('workflow retains main push deployment, full history and no draft-branch publishing',async()=>{
 const workflow=await fs.readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');assert.match(workflow,/branches: \[main\]/);assert.match(workflow,/fetch-depth: 0/);assert.match(workflow,/npm run build/);assert.match(workflow,/PUBLISH_ENABLED/);assert.ok(!workflow.includes('tentboy-cms-draft'));
 const res=await (await import('../dashboard/src/worker.js')).default.fetch(new Request('https://admin.test/admin/'),{ADMIN_ORIGIN:'https://admin.test',ASSETS:{fetch:()=>new Response('admin')}});const csp=res.headers.get('Content-Security-Policy');assert.ok(csp.includes("frame-src 'self' https://www.youtube-nocookie.com;"));assert.ok(!csp.includes('*.youtube.com'));
});
