export const VIDEO_RATIOS = ['16:9','9:16'];
export function youtubeId(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;const h=u.hostname.toLowerCase();let id;if(h==='youtu.be')id=u.pathname.match(/^\/([\w-]{11})\/?$/)?.[1];else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(h))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/shorts\/([\w-]{11})\/?$/)?.[1];return typeof id==='string'&&/^[\w-]{11}$/.test(id)?id:null;}catch{return null;}}
export function validVideo(b){return b&&typeof b.url==='string'&&b.url.length<=2048&&youtubeId(b.url)!==null&&VIDEO_RATIOS.includes(b.aspectRatio)&&(b.caption===undefined||typeof b.caption==='string'&&b.caption.length<=2000);}
export const IMAGE_WIDTHS = ['small','medium','large','full'];
export const IMAGE_ALIGNMENTS = ['left','center','right'];
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeLink(value) { try { const u=new URL(value); return u.protocol==='https:'&&!u.username&&!u.password&&!u.port; } catch { return false; } }
export function validImage(value) { return typeof value==='string' && /^assets\/[a-zA-Z0-9_/-]+\.(jpg|jpeg|png|webp)$/i.test(value)&&!value.includes('..'); }
export function validatePosts(posts=[]) {
 const errors=[],ids=new Set(),slugs=new Set(),check=(ok,msg)=>{if(!ok)errors.push(msg);};
 if(!Array.isArray(posts)||posts.length>200)return ['Maximum 200 blog posts.'];
 for(const p of posts){
  if(!p||typeof p!=='object'){errors.push('Invalid blog post.');continue;}
  check(typeof p.id==='string'&&/^[a-z0-9-]{1,80}$/.test(p.id)&&!ids.has(p.id),'Blog posts need unique IDs.');ids.add(p.id);
  check(typeof p.slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)&&p.slug.length<=100&&!slugs.has(p.slug),'Posts need unique URL names using lowercase letters, numbers and hyphens.');slugs.add(p.slug);
  check(typeof p.title==='string'&&p.title.trim()&&p.title.length<=180,'Post title is required (180 characters maximum).');
  check(typeof p.excerpt==='string'&&p.excerpt.length<=500,'Post summaries must be under 500 characters.');
  for(const key of ['publishedAt','modifiedAt'])check(p[key]===undefined||validTimestamp(p[key]),'Invalid post publication timestamp.');
  check(typeof p.published==='boolean','Post visibility must be a switch.');
  check(typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&!Number.isNaN(Date.parse(p.date))&&new Date(p.date).toISOString().slice(0,10)===p.date,'Enter a valid post date.');
  check(!p.cover||validImage(p.cover),'Post cover must be an uploaded image.');check(!p.cover||typeof p.coverAlt==='string'&&p.coverAlt.trim(),'Add a description for the post cover.');
  if(!Array.isArray(p.body)||p.body.length>500){errors.push('Invalid post body (maximum 500 blocks).');continue;}
  let count=0;
  for(const b of p.body){
   if(!b||!['p','h2','h3','blockquote','ul','ol','image','video'].includes(b.type)){errors.push('Unsupported post formatting.');continue;}
   if(b.type==='video'){check(validVideo(b),'Videos need a valid HTTPS YouTube watch, Shorts or youtu.be URL, 16:9 or 9:16 ratio and a caption under 2,000 characters.');continue;}
   if(b.type==='image'){
    check(validImage(b.src)&&typeof b.alt==='string'&&b.alt.trim(),'Post photos need an uploaded image and description.');
    check(b.caption===undefined||typeof b.caption==='string'&&b.caption.length<=2000,'Image captions must be text under 2,000 characters.');
    check(b.width===undefined||IMAGE_WIDTHS.includes(b.width),'Choose Small, Medium, Large or Full width for each image.');
    check(b.align===undefined||IMAGE_ALIGNMENTS.includes(b.align),'Choose Left, Center or Right alignment for each image.');
    continue;
   }
   check(!b.font||['sans','serif','mono'].includes(b.font),'Choose an available post font.');
   const groups=['ul','ol'].includes(b.type)?b.items:[b.spans];
   if(!Array.isArray(groups)||groups.length>500){errors.push('Invalid list.');continue;}
   for(const spans of groups){if(!Array.isArray(spans)||spans.length>2000){errors.push('Invalid text block.');continue;}for(const s of spans){if(!s||typeof s.text!=='string'){errors.push('Invalid post text.');continue;}count+=s.text.length;check(!s.href||safeLink(s.href),'Post links must use a valid HTTPS address.');for(const key of ['bold','italic','underline'])check(s[key]===undefined||typeof s[key]==='boolean','Invalid text formatting.');}}
  }
  check(count<=80000,'Post body must be under 80,000 characters.');check(!p.published||count>0,'Published posts need some text.');
 }
 return errors;
}
export function renderBody(body=[],imageURL=s=>'/'+s){
 const spans=xs=>(xs||[]).map(s=>{let t=escapeHTML(s.text).replaceAll('\n','<br>');if(s.bold)t=`<strong>${t}</strong>`;if(s.italic)t=`<em>${t}</em>`;if(s.underline)t=`<u>${t}</u>`;if(s.href&&safeLink(s.href))t=`<a href="${escapeHTML(s.href)}" target="_blank" rel="noopener noreferrer">${t}</a>`;return t;}).join('');
 return body.map(b=>{if(b.type==='video'){
 if(!validVideo(b))return '';
 const caption=b.caption?.trim()?`<figcaption>${escapeHTML(b.caption)}</figcaption>`:'';
 return `<figure class="post-video video-${b.aspectRatio==='9:16'?'portrait':'landscape'}" data-video-url="${escapeHTML(b.url)}" data-video-ratio="${b.aspectRatio}"><div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${youtubeId(b.url)}" title="YouTube video${b.caption?' — '+escapeHTML(b.caption):''}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>${caption}</figure>`;
 }if(b.type==='image'){
   const width=IMAGE_WIDTHS.includes(b.width)?b.width:'full',align=IMAGE_ALIGNMENTS.includes(b.align)?b.align:'center';
   const caption=typeof b.caption==='string'&&b.caption.trim()?`<figcaption>${escapeHTML(b.caption)}</figcaption>`:'';
   return `<figure class="post-image image-width-${width} image-align-${align}" data-image-width="${width}" data-image-align="${align}"><img src="${escapeHTML(imageURL(b.src))}" alt="${escapeHTML(b.alt)}" loading="lazy">${caption}</figure>`;
  }if(!['p','h2','h3','blockquote','ul','ol'].includes(b.type))return '';const cls=['sans','serif','mono'].includes(b.font)?` class="font-${b.font}"`:'';return `<${b.type}${cls}>${['ul','ol'].includes(b.type)?b.items.map(x=>`<li>${spans(x)}</li>`).join(''):spans(b.spans)}</${b.type}>`;}).join('');
}
export function sortedPosts(posts=[]){return posts.filter(p=>p.published).sort((a,b)=>b.date.localeCompare(a.date));}


// Publication dates are owned by the server, never the editor or build clock.
export const validTimestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString()===value;
const postView=p=>({slug:p.slug,title:p.title,date:p.date,excerpt:p.excerpt,cover:p.cover||'',coverAlt:p.coverAlt||'',body:p.body});
const indexView=d=>({socials:d.socials,posts:sortedPosts(d.posts||[]).map(p=>{const {body,...summary}=postView(p);return summary;})});
const homeView=d=>({home:d.home,disclosure:d.disclosure,socials:d.socials,guide:d.guide?.visible?d.guide:{visible:false},products:(d.products||[]).filter(p=>p.published),categories:(d.categories||[]).filter(c=>(d.products||[]).some(p=>p.published&&p.category===c.id))});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function stampPublication(previous,next,now){
 if(!validTimestamp(now))throw Error('Invalid publication time.');
 const result=structuredClone(next),before=new Map((previous.posts||[]).map(p=>[p.id,p]));
 result.publication={...(previous.publication||{})};
 if(!same(homeView(previous),homeView(next)))result.publication.homeModifiedAt=now;
 if(!same(indexView(previous),indexView(next)))result.publication.blogModifiedAt=now;
 result.posts=(result.posts||[]).map(p=>{
  const old=before.get(p.id);delete p.publishedAt;delete p.modifiedAt;
  if(old?.publishedAt)p.publishedAt=old.publishedAt;
  if(old?.modifiedAt)p.modifiedAt=old.modifiedAt;
  if(p.published){
   if(!old?.published&&!p.publishedAt)p.publishedAt=now;
   if(!old?.published||!same(postView(old),postView(p))||!same(previous.socials,next.socials))p.modifiedAt=now;
  }
  return p;
 });return result;
}
export function sitemapXML(data){
 const base='https://tentboy.orportraits.com';
 const urls=[['/',data.publication?.homeModifiedAt],['/blog/',data.publication?.blogModifiedAt],...sortedPosts(data.posts||[]).map(p=>['/blog/'+p.slug+'/',p.modifiedAt||p.publishedAt])];
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(([path,date])=>'<url><loc>'+escapeHTML(base+path)+'</loc>'+(validTimestamp(date)?'<lastmod>'+date+'</lastmod>':'')+'</url>').join('')+'</urlset>\n';
}
