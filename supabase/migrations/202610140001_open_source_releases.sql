-- Adds a second, equally strict rights route (public domain / CC0 / CC-BY) beside Gita Press.
-- Gita Press releases keep every existing requirement. Existing rows (none are published) keep working:
-- a manifest without rights_class is treated as gita_press_permission.
begin;
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.scripture_releases'::regclass and contype = 'c' loop
    execute format('alter table public.scripture_releases drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.scripture_releases
  add constraint scripture_manifest_keys check (manifest ?& array['work_id','edition_id','publisher','publisher_location','rights_approved','reviewers','permissions','expected_passage_count','release','license_id','permission_proof']),
  add constraint scripture_manifest_scope check (manifest->>'work_id' = work_id and manifest->>'edition_id' = edition_id),
  add constraint scripture_manifest_count check (case when manifest->>'expected_passage_count' ~ '^[0-9]+$' then (manifest->>'expected_passage_count')::integer > 0 else false end),
  add constraint scripture_manifest_proof check (length(manifest->>'permission_proof') > 0),
  add constraint scripture_manifest_rights check (manifest->>'rights_approved' = 'true'),
  add constraint scripture_manifest_reviewers check (case when jsonb_typeof(manifest->'reviewers') = 'array' then jsonb_array_length(manifest->'reviewers') >= 2 else false end),
  add constraint scripture_manifest_permissions check (manifest->'permissions' @> '["index", "quote"]'::jsonb),
  add constraint scripture_manifest_rights_class check (coalesce(manifest->>'rights_class','gita_press_permission') in ('gita_press_permission','public_domain')),
  add constraint scripture_manifest_gita_press check (
    coalesce(manifest->>'rights_class','gita_press_permission') <> 'gita_press_permission'
    or (manifest->>'publisher' = 'Gita Press' and manifest->>'publisher_location' = 'Gorakhpur')),
  add constraint scripture_manifest_open_source check (
    manifest->>'rights_class' is distinct from 'public_domain'
    or (manifest->>'license_id' in ('public-domain','CC0-1.0','CC-BY-4.0')
        and length(coalesce(manifest->>'public_domain_basis','')) >= 20
        and coalesce(manifest->>'source_url','') ~ '^https://'
        and jsonb_typeof(manifest->'sources') = 'array'
        and jsonb_array_length(manifest->'sources') >= 1));
commit;
