-- rls_auto_enable is an event-trigger hook, not an application RPC.
-- Its postgres owner keeps implicit EXECUTE; event-trigger invocation does not
-- require EXECUTE for the user whose DDL fires it. No function body/trigger changes.
begin;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is null then
    return; -- Projects without the optional auto-RLS hook need no privilege change.
  end if;
  if not exists (select 1 from pg_proc where oid='public.rls_auto_enable()'::regprocedure
                and prorettype='event_trigger'::regtype and prosecdef) then
    raise exception 'Unexpected rls_auto_enable signature/security; review before revoking';
  end if;
  revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
end $$;
commit;
