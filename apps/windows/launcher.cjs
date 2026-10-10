const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = __dirname;
const web = path.join(root, 'web');
const data = process.env.PRAMANA_DATA_DIR || path.join(process.env.LOCALAPPDATA || root, 'Pramana', 'data');
const host = '127.0.0.1';
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json'};
const api = spawn(process.execPath, [path.join(root,'backend','server.mjs')], {cwd:root,env:{...process.env,HOST:host,PORT:'3001',CLIENT_ORIGIN:'http://localhost:8081',PRAMANA_DATA_DIR:data},stdio:'inherit'});
let closing = false;
const server = http.createServer((req,res)=>{
 let pathname;
 try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400);return res.end('Invalid request');}
 let target=path.resolve(web,'.'+pathname);
 if (target!==web && !target.startsWith(web+path.sep)) {res.writeHead(403);return res.end('Forbidden');}
 if(pathname==='/' || !path.extname(pathname))target=path.join(web,'index.html');
 fs.stat(target,(error,stat)=>{
  if(error || !stat.isFile()) {res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Content-Length':stat.size,'X-Content-Type-Options':'nosniff'});
  fs.createReadStream(target).on('error',()=>res.destroy()).pipe(res);
 });
});
function stop(code=0){if(closing)return;closing=true;api.kill();server.close(()=>process.exit(code));setTimeout(()=>process.exit(code),1500).unref();}
api.on('error',error=>{console.error('Could not start the backend:',error.message);stop(1)});
api.on('exit',code=>{if(!closing){console.error('Backend stopped. Check whether port 3001 is already in use.');stop(code||1)}});
server.on('error',error=>{console.error('Could not start Pramana:',error.message);stop(1)});
server.listen(8081,host,()=>{
 console.log('\nPramana is ready at http://localhost:8081\nKeep this window open. Press Ctrl+C to stop.\n');
 if(process.platform==='win32' && process.env.PRAMANA_NO_BROWSER!=='1') {
  const edge=path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Microsoft','Edge','Application','msedge.exe');
  if(fs.existsSync(edge))spawn(edge,['--app=http://localhost:8081'],{detached:true,stdio:'ignore'}).unref();
  else spawn('cmd.exe',['/c','start','','http://localhost:8081'],{detached:true,stdio:'ignore'}).unref();
 }
});
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
