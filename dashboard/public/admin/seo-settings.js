import {postSEO,suggestSlug,suggestDescription} from '../blog.js';
const automaticSlugs=new WeakSet();
export function enableAutomaticSlug(post){automaticSlugs.add(post);}
export function drawSEO(parent,post,content,ui){
 const {node,field,action,changed,resolveImage,upload,run}=ui;
 const details=node('details',null,'seo-settings');details.append(node('summary','SEO Settings'));
 details.append(node('p','Empty fields use article defaults. Recommendations are guidance; longer text can still be saved.','help'));
 const controls={};
 for(const [key,label,type,recommendation]of [
  ['seoTitle','SEO Title','text','Aim for approximately 60 characters or fewer.'],
  ['metaDescription','Meta Description','textarea','Aim for 150–160 characters.'],
  ['focusKeyword','Focus Keyword','text','Optional primary search phrase; used for your planning, not a Google meta keywords tag.'],
  ['socialTitle','Social Sharing Title','text','Optional; defaults to SEO title.'],
  ['socialDescription','Social Sharing Description','textarea','Optional; defaults to meta description.']
 ]){const input=field(details,post,key,label,type),hint=node('p',recommendation,'help');hint.setAttribute('aria-live','polite');details.append(hint);controls[key]={input,hint,recommendation};}
 const slugLabel=node('label','URL Slug'),slug=node('input');slug.type='text';slug.value=post.slug;slugLabel.append(slug);details.append(slugLabel,node('p','Use lowercase words separated by hyphens. Published URL changes require confirmation and retain the old route.','help'));
 let approvedSlug=post.slug;
 slug.addEventListener('change',()=>{
  const next=suggestSlug(slug.value);
  if(!next||content.posts.some(p=>p!==post&&(p.slug===next||(p.previousSlugs||[]).includes(next)))){slug.setCustomValidity('Choose a unique, nonempty URL slug.');slug.reportValidity();slug.value=post.slug;slug.setCustomValidity('');return;}
  if(next!==approvedSlug&&(post.published||post.publishedAt)&&!confirm('Change this published article URL? Existing links may break until redirects deploy. The old route will be retained; GitHub Pages uses an HTML redirect rather than an HTTP 301.')){slug.value=post.slug;return;}
  automaticSlugs.delete(post);post.slug=next;approvedSlug=next;slug.value=next;changed();refresh();
 });
 const choose=node('label','Social Sharing Image'),select=node('select');choose.append(select);details.append(choose);
 const paths=[...new Set([post.socialImage,post.cover,content.home?.heroImage,...content.posts.flatMap(p=>[p.cover,p.socialImage,...(p.body||[]).filter(b=>b.type==='image').map(b=>b.src)]),...(content.products||[]).map(p=>p.image)].filter(Boolean))];
 const def=node('option','Use article featured image');def.value='';select.append(def);
 for(const path of paths){const option=node('option',path.split('/').pop());option.value=path;select.append(option);}select.value=post.socialImage||'';
 select.addEventListener('change',()=>{post.socialImage=select.value;changed();refresh();});
 const uploadLabel=node('label','Upload sharing image'),file=node('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';uploadLabel.append(file);details.append(uploadLabel);
 file.addEventListener('change',()=>run(async()=>{if(!file.files[0])return;const result=await upload(file.files[0]);post.socialImage=result.path;const option=node('option',result.path.split('/').pop());option.value=result.path;select.append(option);select.value=result.path;changed();refresh();}));
 action(details,'Use suggested SEO title and description',()=>{if((post.seoTitle||post.metaDescription)&&!confirm('Replace your custom SEO title and meta description with the current suggestions?'))return;post.seoTitle=post.title;post.metaDescription=suggestDescription(post);controls.seoTitle.input.value=post.seoTitle;controls.metaDescription.input.value=post.metaDescription;changed();refresh();});
 details.append(node('h3','Search result preview'));
 const search=node('div',null,'seo-search-preview'),url=node('p'),title=node('div'),description=node('p');search.append(url,title,description);details.append(search,node('h3','Social sharing preview'));
 const social=node('div',null,'seo-social-preview'),image=node('img'),socialTitle=node('strong'),socialDescription=node('p');image.alt='Social sharing preview';social.append(image,socialTitle,socialDescription);details.append(social,node('p','Illustrative previews only. Search engines and social platforms may display different text or crops.','help'));
 parent.append(details);let generation=0;
 function refresh(){
  const seo=postSEO(post);
  for(const [key,c]of Object.entries(controls)){const fallback={seoTitle:post.title,metaDescription:suggestDescription(post),socialTitle:seo.title,socialDescription:seo.description}[key]||'';c.input.placeholder=fallback;c.hint.textContent=c.recommendation+(key==='seoTitle'||key==='metaDescription'?' '+[...(post[key]?.trim()||fallback)].length+' characters (including spaces).':'');}
  url.textContent=seo.url;title.textContent=seo.title;description.textContent=seo.description;socialTitle.textContent=seo.socialTitle;socialDescription.textContent=seo.socialDescription;
  const path=post.socialImage||post.cover,token=++generation;image.hidden=!path;
  if(path)resolveImage(path).then(src=>{if(token===generation)image.src=src;}).catch(()=>{if(token===generation)image.hidden=true;});
 }
 parent.addEventListener('input',event=>{if(automaticSlugs.has(post)&&event.target!==slug){post.slug=suggestSlug(post.title)||post.slug;slug.value=post.slug;}refresh();});
 refresh();
}
