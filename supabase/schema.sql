-- BallotBridge schema for Supabase.
-- Run once: SQL Editor > New query > paste > Run.
-- Safe to read top to bottom. Rules live in the database, so the page
-- can't bypass them even if it has a bug.

-- ============ Settings (facilitator edits these; clients cannot read this table) ============
create table app_settings (
  key text primary key,
  value text not null
);
alter table app_settings enable row level security;
insert into app_settings (key, value) values
  ('verify_code', 'CHANGE-ME-BEFORE-SESSION'),
  ('reviews_required', '1');

-- Clients may read only this single value, through a view.
create view app_public as
  select (select value::int from app_settings where key = 'reviews_required') as reviews_required;

-- ============ Tables ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null constraint profiles_nickname_length check (char_length(nickname) between 1 and 30),
  icon text not null default '🦊',
  state text not null default '',
  district text not null default '',
  topics text[] not null default '{}',
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table measures (
  id text primary key,
  short_title text not null,
  title text not null,
  scope text not null check (scope in ('Statewide', 'Local')),
  district text not null default '',
  official_text text not null default '',
  ai_summary text not null default '',
  funders jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  measure_id text not null references measures(id) on delete cascade,
  type text not null check (type in ('explanation', 'question', 'reply')),
  parent_id uuid references posts(id) on delete cascade,
  category text not null default '',
  reading_level text not null default '',
  body text not null constraint posts_body_length check (char_length(trim(body)) between 1 and 1500),
  anonymous boolean not null default false,
  status text not null default 'open' check (status in ('pending', 'reviewed', 'open')),
  created_at timestamptz not null default now(),
  constraint posts_reply_has_parent check ((parent_id is null) = (type <> 'reply')),
  constraint posts_no_anonymous_explanation check (type <> 'explanation' or anonymous = false)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  verdict text not null check (verdict in ('approve', 'changes')),
  checks jsonb not null default '{}'::jsonb,
  note text not null default '' constraint reviews_note_length check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  constraint reviews_one_per_reviewer unique (post_id, reviewer_id),
  constraint reviews_changes_need_note check (verdict <> 'changes' or char_length(trim(note)) > 0),
  constraint reviews_approve_needs_checks check (
    verdict <> 'approve' or (
      checks->>'matches' = 'true' and checks->>'neutral' = 'true'
      and checks->>'sourced' = 'true' and checks->>'plain' = 'true'
    )
  )
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  measure_id text not null references measures(id) on delete cascade,
  claim text not null check (char_length(trim(claim)) between 1 and 300),
  url text not null constraint sources_url_https check (url ~ '^https://\S+$' and char_length(url) <= 500),
  source_type text not null default 'Official',
  submitted_by uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Tiny change log. Clients subscribe to inserts here instead of polling tables.
create table measure_events (
  id bigint generated always as identity primary key,
  measure_id text not null,
  created_at timestamptz not null default now()
);

create index posts_measure_idx on posts (measure_id, created_at);
create index posts_parent_idx on posts (parent_id);
create index reviews_post_idx on reviews (post_id);
create index sources_measure_idx on sources (measure_id);
create index events_created_idx on measure_events (created_at);

-- ============ Helper functions (run with owner rights so policies can use them) ============
create or replace function is_verified_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_verified from profiles where id = auth.uid()), false)
$$;

-- Unlock rule: you may write a new explanation only after reviewing at least as many as you've written.
create or replace function unlock_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from reviews where reviewer_id = auth.uid())
      >= (select count(*) from posts where author_id = auth.uid() and type = 'explanation')
$$;

create or replace function can_review(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from posts
    where id = p and type = 'explanation' and status = 'pending' and author_id <> auth.uid()
  )
$$;

create or replace function my_stats()
returns table (explanations_written bigint, reviews_given bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from posts where author_id = auth.uid() and type = 'explanation'),
    (select count(*) from reviews where reviewer_id = auth.uid())
$$;

-- Facilitator code check. Verified users only get the flag set here, never by writing the column directly.
create or replace function redeem_verify_code(code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare expected text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select value into expected from app_settings where key = 'verify_code';
  if code is null or code <> expected then raise exception 'That code is not recognized.'; end if;
  update profiles set is_verified = true where id = auth.uid();
  return true;
end $$;

-- ============ Triggers: rules the database enforces no matter what the page sends ============

-- Clients can't choose a status. Explanations always start pending.
-- Replies must belong to the same measure as their parent.
create or replace function posts_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := case when new.type = 'explanation' then 'pending' else 'open' end;
  if new.parent_id is not null then
    perform 1 from posts p where p.id = new.parent_id and p.measure_id = new.measure_id;
    if not found then raise exception 'That post no longer exists.'; end if;
  end if;
  return new;
end $$;

create trigger posts_before_insert before insert on posts
  for each row execute function posts_before_insert();

-- An explanation becomes reviewed once it has enough approvals.
create or replace function reviews_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare needed int; approvals int;
begin
  select value::int into needed from app_settings where key = 'reviews_required';
  select count(*) into approvals from reviews where post_id = new.post_id and verdict = 'approve';
  if approvals >= needed then
    update posts set status = 'reviewed' where id = new.post_id and type = 'explanation';
  end if;
  return null;
end $$;

create trigger reviews_after_insert after insert on reviews
  for each row execute function reviews_after_insert();

-- Logs a change event so open browsers refresh that measure.
create or replace function notify_measure() returns trigger
language plpgsql security definer set search_path = public as $$
declare mid text;
begin
  if tg_table_name = 'reviews' then
    select measure_id into mid from posts where id = new.post_id;
  else
    mid := new.measure_id;
  end if;
  insert into measure_events (measure_id) values (mid);
  delete from measure_events where created_at < now() - interval '1 hour';
  return null;
end $$;

create trigger posts_notify after insert or update on posts
  for each row execute function notify_measure();
create trigger sources_notify after insert on sources
  for each row execute function notify_measure();
create trigger reviews_notify after insert on reviews
  for each row execute function notify_measure();

-- ============ Views: the only way the page reads posts, reviews, and sources ============
-- Authors are hidden on anonymous posts. Raw author and reviewer ids are never exposed.
create view post_view as
select
  p.id, p.type, p.measure_id, p.parent_id, p.category, p.reading_level, p.body,
  p.status, p.anonymous, p.created_at,
  case when p.anonymous then 'Anonymous' else pr.nickname end as author_name,
  case when p.anonymous then '' else pr.icon end as author_icon,
  (not p.anonymous and pr.is_verified) as author_verified,
  (p.author_id = auth.uid()) as is_own,
  (select count(*) from reviews r where r.post_id = p.id and r.verdict = 'approve') as approvals,
  (select count(*) from reviews r where r.post_id = p.id and r.verdict = 'changes') as changes_count,
  exists (select 1 from reviews r where r.post_id = p.id and r.reviewer_id = auth.uid()) as reviewed_by_me
from posts p
join profiles pr on pr.id = p.author_id;

-- Explanations waiting for this user's review.
create view review_queue as
select v.id, v.measure_id, m.short_title as measure_title, m.official_text,
       v.body, v.category, v.reading_level, v.approvals, v.changes_count, v.created_at
from post_view v
join measures m on m.id = v.measure_id
where v.type = 'explanation' and v.status = 'pending'
  and not v.is_own and not v.reviewed_by_me;

-- Sources without the submitter's id.
create view source_view as
select id, measure_id, claim, url, source_type, status, created_at from sources;

-- ============ Row Level Security ============
alter table profiles enable row level security;
alter table measures enable row level security;
alter table posts enable row level security;
alter table reviews enable row level security;
alter table sources enable row level security;
alter table measure_events enable row level security;

create policy profiles_read_own on profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy measures_read on measures for select to authenticated using (true);
create policy events_read on measure_events for select to authenticated using (true);

create policy posts_insert on posts for insert to authenticated with check (
  author_id = auth.uid()
  and (type <> 'explanation' or (is_verified_user() and unlock_ok()))
);
create policy reviews_insert on reviews for insert to authenticated with check (
  reviewer_id = auth.uid() and is_verified_user() and can_review(post_id)
);
create policy sources_insert on sources for insert to authenticated with check (submitted_by = auth.uid());

-- ============ Column and table grants ============
revoke all on app_settings, profiles, measures, posts, reviews, sources, measure_events from anon;
revoke select on posts, reviews, sources from authenticated;   -- read through views only
revoke insert, update on profiles from authenticated;
grant select on profiles, measures, measure_events to authenticated;
grant insert (id, nickname, icon) on profiles to authenticated;
grant update (nickname, icon, state, district, topics) on profiles to authenticated;
grant insert on posts, reviews, sources to authenticated;
grant select on post_view, review_queue, source_view, app_public to authenticated;
revoke all on post_view, review_queue, source_view, app_public from anon;
revoke all on app_settings from authenticated;

-- Live updates: publish the change log so clients can subscribe to it.
alter publication supabase_realtime add table measure_events;

-- ============ Seed placeholder measures (replace text in the Table Editor before the session) ============
insert into measures (id, short_title, title, scope, district, official_text, ai_summary) values
  ('prop-38', 'Prop 38', 'Proposition 38 (placeholder)', 'Statewide', '',
   'PLACEHOLDER: paste the official ballot text from the Secretary of State voter guide.',
   'PLACEHOLDER summary. The facilitator writes this before the session.'),
  ('prop-40', 'Prop 40', 'Proposition 40 (placeholder)', 'Statewide', '',
   'PLACEHOLDER: paste the official ballot text from the Secretary of State voter guide.',
   'PLACEHOLDER summary. The facilitator writes this before the session.'),
  ('prop-41', 'Prop 41', 'Proposition 41 (placeholder)', 'Statewide', '',
   'PLACEHOLDER: paste the official ballot text from the Secretary of State voter guide.',
   'PLACEHOLDER summary. The facilitator writes this before the session.'),
  ('prop-43', 'Prop 43', 'Proposition 43 (placeholder)', 'Statewide', '',
   'PLACEHOLDER: paste the official ballot text from the Secretary of State voter guide.',
   'PLACEHOLDER summary. The facilitator writes this before the session.'),
  ('local-a', 'Local Measure A', 'Local Measure A (placeholder)', 'Local', 'Sample District A',
   'PLACEHOLDER: paste the official local ballot text here.',
   'PLACEHOLDER summary. The facilitator writes this before the session.');
