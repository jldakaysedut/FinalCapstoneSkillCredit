-- SkillCredit Web — centralized, atomic Admin Ban / Unban decisions.
-- REVIEW AND BACK UP FIRST. Run ONCE in Supabase SQL Editor BEFORE deploying the JSX patch.
-- Based on supplied Supabase schema snapshot. No destructive data deletion.

begin;

-- Direct User Management bans have no repeat_offender case. Link them to the real user
-- rather than inserting a fake repeat_offender row.
alter table public.admin_escalations
  add column if not exists target_user_id uuid references public.user_profiles(id) on delete set null;
alter table public.admin_escalations
  add column if not exists source text not null default 'moderator_escalation';
alter table public.admin_escalations
  add column if not exists action_note text;

create index if not exists idx_admin_escalations_target_user_id
  on public.admin_escalations(target_user_id);

-- Do not expose direct admin decisions and notes to every authenticated account.
-- Preserve moderator INSERT capability and Admin full access (role casing may be Admin).
drop policy if exists "Enable access to admin escalations for authenticated users" on public.admin_escalations;
drop policy if exists "Allow admins full access to admin_escalations" on public.admin_escalations;
drop policy if exists "Allow moderators to insert admin_escalations" on public.admin_escalations;
drop policy if exists "SkillCredit admins manage escalations" on public.admin_escalations;
drop policy if exists "SkillCredit moderators submit escalations" on public.admin_escalations;
drop policy if exists "SkillCredit moderators view own escalations" on public.admin_escalations;

create policy "SkillCredit admins manage escalations" on public.admin_escalations
  for all to authenticated
  using (exists (
    select 1 from public.user_profiles p
    where p.id = (select auth.uid()) and lower(p.role) = 'admin'
  ))
  with check (exists (
    select 1 from public.user_profiles p
    where p.id = (select auth.uid()) and lower(p.role) = 'admin'
  ));

create policy "SkillCredit moderators submit escalations" on public.admin_escalations
  for insert to authenticated
  with check (exists (
    select 1 from public.user_profiles p
    where p.id = (select auth.uid()) and lower(p.role) = 'moderator'
  ));

-- RepeatOffenders.jsx inserts with .select().single() and must still be able to
-- read its newly submitted escalation, without seeing direct Admin Ban notes.
create policy "SkillCredit moderators view own escalations" on public.admin_escalations
  for select to authenticated
  using (
    moderator_id = (select auth.uid())
    and exists (
      select 1 from public.user_profiles p
      where p.id = (select auth.uid()) and lower(p.role) = 'moderator'
    )
  );

-- Transactional function: a ban is never recorded without its profile change,
-- and a profile change never succeeds without its escalation/audit record.
create or replace function public.admin_set_account_ban(
  p_target_user_id uuid,
  p_is_banned boolean,
  p_source text,
  p_escalation_id uuid default null,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_admin_role text;
  v_current_ban boolean;
  v_target_name text;
  v_existing_target uuid;
  v_log_action text;
  v_location text;
  v_rows_changed integer;
begin
  select role into v_admin_role from public.user_profiles where id = v_admin_id;
  if lower(coalesce(v_admin_role, '')) <> 'admin' then
    raise exception 'Only administrators may change account bans';
  end if;
  if p_target_user_id is null or p_target_user_id = v_admin_id then
    raise exception 'Invalid target account';
  end if;
  if p_is_banned is null or p_source is null or p_source not in ('user_management', 'admin_escalations', 'moderator_escalation') then
    raise exception 'Invalid admin ban action';
  end if;
  if p_is_banned and p_source = 'moderator_escalation' and p_escalation_id is null then
    raise exception 'Escalation reference required';
  end if;
  if p_is_banned and p_source = 'admin_escalations' then
    raise exception 'Escalation bans must specify moderator_escalation source';
  end if;

  select coalesce(is_banned, false), full_name
    into v_current_ban, v_target_name
    from public.user_profiles
    where id = p_target_user_id
    for update;
  if not found then raise exception 'Target account not found'; end if;
  if v_current_ban = p_is_banned then
    raise exception 'Account ban status has already changed. Please review the current status.';
  end if;

  if p_is_banned then
    if p_source = 'user_management' then
      insert into public.admin_escalations (
        target_user_id, source, status, admin_id, action_note
      ) values (
        p_target_user_id, 'user_management', 'admin_banned', v_admin_id,
        coalesce(nullif(btrim(p_note), ''), 'Directly banned by an administrator in User Management.')
      );
    else
      -- Verify that the selected moderator escalation belongs to this user.
      select coalesce(e.target_user_id, r.user_id)
        into v_existing_target
        from public.admin_escalations e
        left join public.repeat_offenders r on r.id = e.repeat_offender_id
        where e.id = p_escalation_id and e.status = 'pending'
        for update of e;
      if not found or v_existing_target is distinct from p_target_user_id then
        raise exception 'Escalation no longer matches this pending account';
      end if;

      update public.admin_escalations
        set target_user_id = p_target_user_id,
            status = 'admin_banned', admin_id = v_admin_id,
            updated_at = now(),
            action_note = coalesce(nullif(btrim(p_note), ''), 'Ban enforced after moderator escalation review.')
        where id = p_escalation_id;
    end if;
  else
    -- Restore access from EITHER page, while preserving records of prior bans.
    update public.admin_escalations e
      set status = 'resolved', updated_at = now()
      where e.status = 'admin_banned'
        and (
          e.target_user_id = p_target_user_id
          or exists (
            select 1 from public.repeat_offenders r
            where r.id = e.repeat_offender_id and r.user_id = p_target_user_id
          )
        );
  end if;

  v_log_action := case when p_source = 'moderator_escalation' and p_is_banned
    then 'ENFORCE_BAN' else 'ACCOUNT_STATUS' end;
  v_location := case p_source
    when 'user_management' then 'User Management'
    when 'admin_escalations' then 'Admin Escalations'
    else 'Moderator Escalation Review' end;

  insert into public.admin_logs (admin_id, target_user_id, action_type, details)
  values (
    v_admin_id, p_target_user_id, v_log_action,
    (case when p_is_banned then 'BANNED user: ' else 'UNBANNED user: ' end)
    || coalesce(v_target_name, p_target_user_id::text)
    || ' | Source: ' || v_location
    || ' | Notes: ' || coalesce(nullif(btrim(p_note), ''), 'None provided')
  );

  -- Last: public.user_profiles is already in supabase_realtime. Subscribers on
  -- User Management and Escalations refresh after all related writes commit.
  update public.user_profiles set is_banned = p_is_banned where id = p_target_user_id;
  get diagnostics v_rows_changed = row_count;
  if v_rows_changed <> 1 then
    raise exception 'Account update failed; no ban or audit changes were saved';
  end if;
end;
$$;

revoke all on function public.admin_set_account_ban(uuid, boolean, text, uuid, text) from public;
grant execute on function public.admin_set_account_ban(uuid, boolean, text, uuid, text) to authenticated;

-- Backfill ONLY verifiable User Management bans still active and with the corresponding
-- explicit ban audit log. Never attribute a ban without evidence, never overwrite cases.
with latest_status as (
  select distinct on (l.target_user_id)
    l.id, l.target_user_id, l.admin_id, l.details, l.created_at
  from public.admin_logs l
  where l.action_type = 'ACCOUNT_STATUS'
    and (l.details like 'BANNED user:%' or l.details like 'UNBANNED user:%')
  order by l.target_user_id, l.created_at desc, l.id desc
)
insert into public.admin_escalations
  (target_user_id, source, status, admin_id, action_note, created_at, updated_at)
select
  u.id, 'user_management', 'admin_banned', l.admin_id,
  'Imported from an existing User Management BAN audit log. ' || coalesce(l.details, ''),
  l.created_at, now()
from latest_status l
join public.user_profiles u on u.id = l.target_user_id
where u.is_banned is true
  and l.details like 'BANNED user:%'
  and not exists (
    select 1 from public.admin_escalations e
    left join public.repeat_offenders r on r.id = e.repeat_offender_id
    where e.status = 'admin_banned'
      and (e.target_user_id = u.id or r.user_id = u.id)
  );

-- Live INSERT/UPDATE on admin_escalations, in addition to existing user_profiles
-- publication. The RLS restrictions above MUST run before exposing new records.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_escalations'
  ) then
    alter publication supabase_realtime add table public.admin_escalations;
  end if;
  -- Admin Logs page already subscribes to admin_logs; enable its existing listener.
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_logs'
  ) then
    alter publication supabase_realtime add table public.admin_logs;
  end if;
end;
$$;

commit;

-- Verification (run separately after applying):
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='admin_escalations'
-- and column_name in ('target_user_id','source','action_note');
-- select * from pg_publication_tables where pubname='supabase_realtime' and tablename='admin_escalations';
-- select policyname,cmd from pg_policies where schemaname='public' and tablename='admin_escalations';
