// Loopback-only QA. Mock submissions never leave this process/browser.
// The Atlas URL is its official documentation example, not a configured form.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
async function start(){
  const {contactPage}=await import(pathToFileURL(path.join(root,'contact-view.js')));
  const data=JSON.parse(await fs.readFile(path.join(root,'content/site.json')));
  const server=http.createServer(async(req,res)=>{
    try{
      const u=new URL(req.url,'http://127.0.0.1');
      const send=(text,type='text/html')=>res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Robots-Tag':'noindex'}).end(text);
      if(u.pathname==='/qa-contact.js')return send(`import {initializeContactForm} from '/contact-form.js';
        initializeContactForm(document.querySelector('#contact-form'),{fetchImpl:async(url,options)=>{
          const data=JSON.parse(options.body);
          if(data.message==='simulate failure')return Response.json({error:'QA service error'},{status:500});
          if(data.message==='simulate malformed success')return Response.json({success:false});
          return Response.json({success:true,submission_id:'local-only'});
        }});`,'text/javascript');
      if(u.pathname==='/contact/'){
        const html=contactPage({socials:data.socials,guide:data.guide,endpoint:u.searchParams.get('mock')==='1'?'https://atlasforms.app/f/abc123xyz':''});
        return send(html.replace('src="/contact.js"','src="/qa-contact.js"'));
      }
      if(u.pathname==='/thank-you/')return send(contactPage({socials:data.socials,guide:data.guide,thankYou:true}));
      let name=decodeURIComponent(u.pathname);if(name.endsWith('/'))name+='index.html';
      const file=path.resolve(root,'dist','.'+name),base=path.join(root,'dist');if(!file.startsWith(base+path.sep))return res.writeHead(403).end();
      const mime={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.html':'text/html','.json':'application/json','.xml':'application/xml'};
      return send(await fs.readFile(file),mime[path.extname(file)]||'text/plain');
    }catch{res.writeHead(404).end('Not found');}
  });
  server.listen(4176,'127.0.0.1',()=>console.log('Contact QA only: http://127.0.0.1:4176/contact/ (add ?mock=1 for local simulated submissions)'));
}
start();
