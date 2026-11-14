-- Rated Space Chess. Clients can read the lobby and the board.
-- They cannot write match state or Elo; the match edge function does that
-- with the service role, which bypasses these policies.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  elo integer not null default 1200,
  games integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  white_id uuid not null references public.profiles (id),
  black_id uuid references public.profiles (id),
  white_civ text not null,
  black_civ text,
  state jsonb,
  status text not null default 'open' check (status in ('open', 'playing', 'done')),
  winner text check (winner in ('white', 'black')),
  rated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;

create policy profiles_read on public.profiles
  for select to anon, authenticated
  using (true);

create policy matches_read on public.matches
  for select to anon, authenticated
  using (
    status = 'open'
    or white_id = auth.uid()
    or black_id = auth.uid()
  );

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
begin
  base := nullif(trim(new.raw_user_meta_data->>'username'), '');
  if base is null then
    base := 'pilot-' || left(new.id::text, 8);
  end if;
  insert into public.profiles (id, username)
  values (new.id, base);
  return new;
exception
  when unique_violation then
    insert into public.profiles (id, username)
    values (new.id, base || '-' || left(new.id::text, 4));
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create index matches_open_idx on public.matches (status) where status = 'open';

alter publication supabase_realtime add table public.matches;

revoke all on function private.handle_new_user() from public, anon, authenticated;
