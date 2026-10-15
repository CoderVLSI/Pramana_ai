"""Isolated PostgreSQL 17 + Supabase PostgREST TEST core; no LIVE credentials.

Test JWTs/TLS private material stays in the external --state directory. Outputs only
check results, never credentials. The full CLI stack exceeded the workspace disk cap.
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
import pathlib
import secrets
import signal
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--state', required=True)
args = parser.parse_args()
state = pathlib.Path(args.state).resolve()
assert not state.is_relative_to(ROOT), 'Test credentials must stay outside the repository'
state.mkdir(exist_ok=True, parents=True)
os.chmod(state, 0o700)
pid_file = state / 'gateway.pid'
if pid_file.exists():
    pid = int(pid_file.read_text())
    command = subprocess.run(['ps','-p',str(pid),'-o','args='],capture_output=True,text=True).stdout
    if str(state / 'gateway.cjs') in command:
        os.kill(pid, signal.SIGTERM)
        time.sleep(0.2)
NETWORK = 'pramana-gita-pilot-test' 
DB = NETWORK + '-db'
REST = NETWORK + '-rest'
def run(*cmd, **kwargs):
    try:
        return subprocess.run(cmd, check=True, capture_output=True, text=True, **kwargs).stdout
    except subprocess.CalledProcessError as error:
        detail = error.stderr or error.stdout or 'Command failed'
        for key in ('password','jwt_secret','anon','service'):
            secret = globals().get(key)
            if secret: detail = detail.replace(secret, '[REDACTED]')
        raise RuntimeError(detail[-2000:]) from None
def sql(value):
    return run('docker', 'exec', '-i', DB, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', input=value)
def save(name, value):
    path = state / name
    path.write_text(value)
    os.chmod(path, 0o600)
    return path
def jwt(role, secret):
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).decode().rstrip('=')
    body = encode({'alg':'HS256','typ':'JWT'}) + '.' + encode({'role':role,'iss':'supabase','iat':int(time.time()),'exp':int(time.time())+7200})
    return body + '.' + base64.urlsafe_b64encode(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()).decode().rstrip('=')

# Only fixed, explicitly TEST-labelled containers are affected; do not touch other projects.
for name in [REST, DB]:
    inspect = subprocess.run(['docker','inspect','--format','{{index .Config.Labels "pramana.test"}}',name], capture_output=True, text=True)
    if inspect.returncode == 0:
        assert inspect.stdout.strip() == 'gita-pilot', 'Refusing to remove a container not owned by this test'
        run('docker','rm','-f','-v',name)
subprocess.run(['docker','network','create',NETWORK], capture_output=True)
password = secrets.token_urlsafe(32)
jwt_secret = secrets.token_hex(32)
anon = jwt('anon',jwt_secret)
service = jwt('service_role',jwt_secret)
db_env = save('db.env', f'POSTGRES_PASSWORD={password}\n')
rest_env = save('rest.env',f'PGRST_DB_URI=postgres://authenticator:{password}@{DB}:5432/postgres\nPGRST_DB_SCHEMAS=public\nPGRST_DB_ANON_ROLE=anon\nPGRST_JWT_SECRET={jwt_secret}\nPGRST_SERVER_PORT=3000\n')
save('gateway.json', json.dumps({'anon':anon,'service':service}))
run('docker','run','-d','--name',DB,'--label','pramana.test=gita-pilot','--network',NETWORK,'--env-file',str(db_env),'postgres:17-alpine')
for attempt in range(120):
    try:
        sql('select 1;')
        break
    except (subprocess.CalledProcessError, RuntimeError):
        if attempt == 119: raise
        time.sleep(0.5)
sql(f"create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator login noinherit password '{password}'; grant anon,authenticated,service_role to authenticator;")
sql((ROOT/'supabase/migrations/202610130001_scripture_retrieval.sql').read_text())
sql("alter table scripture_releases add constraint unrelated_constraint_preserved check(length(id)>0);")
migration = (ROOT/'supabase/migrations/202610140001_open_source_releases.sql').read_text()
sql(migration)
sql(migration)
sql("""do $$ begin if not exists(select 1 from pg_constraint where conname='unrelated_constraint_preserved') then raise exception 'Unrelated constraint was removed'; end if; end $$;""")
manifest = json.loads((ROOT/'services/ingest/releases/gita-open-1.bundle.json').read_text())['manifest']
for field, value in [('rights_approved',None),('permission_proof',None),('reviewers',None),('source_url',None),('sources',[]),('sources',{}),('rights_class','invalid')]:
    bad = dict(manifest, **{field:value})
    literal = json.dumps(bad, ensure_ascii=False).replace("'", "''")
    sql("do $$ begin begin insert into scripture_releases(id,work_id,edition_id,manifest) values('invalid-test','bhagavad-gita','apte-anandashram-34-1909-shankara-700','"+literal+"'::jsonb); raise exception 'Invalid manifest accepted'; exception when check_violation then null; end; end $$;")
run('docker','run','-d','--name',REST,'--label','pramana.test=gita-pilot','--network',NETWORK,'-p','127.0.0.1:54327:3000','--env-file',str(rest_env),'public.ecr.aws/supabase/postgrest:v16.4')
run('openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',str(state/'tls-key.pem'),'-out',str(state/'tls-cert.pem'))
os.chmod(state/'tls-key.pem',0o600)
gateway = r'''
const https=require('https'),http=require('http'),fs=require('fs');
const root=process.argv[2],keys=JSON.parse(fs.readFileSync(root+'/gateway.json'));
https.createServer({key:fs.readFileSync(root+'/tls-key.pem'),cert:fs.readFileSync(root+'/tls-cert.pem')},(req,res)=>{
 if(![keys.anon,keys.service].includes(req.headers.apikey)){res.writeHead(401);res.end('{}');return;}
 if(!req.url.startsWith('/rest/v1/')){res.writeHead(404);res.end('{}');return;}
 const upstream=http.request({host:'127.0.0.1',port:54327,path:req.url.slice('/rest/v1'.length),method:req.method,headers:req.headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
 upstream.on('error',()=>{res.writeHead(502);res.end('{}');});req.pipe(upstream);
}).listen(54443,'127.0.0.1');
'''
save('gateway.cjs',gateway)
with (state/'gateway-private.log').open('w') as log:
    proxy = subprocess.Popen(['node',str(state/'gateway.cjs'),str(state)],stdout=log,stderr=log,start_new_session=True)
save('gateway.pid',str(proxy.pid))
combined = (state/'tls-cert.pem').read_text()+pathlib.Path('/etc/ssl/certs/ca-certificates.crt').read_text()
save('trusted-ca.pem',combined)
environment = dict(os.environ, SUPABASE_URL='https://localhost:54443', SUPABASE_SERVICE_ROLE_KEY=service,
                   GITA_VERIFY_PUBLIC_KEY=anon, NODE_EXTRA_CA_CERTS=str(state/'trusted-ca.pem'))
environment['NO_PROXY'] = environment.get('NO_PROXY','')+',localhost,127.0.0.1'
environment['no_proxy'] = environment['NO_PROXY']
for attempt in range(60):
    result = subprocess.run(['node','-e',"fetch('https://localhost:54443/rest/v1/rpc/scripture_catalog',{method:'POST',headers:{apikey:process.env.GITA_VERIFY_PUBLIC_KEY,'Content-Type':'application/json'},body:'{}'}).then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"],cwd=ROOT,env=environment,capture_output=True)
    if result.returncode == 0: break
    if attempt == 59: raise RuntimeError('Local TEST Data API did not become ready')
    time.sleep(0.5)
output = run('npx','tsx','services/ingest/publish-scripture.ts','services/ingest/releases/gita-open-1.bundle.json','--publish',cwd=ROOT,env=environment)
print(output.strip())
print(run('npx','tsx','scripts/verify-gita-pilot-release.ts','--url','https://localhost:54443','--out',str(state/'verification.json'),cwd=ROOT,env=environment))
sql("""set role anon; do $$ begin
  begin insert into scripture_releases(id,work_id,edition_id,manifest) values('forbidden','x','x','{}'); raise exception 'Anonymous write accepted'; exception when insufficient_privilege then null; end;
  begin perform publish_scripture_release('forbidden'); raise exception 'Anonymous publication accepted'; exception when insufficient_privilege then null; end;
end $$;""")
print('PASS: local TEST migrations, preserved constraint, malformed/NULL manifest denial, anonymous write/publication denial; all 700 originals and quotation hashes verified.')
