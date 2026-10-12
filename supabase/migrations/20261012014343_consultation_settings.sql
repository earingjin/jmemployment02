-- Unapplied deployment draft. All six fixed settings share one atomic row.
begin;
create or replace function public.consultation_valid_url(value text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    char_length(value) <= 2048
    and value !~ '[[:space:]\\\x01-\x1f\x7f]'
    and value ~ '^https://(docs\.google\.com/forms/d/[A-Za-z0-9_/-]+|forms\.gle/[A-Za-z0-9_-]+/?)(\?[^#]*)?$'
    and not exists (
      select 1 from unnest(string_to_array(split_part(value, '?', 2), '&')) as parameter
      where split_part(parameter, '=', 1) !~ '^(usp|embedded|pli|entry\.[0-9]+)$'
    ), false);
$$;
create or replace function public.consultation_valid_settings(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare setting_id text;
begin
  if value is null or jsonb_typeof(value) <> 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(value)) <> 6 then return false; end if;
  foreach setting_id in array array['default','employment-support','job-leap','future-experience','field-training','smartcare'] loop
    if not (value ? setting_id) or jsonb_typeof(value -> setting_id) <> 'string' then return false; end if;
    if not (setting_id <> 'default' and value ->> setting_id = '')
       and not public.consultation_valid_url(value ->> setting_id) then return false; end if;
  end loop;
  return true;
end;
$$;
create table public.consultation_settings (
  id text primary key check (id = 'consultation'),
  urls jsonb not null check (public.consultation_valid_settings(urls)),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.consultation_settings enable row level security;
revoke all on table public.consultation_settings from public, anon, authenticated, service_role;
grant select, update on table public.consultation_settings to service_role;
revoke all on function public.consultation_valid_url(text) from public, anon, authenticated;
revoke all on function public.consultation_valid_settings(jsonb) from public, anon, authenticated;
grant execute on function public.consultation_valid_url(text) to service_role;
grant execute on function public.consultation_valid_settings(jsonb) to service_role;
insert into public.consultation_settings (id, urls) values ('consultation', jsonb_build_object(
  'default', 'https://docs.google.com/forms/d/e/1FAIpQLSeLKsOC3okBg0q4SXxxQnLc_W0eJtOFY20I5K_E0NjFhVs6rw/viewform?usp=dialog',
  'employment-support', '', 'job-leap', '', 'future-experience', '', 'field-training', '', 'smartcare', ''
));
commit;
