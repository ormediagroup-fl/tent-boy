// Payhip's loader appends iframe_id after an unescaped source_url fragment.
// Match the sending frame instead of trusting its sometimes-missing message ID.
window.addEventListener('message',event=>{
 if(event.origin!=='https://payhip.com'||typeof event.data!=='string')return;
 const match=/^load-page\s+(?:\S+\s+)?(\d+(?:\.\d+)?)$/.exec(event.data.trim());if(!match)return;
 const frame=[...document.querySelectorAll('#guide iframe')].find(f=>f.contentWindow===event.source);if(!frame)return;
 const height=Number(match[1]);if(!Number.isFinite(height)||height<100||height>30000)return;
 frame.height=String(Math.ceil(height));frame.style.height=Math.ceil(height)+'px';frame.title='Purchase the Tent Boy guide on Payhip';
 document.querySelectorAll('#guide [id^="payhip_loading_"]').forEach(el=>el.hidden=true);
});
import {socialIcon} from './social-icons.js';
import {publishedCatalog,REQUIRED_DISCLOSURE,httpsUrl} from './content/schema.js';
const $=s=>document.querySelector(s);
function text(s,v){const e=$(s);if(e)e.textContent=v;}
function lines(s,v){const e=$(s);e.replaceChildren();String(v).split('\n').forEach((t,i)=>{if(i)e.append(document.createElement('br'));const span=document.createElement('span');span.textContent=t;e.append(span);});}
export function render(data){
 const h=data.home;lines('h1',h.headline);text('.intro',h.intro);$('.hero-photo img').src=h.heroImage;$('.hero-photo img').alt=h.heroAlt;
 text('.hero-photo figcaption',h.heroCaption);text('.handnote',h.note);text('.stamp',h.stamp);text('.ticker',h.ticker);lines('#gear h2',h.gearHeadline);text('.section-heading>p',h.gearIntro);lines('.setup-copy h2',h.setupHeadline);text('.setup-copy>p:not(.eyebrow)',h.setupDescription);text('.disclosure',`${REQUIRED_DISCLOSURE} ${data.disclosure}`);
 const cats=publishedCatalog(data),filters=$('.filters'),grid=$('#gear-grid');filters.replaceChildren();grid.replaceChildren();$('#gear').hidden=!cats.length;document.querySelector('nav a[href="#gear"]').hidden=!cats.length;
 for(const c of [{id:'all',name:'All the gear'},...cats]){const b=document.createElement('button');b.textContent=c.name;b.dataset.filter=c.id;b.setAttribute('aria-pressed',String(c.id==='all'));b.className=c.id==='all'?'active':'';filters.append(b);}
 for(const c of cats)for(const p of c.products){const card=document.createElement('article');card.className='gear-card product-card';card.dataset.category=c.id;if(p.image){const visual=document.createElement('div');visual.className='gear-visual';const img=document.createElement('img');img.src=p.image;img.alt=p.alt;img.loading='lazy';visual.append(img);card.append(visual);}const body=document.createElement('div');body.className='card-content';const label=document.createElement('p');label.className='eyebrow';label.textContent=`${p.featured?'★ FEATURED / ':''}${c.name}`;const title=document.createElement('h3');title.textContent=p.name;const desc=document.createElement('p');desc.textContent=p.description;body.append(label,title,desc);if(httpsUrl(p.url,'amazon')){const a=document.createElement('a');a.className='gear-link';a.href=p.url;a.rel='sponsored noopener noreferrer';a.target='_blank';a.textContent='View on Amazon ↗ (paid link)';body.append(a);}card.append(body);grid.append(card);}
 let categoryNote=$('#category-description');if(!categoryNote){categoryNote=document.createElement('p');categoryNote.id='category-description';categoryNote.className='category-description';filters.after(categoryNote);}categoryNote.hidden=true;
 filters.onclick=e=>{const b=e.target.closest('button');if(!b)return;filters.querySelectorAll('button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});const c=cats.find(x=>x.id===b.dataset.filter);categoryNote.textContent=c?.description||'';categoryNote.hidden=!categoryNote.textContent;let n=0;grid.querySelectorAll('article').forEach(x=>{x.hidden=b.dataset.filter!=='all'&&x.dataset.category!==b.dataset.filter;if(!x.hidden)n++;});text('#filter-status',`${n} products shown`);};
 const g=data.guide,show=g.visible&&httpsUrl(g.url,'payhip');$('#guide').hidden=!show;document.querySelectorAll('a[href="#guide"]').forEach(x=>x.hidden=!show);if(show){const a=$('#payhip-link');a.href=g.url;a.target='_blank';a.rel='noopener noreferrer';}

 let socials=$('#social-links');if(!socials){socials=document.createElement('div');socials.id='social-links';$('footer').append(socials);}socials.replaceChildren();for(const s of data.socials){if(!httpsUrl(s.url))continue;const a=document.createElement('a');a.href=s.url;a.className='social-link';a.setAttribute('aria-label',s.label+' (opens in a new tab)');a.innerHTML=socialIcon(s);const label=document.createElement('span');label.textContent=s.label;a.append(label);a.target='_blank';a.rel='noopener noreferrer';socials.append(a);}
}
if(new URLSearchParams(location.search).has('preview')){window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='tentboy-preview')render(e.data.content);});parent.postMessage({type:'tentboy-preview-ready'},location.origin);}
else fetch('./content/public.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(render).catch(()=>{const p=document.createElement('p');p.textContent='The gear list could not load. Please refresh in a moment.';$('#gear-grid').append(p);});

