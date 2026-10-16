-- Prove default/PUBLIC privileges are gone, while authorized non-owner DDL
-- still fires the security-definer event trigger for every configured tag.
create role rls_test_ddl nologin;
grant usage, create on schema public to rls_test_ddl;
do $$ begin
 if has_function_privilege('anon','public.rls_auto_enable()','EXECUTE')
 or has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE')
 or has_function_privilege('rls_test_ddl','public.rls_auto_enable()','EXECUTE') then
  raise exception 'Application/PUBLIC execute remains'; end if;
 if not has_function_privilege('postgres','public.rls_auto_enable()','EXECUTE') then
  raise exception 'Owner execution lost'; end if;
end $$;
set role rls_test_ddl;
create table public.rls_test_created(id integer);
create table public.rls_test_as as select 1 as id;
select 1 as id into public.rls_test_into;
reset role;
do $$ begin
 if (select count(*) from pg_class where relname in ('rls_test_created','rls_test_as','rls_test_into') and relrowsecurity) <> 3 then
  raise exception 'Event trigger stopped enabling RLS'; end if;
end $$;
drop table public.rls_test_created,public.rls_test_as,public.rls_test_into;
revoke usage,create on schema public from rls_test_ddl;
drop role rls_test_ddl;
