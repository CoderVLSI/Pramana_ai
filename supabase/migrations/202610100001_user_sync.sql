-- User-owned optional backups. No service-role key belongs in the app.
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  reading jsonb not null default '{}'::jsonb check (jsonb_typeof(reading) = 'object'),
  approved_memories jsonb not null default '[]'::jsonb
    check (jsonb_typeof(approved_memories) = 'array' and jsonb_array_length(approved_memories) <= 20),
  updated_at timestamptz not null default now(),
  check (octet_length(profile::text) <= 8192),
  check (octet_length(reading::text) <= 2048),
  check (octet_length(approved_memories::text) <= 32768)
);
alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon;
revoke all on public.user_settings from authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
create policy "Read own settings" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own settings" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own settings" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own settings" on public.user_settings for delete to authenticated using ((select auth.uid()) = user_id);
create function public.stamp_user_settings() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger stamp_user_settings before update on public.user_settings for each row execute function public.stamp_user_settings();
