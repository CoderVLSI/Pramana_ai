-- Public retrieval of released, reviewed passages; ingestion is service-role only.
-- Private OCR is deliberately kept out of these public tables.
begin;
create table if not exists public.scripture_releases (
  id text primary key,
  work_id text not null,
  edition_id text not null,
  manifest jsonb not null,
  check (manifest ?& array['work_id','edition_id','publisher','publisher_location','rights_approved','reviewers','permissions','expected_passage_count','release','license_id','permission_proof']),
  check ((manifest->>'expected_passage_count')::integer > 0),
  check (length(manifest->>'permission_proof') > 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  check (manifest->>'work_id' = work_id),
  check (manifest->>'edition_id' = edition_id),
  check (manifest->>'publisher' = 'Gita Press'),
  check (manifest->>'publisher_location' = 'Gorakhpur'),
  check (manifest->>'rights_approved' = 'true'),
  check (jsonb_array_length(manifest->'reviewers') >= 2),
  check (manifest->'permissions' @> '["index", "quote"]'::jsonb)
);
create table if not exists public.scripture_passages (
  id text primary key,
  release_id text not null references public.scripture_releases(id) on delete cascade,
  work_id text not null,
  edition_id text not null,
  chapter integer not null check (chapter > 0),
  exact_verse text not null,
  locator text not null,
  translation_language text,
  passage jsonb not null,
  check (passage ?& array['id','work_id','edition_id','review_status','content_sha256','translation_sha256','original','translation']),
  search_document tsvector generated always as (
    to_tsvector('simple'::regconfig, coalesce(passage->>'original','') || ' ' || coalesce(passage->>'translation',''))
  ) stored,
  check (passage->>'id' = id),
  check (passage->>'work_id' = work_id),
  check (passage->>'edition_id' = edition_id),
  check (passage->>'review_status' = 'approved'),
  check (passage->>'content_sha256' ~ '^[a-f0-9]{64}$'),
  check (passage->>'translation_sha256' ~ '^[a-f0-9]{64}$')
);
create index if not exists scripture_search_gin on public.scripture_passages using gin(search_document);
create index if not exists scripture_scope_locator on public.scripture_passages(work_id, edition_id, locator);
alter table public.scripture_releases enable row level security;
alter table public.scripture_passages enable row level security;
revoke all on public.scripture_releases, public.scripture_passages from anon, authenticated;
grant select on public.scripture_releases, public.scripture_passages to anon, authenticated;
grant all on public.scripture_releases, public.scripture_passages to service_role;
drop policy if exists "Released scripture metadata" on public.scripture_releases;
create policy "Released scripture metadata" on public.scripture_releases for select to anon, authenticated using (published);
drop policy if exists "Released scripture passages" on public.scripture_passages;
create policy "Released scripture passages" on public.scripture_passages for select to anon, authenticated using (
  exists (select 1 from public.scripture_releases r where r.id = release_id and r.published and r.work_id = scripture_passages.work_id and r.edition_id = scripture_passages.edition_id)
);

create or replace function public.search_scripture(
  search_query text, selected_works text[] default null, selected_editions text[] default null,
  selected_language text default null, exact_locator text default null, result_limit integer default 3
) returns setof jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare parsed tsquery;
begin
  if search_query is null or length(search_query) not between 1 and 2000 or cardinality(selected_works) > 132 or cardinality(selected_editions) > 100 or result_limit is null or result_limit not between 1 and 10 then
    raise exception 'Invalid scripture search' using errcode = '22023';
  end if;
  parsed := websearch_to_tsquery('simple', search_query);
  return query select p.passage from public.scripture_passages p
    where (coalesce(cardinality(selected_works),0) = 0 or p.work_id = any(selected_works))
      and (coalesce(cardinality(selected_editions),0) = 0 or p.edition_id = any(selected_editions))
      and (selected_language is null or p.translation_language = selected_language)
      and ((exact_locator is not null and p.locator = exact_locator)
        or (exact_locator is null and p.search_document @@ parsed))
    order by ts_rank_cd(p.search_document, parsed) desc, p.id limit result_limit;
end; $$;
revoke all on function public.search_scripture(text,text[],text[],text,text,integer) from public;
grant execute on function public.search_scripture(text,text[],text[],text,text,integer) to anon, authenticated;

create or replace function public.scripture_catalog()
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  select jsonb_build_object('schema_version',1,'approved_passages',(select count(*) from public.scripture_passages),
    'releases',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'work_id',r.work_id,'edition_id',r.edition_id,
      'completeness',r.manifest->>'completeness','released_in',r.manifest->>'release','source_url',r.manifest->>'source_url',
      'passage_count',(select count(*) from public.scripture_passages p where p.release_id=r.id))) from public.scripture_releases r),'[]'::jsonb));
$$;
revoke all on function public.scripture_catalog() from public;
grant execute on function public.scripture_catalog() to anon, authenticated;

create or replace function public.scripture_page(page_offset integer default 0, page_limit integer default 50)
returns setof jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
begin
  if page_offset is null or page_limit is null or page_offset < 0 or page_offset > 1000000 or page_limit not between 1 and 50 then
    raise exception 'Invalid scripture page'; end if;
  return query select passage from public.scripture_passages order by work_id,edition_id,id offset page_offset limit page_limit;
end; $$;
revoke all on function public.scripture_page(integer,integer) from public;
grant execute on function public.scripture_page(integer,integer) to anon, authenticated;

create or replace function public.scripture_record(passage_id text)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  select p.passage || jsonb_build_object('context',coalesce((select jsonb_agg(c.passage) from (
    select q.passage from public.scripture_passages q where q.work_id=p.work_id and q.edition_id=p.edition_id
      and q.release_id=p.release_id and q.chapter=p.chapter and q.passage->'hierarchy'=p.passage->'hierarchy'
      and q.passage->'source_locator'->>'volume'=p.passage->'source_locator'->>'volume'
    order by (q.id=p.id) desc, abs((q.passage->'source_locator'->>'pdf_page')::integer - (p.passage->'source_locator'->>'pdf_page')::integer),q.id limit 5) c),'[]'::jsonb)) from public.scripture_passages p where p.id=passage_id;
$$;
revoke all on function public.scripture_record(text) from public;
grant execute on function public.scripture_record(text) to anon, authenticated;

-- One atomic visibility switch after bounded ingestion batches are complete.
create or replace function public.publish_scripture_release(release_id text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare release_row public.scripture_releases; actual_count bigint;
begin
  select * into strict release_row from public.scripture_releases where id = release_id for update;
  select count(*) into actual_count from public.scripture_passages p where p.release_id = publish_scripture_release.release_id;
  if actual_count = 0 or actual_count <> (release_row.manifest->>'expected_passage_count')::bigint then
    raise exception 'Release is incomplete';
  end if;
  if exists (select 1 from public.scripture_passages p where p.release_id = publish_scripture_release.release_id
    and (p.work_id <> release_row.work_id or p.edition_id <> release_row.edition_id)) then raise exception 'Source scope mismatch'; end if;
  update public.scripture_releases set published = true where id = release_id;
end; $$;
revoke all on function public.publish_scripture_release(text) from public, anon, authenticated;
grant execute on function public.publish_scripture_release(text) to service_role;
commit;
