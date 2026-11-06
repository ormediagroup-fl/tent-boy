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
  check(typeof p.published==='boolean','Post visibility must be a switch.');
  check(typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&!Number.isNaN(Date.parse(p.date))&&new Date(p.date).toISOString().slice(0,10)===p.date,'Enter a valid post date.');
  check(!p.cover||validImage(p.cover),'Post cover must be an uploaded image.');check(!p.cover||typeof p.coverAlt==='string'&&p.coverAlt.trim(),'Add a description for the post cover.');
  if(!Array.isArray(p.body)||p.body.length>500){errors.push('Invalid post body (maximum 500 blocks).');continue;}
  let count=0;
  for(const b of p.body){
   if(!b||!['p','h2','h3','blockquote','ul','ol','image'].includes(b.type)){errors.push('Unsupported post formatting.');continue;}
   if(b.type==='image'){check(validImage(b.src)&&typeof b.alt==='string'&&b.alt.trim(),'Post photos need an uploaded image and description.');continue;}
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
 return body.map(b=>{if(b.type==='image')return `<figure><img src="${escapeHTML(imageURL(b.src))}" alt="${escapeHTML(b.alt)}" loading="lazy"><figcaption>${escapeHTML(b.alt)}</figcaption></figure>`;if(!['p','h2','h3','blockquote','ul','ol'].includes(b.type))return '';const cls=['sans','serif','mono'].includes(b.font)?` class="font-${b.font}"`:'';return `<${b.type}${cls}>${['ul','ol'].includes(b.type)?b.items.map(x=>`<li>${spans(x)}</li>`).join(''):spans(b.spans)}</${b.type}>`;}).join('');
}
export function sortedPosts(posts=[]){return posts.filter(p=>p.published).sort((a,b)=>b.date.localeCompare(a.date));}

