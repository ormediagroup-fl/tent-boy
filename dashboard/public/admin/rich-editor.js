import {renderBody,safeLink} from '/blog.js';
// Store a small, allowlisted document model, never raw editor HTML.
export function readBody(root){
 const blocks=[];
 function spans(el,marks={}){const out=[];for(const n of el.childNodes){if(n.nodeType===3){if(n.textContent)out.push({text:n.textContent,...marks});continue;}if(n.nodeType!==1)continue;const tag=n.tagName.toLowerCase(),m={...marks};if(['script','style','iframe','object'].includes(tag))continue;if(['strong','b'].includes(tag))m.bold=true;if(['em','i'].includes(tag))m.italic=true;if(tag==='u')m.underline=true;if(tag==='a'&&safeLink(n.getAttribute('href')))m.href=n.getAttribute('href');if(tag==='br')out.push({text:'\n',...m});else out.push(...spans(n,m));}return out;}
 function font(el){const f=(el.getAttribute?.('face')||el.style?.fontFamily||'').toLowerCase();if(f.includes('georgia'))return 'serif';if(f.includes('monospace'))return 'mono';for(const cls of ['sans','serif','mono'])if(el.classList?.contains('font-'+cls))return cls;const child=el.querySelector?.('font[face]');return child?font(child):'sans';}
 function walk(el){let inline=[];const flush=()=>{if(inline.length){blocks.push({type:'p',spans:inline,font:'sans'});inline=[];}};for(const n of el.childNodes){if(n.nodeType===3){if(n.textContent)inline.push({text:n.textContent});continue;}if(n.nodeType!==1)continue;const tag=n.tagName.toLowerCase();if(['script','style','iframe','object'].includes(tag))continue;if(tag==='img'){flush();if(n.dataset.asset)blocks.push({type:'image',src:n.dataset.asset,alt:n.alt});continue;}if(tag==='figure'){flush();const img=n.querySelector('img');if(img?.dataset.asset)blocks.push({type:'image',src:img.dataset.asset,alt:img.alt});continue;}if(['ul','ol'].includes(tag)){flush();blocks.push({type:tag,font:font(n),items:[...n.children].filter(x=>x.tagName==='LI').map(x=>spans(x))});continue;}if(['p','h2','h3','blockquote'].includes(tag)){flush();blocks.push({type:tag,font:font(n),spans:spans(n)});continue;}if(tag==='div'){flush();walk(n);continue;}inline.push(...spans({childNodes:[n]}));}flush();}
 walk(root);return blocks;
}
export function richEditor(parent,post,{changed,upload,resolveImage,onError}){
 const tools=document.createElement('div');tools.className='rich-tools';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Post formatting');
 const body=document.createElement('div');body.className='rich-body post-body';body.contentEditable='true';body.setAttribute('role','textbox');body.setAttribute('aria-multiline','true');body.setAttribute('aria-label','Post body');body.spellcheck=true;
 body.innerHTML=renderBody(post.body||[],s=>s);
 for(const img of body.querySelectorAll('img')){img.dataset.asset=img.getAttribute('src');resolveImage(img.dataset.asset).then(src=>img.src=src).catch(()=>{});}
 let range;
 function remember(){const s=window.getSelection();if(s.rangeCount&&body.contains(s.anchorNode))range=s.getRangeAt(0).cloneRange();}
 body.addEventListener('keyup',remember);body.addEventListener('mouseup',remember);body.addEventListener('touchend',remember);document.addEventListener('selectionchange',remember,{signal:controller.signal});
 function focus(){body.focus();if(range){const s=window.getSelection();s.removeAllRanges();s.addRange(range);}}
 function sync(){post.body=readBody(body);changed();remember();}
 function command(cmd,value){focus();document.execCommand(cmd,false,value);sync();}
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onmousedown=e=>e.preventDefault();b.onclick=fn;tools.append(b);}
 for(const [name,cmd] of [['Bold','bold'],['Italic','italic'],['Underline','underline'],['Bullets','insertUnorderedList'],['Numbered list','insertOrderedList'],['Undo','undo'],['Redo','redo']])button(name,()=>command(cmd));
 function select(label,options,cmd){const l=document.createElement('label');l.textContent=label;const s=document.createElement('select');for(const [text,value]of options){const o=document.createElement('option');o.textContent=text;o.value=value;s.append(o);}s.onchange=()=>command(cmd,s.value);l.append(s);tools.append(l);}
 select('Text style',[['Paragraph','p'],['Heading','h2'],['Subheading','h3'],['Quote','blockquote']],'formatBlock');
 select('Font',[['Sans serif','Arial'],['Serif','Georgia'],['Monospace','monospace']],'fontName');
 button('Link',()=>{const value=prompt('Enter the full HTTPS link:','https://');if(value===null)return;if(!safeLink(value)){onError('Enter a valid HTTPS link.');return;}command('createLink',value);});button('Remove link',()=>command('unlink'));
 const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.hidden=true;button('Add photo',()=>file.click());
 file.onchange=async()=>{try{if(!file.files[0])return;const alt=prompt('Describe this photo for readers using a screen reader:');if(!alt?.trim())return;const {path,url}=await upload(file.files[0]);focus();const figure=document.createElement('figure'),img=document.createElement('img');img.dataset.asset=path;img.src=url;img.alt=alt;figure.append(img);const s=window.getSelection();if(s.rangeCount&&s.anchorNode!==body&&body.contains(s.anchorNode)){let anchor=s.anchorNode;while(anchor.parentNode!==body)anchor=anchor.parentNode;anchor.after(figure);}else body.append(figure);body.append(document.createElement('p'));sync();}catch(e){onError(e.message);}finally{file.value='';}};
 // Paste plain text to keep pasted scripts, tracking images, and foreign styles out.
 body.onpaste=e=>{e.preventDefault();command('insertText',e.clipboardData.getData('text/plain'));};
 body.addEventListener('input',sync);parent.append(tools,body,file);
}
let controller=new AbortController();
export function resetEditor(){controller.abort();controller=new AbortController();}


