import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {validate,publicContent} from '../content/schema.js';
const require=createRequire(import.meta.url);
const projectRoot=fileURLToPath(new URL('../',import.meta.url));
if(path.resolve(process.cwd())!==path.resolve(projectRoot))throw Error('Run the build from the website project root.');
const sharp=process.env.SHARP_MODULE?require(process.env.SHARP_MODULE):require('sharp');
const data=JSON.parse(await fs.readFile('content/site.json','utf8')),errors=validate(data);if(errors.length)throw Error(errors.join('\n'));
const out=path.resolve(projectRoot,'dist');if(path.dirname(out)!==path.resolve(projectRoot))throw Error('Invalid build target.');await fs.mkdir(out,{recursive:true});
// Keep OneDrive's directory handles intact while removing every old artifact file.
async function clearFiles(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.resolve(dir,entry.name);if(!file.startsWith(out+path.sep)||entry.isSymbolicLink())throw Error('Unsafe build artifact path.');if(entry.isDirectory())await clearFiles(file);else await fs.unlink(file);}}
await clearFiles(out);for(const name of ['index.html','styles.css','app.js','.nojekyll'])await fs.copyFile(name,`${out}/${name}`);
await fs.mkdir(`${out}/content`,{recursive:true});await fs.copyFile('content/schema.js',`${out}/content/schema.js`);const d=publicContent(data);
const assets=new Set(['assets/favicon.svg','assets/04-finished-fall-set.jpg','assets/08-about-tent-boy-selfie.jpg',data.home.heroImage,...d.products.map(p=>p.image),...(data.guide.visible?[data.guide.cover]:[])].filter(Boolean)),mapped=new Map();
for(const file of assets){await fs.mkdir(path.dirname(`${out}/${file}`),{recursive:true});if(file.endsWith('.svg')){await fs.copyFile(file,`${out}/${file}`);continue;}const webp=file.replace(/\.[^.]+$/,'.webp');await sharp(file,{limitInputPixels:40000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(`${out}/${webp}`);mapped.set(file,webp);}
d.home.heroImage=mapped.get(d.home.heroImage);for(const p of d.products)if(p.image)p.image=mapped.get(p.image);if(d.guide.cover)d.guide.cover=mapped.get(d.guide.cover);
let html=await fs.readFile(`${out}/index.html`,'utf8');for(const [from,to]of mapped)html=html.replaceAll(from,to);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
html=html.replace(/<div class="filters"[\s\S]*?<\/div>/,`<div class="filters" role="group" aria-label="Filter gear categories"><button type="button" class="active" data-filter="all" aria-pressed="true">All the gear</button>${d.categories.map(c=>`<button type="button" data-filter="${escape(c.id)}" aria-pressed="false">${escape(c.name)}</button>`).join('')}</div>`);
html=html.replace(/<noscript>[\s\S]*?<\/noscript>/,'<noscript><p>Enable JavaScript to explore the gear catalog and current affiliate links.</p></noscript>');
if(!d.guide.visible)html=html.replace('id="guide" class=','id="guide" hidden class=').replaceAll('href="#guide"','href="#guide" hidden');
await fs.writeFile(`${out}/index.html`,html);await fs.writeFile(`${out}/content/public.json`,JSON.stringify(d));
const origin=process.env.ADMIN_ORIGIN||'';if(origin&&(new URL(origin).origin!==origin||!origin.startsWith('https://')||/[<>"']/.test(origin)))throw Error('ADMIN_ORIGIN must be an HTTPS origin, no trailing slash');
await fs.mkdir(`${out}/admin`,{recursive:true});await fs.writeFile(`${out}/admin/index.html`,origin?`<!doctype html><meta name="viewport" content="width=device-width"><title>Tent Boy Admin</title><meta http-equiv="refresh" content="0;url=${origin}/admin/"><a href="${origin}/admin/">Open secure Tent Boy dashboard</a>`:'<!doctype html><meta name="viewport" content="width=device-width"><title>Tent Boy Admin</title><h1>Admin setup pending</h1><p>The secure dashboard has not been connected yet. See ADMIN-SETUP.md.</p>');
const preview='dashboard/public/preview';await fs.mkdir(`${preview}/content`,{recursive:true});for(const file of ['index.html','styles.css','app.js'])await fs.copyFile(file,`${preview}/${file}`);await fs.copyFile('content/schema.js',`${preview}/content/schema.js`);await fs.cp('assets',`${preview}/assets`,{recursive:true});
await fs.copyFile('content/schema.js','dashboard/public/schema.js');
console.log(`Built ${d.products.length} products in ${d.categories.length} categories.`);
