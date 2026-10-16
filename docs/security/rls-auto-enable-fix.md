# Restrict auto-RLS event-trigger execution — 2026-10-16

## Inspected LIVE behavior

`public.rls_auto_enable()` returns `event_trigger`, is owned by `postgres`, runs as `SECURITY DEFINER` with `search_path=pg_catalog`, and enables RLS on new tables in `public`. It inspects `pg_event_trigger_ddl_commands()` for `CREATE TABLE`, `CREATE TABLE AS`, and `SELECT INTO`. It catches/logs errors. It does not read application/user data.

The enabled `ddl_command_end` event trigger `ensure_rls`, owned by postgres, was its only catalog dependency. No other stored function body referenced it. Its ACL was NULL (default PUBLIC execution), which produced advisor warnings [0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). This event-trigger hook is not an application RPC. No other explicit role grants needed preservation; the owner keeps implicit execution rights.

## Change

New migration: `supabase/migrations/20261016162834_restrict_rls_auto_enable_execute.sql` (generated using `supabase migration new`, CLI 2.120.0).

Revoke EXECUTE from PUBLIC, anon and authenticated. Preserve the function body, security-definer setting, owner and enabled event trigger. A guard refuses an unexpected function return/security signature. On projects without this optional function, the migration has no effect. No old migration, app file, workflow, source text or release data was changed.

## TEST first

Used the previously approved isolated PostgreSQL 17 / official Supabase PostgREST 16.4 TEST core, not a hosted project. Reproduced the inspected LIVE function/trigger using `eval/fixtures/rls-auto-enable-test.sql`, applied the new migration, then ran `eval/fixtures/rls-auto-enable-check.sql`.

The assertions prove:

- anon, authenticated and a fresh non-owner DDL role have no execution privilege (including inherited PUBLIC execution).
- postgres retains execution.
- the non-owner role, despite no EXECUTE, can perform each configured DDL form; the event trigger automatically enables RLS on all three test tables.
- test objects/role are removed afterward.

Command:

```sh
python3 scripts/gita-pilot-local-test.py \
  --state /workspace/scratch/security-rls/test \
  --bundle-list /workspace/scratch/upanishads-pilot/test-bundles.json \
  --verify-script scripts/verify-upanishad-releases.ts \
  --setup-sql eval/fixtures/rls-auto-enable-test.sql \
  --extra-migration supabase/migrations/20261016162834_restrict_rls_auto_enable_execute.sql \
  --post-check-sql eval/fixtures/rls-auto-enable-check.sql
```

The external bundle list contains the committed Gita bundle and eleven committed Upanishad bundles. Actual CLI publication used ephemeral TEST credentials outside Git. Anonymous catalog, Devanagari and exact-reference searches, pages, records/context, hashes and tamper rejection passed for the eleven works; all 2,272 passages paginated and verified. The separate Gita verifier also checks Gita word/reference searches and reader/context. Anonymous writes/publication and malformed manifests remain denied. No actual secret key values are recorded.

## LIVE result

Applied the identical migration through authenticated Supabase MCP only after TEST passed. LIVE project `fdntjeknihekiqldyrpn`:

| Check | Result |
| --- | --- |
| anon EXECUTE | false |
| authenticated EXECUTE | false |
| postgres EXECUTE | true |
| ensure_rls | still enabled |
| anonymous passage INSERT | false |
| security advisor after migration | `lints: []` — 0028/0029 cleared |
| public scripture regression | Gita + eleven Upanishads, 2,272 passages; all checks passed |

No LIVE content was republished. This is a permission fix only. The function's existing catch-and-log behavior is unchanged. The isolated TEST demonstrates that revocation does not stop the event-trigger path, including DDL by a role that cannot invoke the function directly. Background: [PostgreSQL event-trigger definition](https://www.postgresql.org/docs/17/event-trigger-definition.html).
