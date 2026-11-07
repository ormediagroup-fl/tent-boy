import {renderBody,safeLink,IMAGE_WIDTHS,IMAGE_ALIGNMENTS,youtubeId,VIDEO_RATIOS} from '/blog.js';

// Only this structured model is saved. Editor controls and HTML are never stored.
export function readImage(img,figure=img.closest?.('figure')){
 return {type:'image',src:img.dataset.asset,alt:img.alt,
  caption:figure?.querySelector('figcaption')?.textContent||'',
  width:IMAGE_WIDTHS.includes(figure?.dataset.imageWidth)?figure.dataset.imageWidth:'full',
  align:IMAGE_ALIGNMENTS.includes(figure?.dataset.imageAlign)?figure.dataset.imageAlign:'center'};
}
export function readBody(root){
 const blocks=[];
 function spans(el,marks={}){const out=[];for(const n of el.childNodes){if(n.nodeType===3){if(n.textContent)out.push({text:n.textContent,...marks});continue;}if(n.nodeType!==1)continue;const tag=n.tagName.toLowerCase(),m={...marks};if(['script','style','iframe','object'].includes(tag))continue;if(['strong','b'].includes(tag))m.bold=true;if(['em','i'].includes(tag))m.italic=true;if(tag==='u')m.underline=true;if(tag==='a'&&safeLink(n.getAttribute('href')))m.href=n.getAttribute('href');if(tag==='br')out.push({text:'\n',...m});else out.push(...spans(n,m));}return out;}
 function font(el){const f=(el.getAttribute?.('face')||el.style?.fontFamily||'').toLowerCase();if(f.includes('georgia'))return 'serif';if(f.includes('monospace'))return 'mono';for(const cls of ['sans','serif','mono'])if(el.classList?.contains('font-'+cls))return cls;const child=el.querySelector?.('font[face]');return child?font(child):'sans';}
 function walk(el){let inline=[];const flush=()=>{if(inline.length){blocks.push({type:'p',spans:inline,font:'sans'});inline=[];}};for(const n of el.childNodes){if(n.nodeType===3){if(n.textContent)inline.push({text:n.textContent});continue;}if(n.nodeType!==1)continue;if(n.dataset.imageControls!==undefined)continue;const tag=n.tagName.toLowerCase();if(['script','style','iframe','object'].includes(tag))continue;if(tag==='img'){flush();if(n.dataset.asset)blocks.push(readImage(n));continue;}if(tag==='figure'){flush();if(n.dataset.videoUrl){blocks.push({type:'video',url:n.dataset.videoUrl,aspectRatio:VIDEO_RATIOS.includes(n.dataset.videoRatio)?n.dataset.videoRatio:'16:9',caption:n.querySelector('figcaption')?.textContent||''});continue;}const img=n.querySelector('img');if(img?.dataset.asset)blocks.push(readImage(img,n));continue;}if(['ul','ol'].includes(tag)){flush();blocks.push({type:tag,font:font(n),items:[...n.children].filter(x=>x.tagName==='LI').map(x=>spans(x))});continue;}if(['p','h2','h3','blockquote'].includes(tag)){flush();blocks.push({type:tag,font:font(n),spans:spans(n)});continue;}if(tag==='div'){flush();walk(n);continue;}inline.push(...spans({childNodes:[n]}));}flush();}
 walk(root);return blocks;
}

export function richEditor(parent,post,{changed,upload,resolveImage,onError}){
 const tools=document.createElement('div');tools.className='rich-tools';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Post formatting');
 const body=document.createElement('div');body.className='rich-body post-body';body.contentEditable='true';body.setAttribute('role','textbox');body.setAttribute('aria-multiline','true');body.setAttribute('aria-label','Post body');body.spellcheck=true;
 body.innerHTML=renderBody(post.body||[],s=>s);
 let range,selected=null,imageUndo=null,imageRedo=null;
 const panel=document.createElement('fieldset');panel.className='rich-image-panel';panel.dataset.imageControls='true';panel.contentEditable='false';panel.hidden=true;
 const legend=document.createElement('legend');legend.textContent='Image settings';panel.append(legend);
 const help=document.createElement('p');help.className='help';help.textContent='Changes appear above immediately. Alt text describes the image; captions are optional visible text.';panel.append(help);
 const controls=document.createElement('div');controls.className='image-settings-grid';panel.append(controls);
 function control(label,tag,options){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement(tag);input.setAttribute('aria-label',label);if(options)for(const [text,value]of options){const o=document.createElement('option');o.textContent=text;o.value=value;input.append(o);}wrap.append(input);controls.append(wrap);return input;}
 const size=control('Image size','select',[['Small — 33%','small'],['Medium — 50%','medium'],['Large — 75%','large'],['Full width — 100%','full']]);
 const alignment=control('Image alignment','select',[['Left','left'],['Center','center'],['Right','right']]);
 const alt=control('Image alt text (required)','textarea');alt.rows=2;
 const caption=control('Image caption (optional)','textarea');caption.rows=2;caption.maxLength=2000;
 const panelActions=document.createElement('div');panelActions.className='image-settings-actions';panel.append(panelActions);
 function plainButton(parent,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;parent.append(b);return b;}
 function remember(){const s=window.getSelection();if(s.rangeCount&&body.contains(s.anchorNode)&&!panel.contains(s.anchorNode))range=s.getRangeAt(0).cloneRange();}
 function focus(){body.focus();if(range?.startContainer.isConnected&&body.contains(range.startContainer)&&!panel.contains(range.startContainer)){const s=window.getSelection();s.removeAllRanges();s.addRange(range);}}
 function sync(){imageUndo=null;imageRedo=null;post.body=readBody(body);changed();remember();}
 function deselect(returnFocus=false){const figure=selected;selected?.classList.remove('image-selected');selected=null;panel.hidden=true;if(returnFocus&&figure?.isConnected)figure.focus();}
 function prepareFigures(){for(const figure of body.querySelectorAll('figure.post-image')){
  figure.contentEditable='false';figure.tabIndex=0;figure.setAttribute('role','group');const img=figure.querySelector('img');figure.setAttribute('aria-label',`Image: ${img.alt||'description needed'}. Press Enter to edit image settings.`);
  if(!img.dataset.asset){img.dataset.asset=img.getAttribute('src');resolveImage(img.dataset.asset).then(src=>{if(img.isConnected)img.src=src;}).catch(()=>{});}
  if(!figure.querySelector('.image-edit-button')){const b=plainButton(figure,'Edit image',()=>selectImage(figure,true));b.className='image-edit-button';b.setAttribute('aria-label','Edit image settings');}
 }}
 function selectImage(figure,focusControls=false){
  if(selected!==figure){selected?.classList.remove('image-selected');selected=figure;const data=readImage(figure.querySelector('img'),figure);size.value=data.width;alignment.value=data.align;alt.value=data.alt;caption.value=data.caption;}
  figure.classList.add('image-selected');figure.after(panel);panel.hidden=false;
  if(focusControls)size.focus();
 }
 function updateImage(){if(!selected?.isConnected)return;const img=selected.querySelector('img');
  // Remove only our known layout classes; never turn user input into CSS.
  for(const w of IMAGE_WIDTHS)selected.classList.remove('image-width-'+w);
  for(const a of IMAGE_ALIGNMENTS)selected.classList.remove('image-align-'+a);
  selected.dataset.imageWidth=IMAGE_WIDTHS.includes(size.value)?size.value:'full';selected.dataset.imageAlign=IMAGE_ALIGNMENTS.includes(alignment.value)?alignment.value:'center';
  selected.classList.add('image-width-'+selected.dataset.imageWidth,'image-align-'+selected.dataset.imageAlign);img.alt=alt.value;
  let c=selected.querySelector('figcaption');if(caption.value.trim()){if(!c){c=document.createElement('figcaption');img.after(c);}c.textContent=caption.value;}else c?.remove();
  selected.setAttribute('aria-label',`Image: ${img.alt||'description needed'}. Press Enter to edit image settings.`);sync();
 }
 size.onchange=alignment.onchange=updateImage;alt.oninput=caption.oninput=updateImage;
 plainButton(panelActions,'Done editing image',()=>deselect(true));
 const remove=plainButton(panelActions,'Remove image',()=>{if(!selected)return;const figure=selected;deselect();const snapshot={clone:figure.cloneNode(true),next:figure.nextSibling};figure.remove();range=null;body.focus();sync();imageUndo=snapshot;});remove.className='remove-image-button';
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();deselect(true);}});
 body.addEventListener('click',e=>{if(panel.contains(e.target))return;const figure=e.target.closest('figure.post-image');if(figure&&body.contains(figure)){selectImage(figure,!!e.target.closest('.image-edit-button'));return;}deselect();});
 body.addEventListener('keydown',e=>{if(e.target.matches('figure.post-image')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectImage(e.target,true);}else if(e.key==='Escape'&&!panel.contains(e.target))deselect();});
 body.addEventListener('keyup',remember);body.addEventListener('mouseup',remember);body.addEventListener('touchend',remember);document.addEventListener('selectionchange',remember,{signal:controller.signal});
 function command(cmd,value){
  if(cmd==='undo'&&imageUndo){const snapshot=imageUndo,node=snapshot.clone.cloneNode(true);body.insertBefore(node,snapshot.next?.parentNode===body?snapshot.next:null);prepareFigures();prepareVideos();sync();imageRedo={...snapshot,node};return;}
  if(cmd==='redo'&&imageRedo){const snapshot=imageRedo;snapshot.node.remove();sync();imageUndo={clone:snapshot.clone,next:snapshot.next};return;}
  focus();document.execCommand(cmd,false,value);prepareFigures();if(selected&&!selected.isConnected)deselect();sync();}
 function button(label,fn){const b=plainButton(tools,label,fn);b.onmousedown=e=>e.preventDefault();}
 for(const [name,cmd] of [['Bold','bold'],['Italic','italic'],['Underline','underline'],['Bullets','insertUnorderedList'],['Numbered list','insertOrderedList'],['Undo','undo'],['Redo','redo']])button(name,()=>command(cmd));
 function select(label,options,cmd){const l=document.createElement('label');l.textContent=label;const s=document.createElement('select');for(const [text,value]of options){const o=document.createElement('option');o.textContent=text;o.value=value;s.append(o);}s.onchange=()=>command(cmd,s.value);l.append(s);tools.append(l);}
 select('Text style',[['Paragraph','p'],['Heading','h2'],['Subheading','h3'],['Quote','blockquote']],'formatBlock');
 select('Font',[['Sans serif','Arial'],['Serif','Georgia'],['Monospace','monospace']],'fontName');
 const videoPanel=document.createElement('fieldset');videoPanel.className='rich-video-panel';videoPanel.hidden=true;
 const vl=document.createElement('legend');vl.textContent='YouTube video';videoPanel.append(vl);
 function videoField(label,tag){const l=document.createElement('label');l.textContent=label;const i=document.createElement(tag);i.setAttribute('aria-label',label);l.append(i);videoPanel.append(l);return i;}
 const videoURL=videoField('YouTube URL','input');videoURL.type='url';videoURL.maxLength=2048;
 const videoRatio=videoField('Video aspect ratio','select');for(const r of VIDEO_RATIOS){const o=document.createElement('option');o.value=r;o.textContent=r==='16:9'?'16:9 — landscape':'9:16 — portrait / Shorts';videoRatio.append(o);}
 const videoCaption=videoField('Video caption (optional)','textarea');videoCaption.maxLength=2000;videoCaption.rows=2;
 const videoError=document.createElement('p');videoError.setAttribute('role','alert');videoPanel.append(videoError);
 let selectedVideo=null;
 function videoClose(){videoPanel.hidden=true;const f=selectedVideo;selectedVideo=null;if(f?.isConnected)f.focus();else body.focus();}
 function editVideo(f){remember();deselect();selectedVideo=f;videoURL.value=f?.dataset.videoUrl||'';videoRatio.value=f?.dataset.videoRatio||'16:9';videoCaption.value=f?.querySelector('figcaption')?.textContent||'';videoError.textContent='';videoPanel.hidden=false;videoURL.focus();}
 function prepareVideos(){for(const f of body.querySelectorAll('figure.post-video')){f.contentEditable='false';f.tabIndex=0;f.setAttribute('role','group');f.setAttribute('aria-label','YouTube video. Press Enter to edit.');let b=f.querySelector('.video-edit-button');if(!b){b=plainButton(f,'Edit video',()=>editVideo(f));b.className='video-edit-button';}b.onclick=()=>editVideo(f);}}
 function insertVideo(f){focus();const sel=window.getSelection();if(sel.rangeCount&&body.contains(sel.anchorNode)&&!panel.contains(sel.anchorNode)){const r=sel.getRangeAt(0);let a=r.startContainer;if(a===body)body.insertBefore(f,body.childNodes[r.startOffset]||null);else{while(a.parentNode!==body)a=a.parentNode;if(['P','H2','H3','BLOCKQUOTE','UL','OL','DIV'].includes(a.tagName)&&a.contains(r.startContainer)){const after=r.cloneRange();after.setEndAfter(a);const tail=after.extractContents();a.after(f);f.after(tail);}else a.after(f);}}else body.append(f);if(!f.nextSibling)body.append(document.createElement('p'));}
 plainButton(videoPanel,'Apply video',()=>{if(!youtubeId(videoURL.value.trim())){videoError.textContent='Enter a valid HTTPS YouTube watch, Shorts or youtu.be link.';videoURL.focus();return;}const holder=document.createElement('div');holder.innerHTML=renderBody([{type:'video',url:videoURL.value.trim(),aspectRatio:videoRatio.value,caption:videoCaption.value}]);const f=holder.firstElementChild;if(selectedVideo?.isConnected)selectedVideo.replaceWith(f);else insertVideo(f);selectedVideo=f;prepareVideos();sync();videoClose();});
 plainButton(videoPanel,'Cancel video editing',videoClose);
 plainButton(videoPanel,'Remove video',()=>{if(!selectedVideo?.isConnected){videoClose();return;}const f=selectedVideo;videoClose();const snapshot={clone:f.cloneNode(true),next:f.nextSibling};f.remove();range=null;sync();imageUndo=snapshot;body.focus();});
 videoPanel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();videoClose();}});
 body.addEventListener('keydown',e=>{if(e.target.matches('figure.post-video')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();editVideo(e.target);}});
 button('Add Video',()=>editVideo(null));
 button('Link',()=>{const value=prompt('Enter the full HTTPS link:','https://');if(value===null)return;if(!safeLink(value)){onError('Enter a valid HTTPS link.');return;}command('createLink',value);});button('Remove link',()=>command('unlink'));
 const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.hidden=true;button('Add photo',()=>file.click());
 file.onchange=async()=>{try{if(!file.files[0])return;const description='';const {path,url}=await upload(file.files[0]);focus();const figure=document.createElement('figure'),img=document.createElement('img');figure.className='post-image image-width-full image-align-center';figure.dataset.imageWidth='full';figure.dataset.imageAlign='center';img.dataset.asset=path;img.src=url;img.alt=description;figure.append(img);const s=window.getSelection();if(s.rangeCount&&s.anchorNode!==body&&body.contains(s.anchorNode)&&!panel.contains(s.anchorNode)){let anchor=s.anchorNode;while(anchor.parentNode!==body)anchor=anchor.parentNode;anchor.after(figure);}else body.append(figure);body.append(document.createElement('p'));prepareFigures();sync();selectImage(figure,true);alt.focus();}catch(e){onError(e.message);}finally{file.value='';}};
 // Paste plain text; keep native paste/undo inside the image metadata fields.
 body.onpaste=e=>{if(panel.contains(e.target))return;e.preventDefault();command('insertText',e.clipboardData.getData('text/plain'));};
 body.addEventListener('input',e=>{if(panel.contains(e.target))return;prepareFigures();if(selected&&!selected.isConnected)deselect();sync();});
 const imageHelp=document.createElement('p');imageHelp.className='help';imageHelp.textContent='Tap a photo or choose Edit image to change its caption, size, alignment or alt text. Keyboard: Tab to a photo, Enter to edit, Escape to return.';
 parent.append(tools,videoPanel,imageHelp,body,file);prepareFigures();prepareVideos();
}
let controller=new AbortController();
export function resetEditor(){controller.abort();controller=new AbortController();}
