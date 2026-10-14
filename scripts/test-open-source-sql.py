"""Exercise the open-source rights migration on a throwaway local PostgreSQL (no Docker needed when
the server binaries exist at /usr/lib/postgresql/*/bin; run as root, it switches to the postgres user)."""
import glob, json, os, pathlib, subprocess, sys, tempfile, time

root = pathlib.Path(__file__).resolve().parents[1]
bindir = sorted(glob.glob('/usr/lib/postgresql/*/bin'))[-1]
data = tempfile.mkdtemp(prefix='pramana-pg-'); os.chmod(data, 0o700)
port = '54329'
def as_pg(cmd, **kw):
    full = f"{bindir}/{cmd}" if os.geteuid() != 0 else None
    if os.geteuid() == 0:
        subprocess.run(['chown', '-R', 'postgres:postgres', data], check=True)
        return subprocess.run(['su', 'postgres', '-c', f'{bindir}/{cmd}'], check=True, capture_output=True, text=True, **kw)
    return subprocess.run(f'{bindir}/{cmd}', shell=True, check=True, capture_output=True, text=True, **kw)
def sql(value, expect_error=None):
    p = subprocess.run(['psql', '-h', '/tmp', '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'],
                       input=value, capture_output=True, text=True)
    if expect_error:
        assert p.returncode != 0 and expect_error in p.stderr, f'expected failure containing {expect_error!r}, got: {p.stderr or "success"}'
        return
    assert p.returncode == 0, p.stderr
def lit(v): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
def release(rid, manifest, work='bhagavad-gita'):
    return f"insert into scripture_releases(id,work_id,edition_id,manifest) values('{rid}','{work}','{manifest['edition_id']}',{lit(manifest)});"
base = {'edition_id':'e1','publisher':'Gita Press','publisher_location':'Gorakhpur','rights_approved':True,'reviewers':['A','B'],
        'permissions':['index','quote'],'expected_passage_count':1,'release':'r1','license_id':'x','permission_proof':'x'}
pd = dict(base, work_id='bhagavad-gita', rights_class='public_domain', publisher='Synthetic collection', publisher_location='n/a',
          license_id='public-domain', public_domain_basis='Synthetic fixture: author died over a century ago.',
          source_url='https://example.org/s', sources=[{'role':'original'}])
try:
    as_pg(f'initdb -D {data} -U postgres -A trust >/dev/null')
    as_pg(f'pg_ctl -D {data} -o "-p {port} -k /tmp -c listen_addresses=" -l {data}/log -w start >/dev/null')
    sql('create role anon; create role authenticated; create role service_role bypassrls;')
    for name in ('202610130001_scripture_retrieval.sql', '202610140001_open_source_releases.sql'):
        sql((root / 'supabase/migrations' / name).read_text())
    sql((root / 'supabase/migrations/202610140001_open_source_releases.sql').read_text())  # safe to run twice
    # Gita Press path is unchanged: still accepted, and still strict.
    sql(release('gp-ok', dict(base, work_id='vishnu-purana'), 'vishnu-purana'))
    sql(release('gp-bad', dict(base, work_id='vishnu-purana', publisher='Someone Else'), 'vishnu-purana'), 'scripture_manifest_gita_press')
    sql(release('gp-one-reviewer', dict(base, work_id='vishnu-purana', reviewers=['A']), 'vishnu-purana'), 'scripture_manifest_reviewers')
    # Open-source path accepts a complete record and rejects every shortcut.
    sql(release('pd-ok', pd))
    for key, value in [('license_id','all-rights-reserved'), ('public_domain_basis','short'), ('source_url','http://insecure'),
                       ('sources', []), ('rights_approved', False), ('reviewers', ['A']), ('rights_class', 'made_up')]:
        sql(release('pd-bad-'+key, dict(pd, **{key: value})), 'scripture_manifest')
    # A public-domain release publishes, searches and stays read-only for anonymous users.
    passage = {'id':'pd_t1','work_id':'bhagavad-gita','edition_id':'e1','review_status':'approved','original':'धर्म सत्य','translation':'धर्म सत्य',
               'content_sha256':'a'*64,'translation_sha256':'b'*64}
    sql(f"insert into scripture_passages(id,release_id,work_id,edition_id,chapter,exact_verse,locator,translation_language,passage) values('pd_t1','pd-ok','bhagavad-gita','e1',2,'47','2.47','sa',{lit(passage)});")
    sql("set role service_role; select publish_scripture_release('pd-ok'); reset role;")
    sql("""set role anon; do $$ begin
      if (select count(*) from search_scripture('धर्म', array['bhagavad-gita'])) <> 1 then raise exception 'search failed'; end if;
      if (select count(*) from search_scripture('2.47', array['bhagavad-gita'], null, null, '2.47')) <> 1 then raise exception 'locator failed'; end if;
      begin insert into scripture_releases(id,work_id,edition_id,manifest) values('x','x','x','{}'); raise exception 'anon write allowed';
        exception when insufficient_privilege then null; end;
      begin perform publish_scripture_release('pd-ok'); raise exception 'anon publish allowed';
        exception when insufficient_privilege then null; end;
    end $$;""")
    print('PASS: open-source rights migration on local PostgreSQL: Gita Press rules unchanged, public-domain rules enforced, publish + search + anonymous read-only.')
finally:
    subprocess.run(f'su postgres -c "{bindir}/pg_ctl -D {data} -m immediate stop" >/dev/null 2>&1', shell=True)
