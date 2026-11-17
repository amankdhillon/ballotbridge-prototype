-- Migration 2: reactions, linked passages, legislation links, and profile labels.
-- Run once in the SQL Editor, BEFORE pushing the new code. Safe to re-run.

-- Legislation links for each measure: a JSON array of { "label": "...", "url": "https://..." }
alter table measures add column if not exists legislation jsonb not null default '[]'::jsonb
  check (jsonb_typeof(legislation) = 'array');

-- A passage from the official text that a post is about
alter table posts add column if not exists quote text not null default ''
  check (char_length(quote) <= 600);

-- Emoji reactions. Clients never write this table directly; they call toggle_reaction().
create table if not exists post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '💡', '❓', '👏')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);
create index if not exists reactions_post_idx on post_reactions (post_id);
alter table post_reactions enable row level security;
revoke all on post_reactions from anon, authenticated;

-- Adds the reaction if it's missing, removes it if it's there. Returns true when added.
create or replace function toggle_reaction(p uuid, e text) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); removed int;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from posts where id = p) then raise exception 'That post no longer exists.'; end if;
  delete from post_reactions where post_id = p and user_id = uid and emoji = e;
  get diagnostics removed = row_count;
  if removed > 0 then return false; end if;
  insert into post_reactions (post_id, user_id, emoji) values (p, uid, e);
  return true;
end $$;
grant execute on function toggle_reaction(uuid, text) to authenticated;

-- Live updates for reactions too, so open browsers refresh when someone reacts.
create or replace function notify_measure() returns trigger
language plpgsql security definer set search_path = public as $$
declare mid text;
begin
  if tg_table_name = 'reviews' then
    select measure_id into mid from posts where id = new.post_id;
  elsif tg_table_name = 'post_reactions' then
    select measure_id into mid from posts where id = coalesce(new.post_id, old.post_id);
  else
    mid := new.measure_id;
  end if;
  insert into measure_events (measure_id) values (mid);
  delete from measure_events where created_at < now() - interval '1 hour';
  return null;
end $$;

drop trigger if exists reactions_notify on post_reactions;
create trigger reactions_notify after insert or delete on post_reactions
  for each row execute function notify_measure();

-- Rebuild the post view with reactions and the linked passage. Dependent review_queue is rebuilt too.
drop view if exists review_queue;
drop view if exists post_view;

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
  exists (select 1 from reviews r where r.post_id = p.id and r.reviewer_id = auth.uid()) as reviewed_by_me,
  p.quote,
  coalesce((select jsonb_object_agg(x.emoji, x.n)
            from (select emoji, count(*) as n from post_reactions pr2 where pr2.post_id = p.id group by emoji) x),
           '{}'::jsonb) as reactions,
  coalesce((select array_agg(pr3.emoji) from post_reactions pr3
            where pr3.post_id = p.id and pr3.user_id = auth.uid()),
           '{}'::text[]) as my_reactions
from posts p
join profiles pr on pr.id = p.author_id;

create view review_queue as
select v.id, v.measure_id, m.short_title as measure_title, m.official_text,
       v.body, v.category, v.reading_level, v.approvals, v.changes_count, v.created_at
from post_view v
join measures m on m.id = v.measure_id
where v.type = 'explanation' and v.status = 'pending'
  and not v.is_own and not v.reviewed_by_me;

grant select on post_view, review_queue to authenticated;
revoke all on post_view, review_queue from anon;
