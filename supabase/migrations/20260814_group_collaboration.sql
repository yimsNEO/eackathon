-- Run this file in the Supabase SQL Editor before using member invitations.
-- Every user who logs in gets a profile containing their email address.

alter table public.profiles add column if not exists email text;
create unique index if not exists profiles_email_key on public.profiles (lower(email));

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where profile.id = auth_user.id and profile.email is null;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email
    where public.profiles.email is null;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create unique index if not exists group_members_group_user_key
  on public.group_members (group_id, user_id);

-- Only the person who created a group can invite or remove members.
create or replace function public.add_group_member_by_email(
  p_group_id uuid,
  p_email text,
  p_position text default '팀원'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not exists (
    select 1 from public.groups
    where id = p_group_id and created_by = auth.uid()
  ) then
    raise exception '권한이 없습니다.';
  end if;

  select id into v_user_id
  from public.profiles
  where lower(email) = lower(trim(p_email));

  if v_user_id is null then
    raise exception '사용자를 찾을 수 없습니다.';
  end if;

  insert into public.group_members (group_id, user_id, position)
  values (p_group_id, v_user_id, coalesce(nullif(trim(p_position), ''), '팀원'))
  on conflict (group_id, user_id) do update set position = excluded.position;

  return jsonb_build_object('userId', v_user_id, 'email', lower(trim(p_email)));
end;
$$;

create or replace function public.remove_group_member(
  p_group_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id = auth.uid() then
    raise exception '그룹 생성자는 자신을 제거할 수 없습니다.';
  end if;

  if not exists (
    select 1 from public.groups
    where id = p_group_id and created_by = auth.uid()
  ) then
    raise exception '권한이 없습니다.';
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.add_group_member_by_email(uuid, text, text) from public;
revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.add_group_member_by_email(uuid, text, text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

-- RLS permissions needed by the group detail screen and owner controls.
alter table public.profiles enable row level security;

drop policy if exists "Group members can read each other's profiles" on public.profiles;
create policy "Group members can read each other's profiles"
on public.profiles for select to authenticated
using (
  id = auth.uid() or exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);

drop policy if exists "Group owners can update groups" on public.groups;
create policy "Group owners can update groups"
on public.groups for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "Group owners can delete groups" on public.groups;
create policy "Group owners can delete groups"
on public.groups for delete to authenticated
using (created_by = auth.uid());
