"""Exercise actual PostgreSQL RLS/search/publication; uses an ephemeral local container."""
import json
import pathlib
import subprocess
import time
import uuid

root = pathlib.Path(__file__).resolve().parents[1]
name = 'pramana-scripture-test-' + uuid.uuid4().hex[:8]
def run(*args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kwargs).stdout
def sql(value):
    return run('docker', 'exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', input=value)
def literal(value):
    return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"
try:
    run('docker', 'run', '-d', '--name', name, '-e', 'POSTGRES_PASSWORD=local-test-only', 'postgres:17-alpine')
    for attempt in range(60):
        try:
            sql('select 1;')
            break
        except subprocess.CalledProcessError:
            if attempt == 59: raise
            time.sleep(0.5)
    sql('create role anon; create role authenticated; create role service_role bypassrls;')
    sql((root / 'supabase/migrations/202610130001_scripture_retrieval.sql').read_text())
    manifest = {'work_id':'vishnu-purana','edition_id':'test-only','publisher':'Gita Press','publisher_location':'Gorakhpur',
                'rights_approved':True,'reviewers':['Test A','Test B'],'permissions':['index','quote'],
                'expected_passage_count':2,'completeness':'selected','release':'test-only','license_id':'test-only','permission_proof':'test-only-not-a-source'}
    sql("insert into scripture_releases(id,work_id,edition_id,manifest) values('test-release','vishnu-purana','test-only'," + literal(manifest) + ');')
    def insert(number):
        passage = {'id':f'test-{number}','work_id':'vishnu-purana','edition_id':'test-only','review_status':'approved',
                   'original':f'धर्म सत्य {number}','translation':f'धर्म सत्य {number}','content_sha256':'a'*64,'translation_sha256':'b'*64}
        sql(f"insert into scripture_passages(id,release_id,work_id,edition_id,chapter,exact_verse,locator,translation_language,passage) values('test-{number}','test-release','vishnu-purana','test-only',2,'3','{number}.2.3','sa',"+literal(passage)+');')
    insert(1)
    sql("""set role service_role; do $$ begin
      begin perform publish_scripture_release('test-release'); raise exception 'Incomplete release was published';
      exception when raise_exception then if sqlerrm <> 'Release is incomplete' then raise; end if; end;
    end $$; reset role;""")
    sql("""set role anon; do $$ begin
      if (select count(*) from scripture_passages) <> 0 then raise exception 'Staged text leaked'; end if;
      begin insert into scripture_releases(id,work_id,edition_id,manifest) values('forbidden','x','x','{}');
        raise exception 'Anonymous write allowed'; exception when insufficient_privilege then null; end;
    end $$; reset role;""")
    insert(2)
    sql("set role service_role; select publish_scripture_release('test-release'); reset role;")
    sql("""set role anon; do $$ begin
      if (select count(*) from search_scripture('धर्म', array['vishnu-purana'])) <> 2 then raise exception 'Hindi search failed'; end if;
      if (select count(*) from search_scripture('धर्म', array['skanda-purana'])) <> 0 then raise exception 'Scope leaked'; end if;
      if (select count(*) from search_scripture('1.2.3', array['vishnu-purana'],null,null,'1.2.3')) <> 1 then raise exception 'Hierarchy collision'; end if;
      if (select count(*) from search_scripture('धर्म',null,null,'hi')) <> 0 then raise exception 'Language scope leaked'; end if;
      if (select count(*) from scripture_page()) <> 2 then raise exception 'Library page wrong'; end if;
      if scripture_record('test-1')->>'id' <> 'test-1' then raise exception 'Reader lookup failed'; end if;
      begin perform search_scripture('धर्म',null,null,null,null,null); raise exception 'Unbounded limit accepted';
        exception when invalid_parameter_value then null; end;
      if (scripture_catalog()->>'approved_passages')::int <> 2 then raise exception 'Catalog wrong'; end if;
      begin perform publish_scripture_release('test-release'); raise exception 'Anonymous publish allowed';
        exception when insufficient_privilege then null; end;
    end $$;""")
    print('PASS: PostgreSQL 17 migration, staged-release isolation, anonymous write/publish denial, Hindi FTS, work/language scope, hierarchical references, release counts.')
finally:
    subprocess.run(['docker','rm','-f','-v',name], capture_output=True)
