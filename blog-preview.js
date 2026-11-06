import {blogContent} from './blog-view.js';
const main=document.querySelector('main');
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='tentboy-preview')return;const d=e.data.content;const post=(d.posts||[]).find(p=>p.id===e.data.postId);const images=e.data.images||{};main.innerHTML=blogContent(d.posts||[],post,s=>images[s]||'/preview/'+s);});
parent.postMessage({type:'tentboy-preview-ready'},location.origin);

