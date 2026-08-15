-- Eackathon Database Schema (Supabase PostgreSQL)
-- Run this script in Supabase SQL Editor

-- 1. 사용자 프로필 (Supabase Auth 연동)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. 그룹
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 3. 그룹 멤버십 (직책은 그룹별로 다를 수 있어 여기 둠)
create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  position text,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- 4. 회의록
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  title text not null,
  meeting_date date not null,
  raw_content text,
  generated boolean default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 5. 회의 참석자
create table if not exists meeting_attendees (
  meeting_id uuid references meetings(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (meeting_id, user_id)
);

-- 6. 안건 (AI가 생성 — 확정 / 의견 필요 둘 중 하나)
create table if not exists agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  content text not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'needs_opinion')),
  created_at timestamptz default now()
);

-- 7. 불참자 의견 (needs_opinion 안건에 실제 로그인 유저가 의견 제출)
create table if not exists agenda_opinions (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid references agenda_items(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  opinion text,
  created_at timestamptz default now(),
  unique (agenda_item_id, user_id)
);

-- 8. 할일
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  agenda_item_id uuid references agenda_items(id) on delete set null,
  assignee_id uuid references profiles(id),
  text text not null,
  done boolean default false,
  created_at timestamptz default now()
);

-- Indexes for better query performance
create index if not exists idx_group_members_user_id on group_members(user_id);
create index if not exists idx_meetings_group_id on meetings(group_id);
create index if not exists idx_meetings_created_by on meetings(created_by);
create index if not exists idx_meeting_attendees_user_id on meeting_attendees(user_id);
create index if not exists idx_agenda_items_meeting_id on agenda_items(meeting_id);
create index if not exists idx_agenda_opinions_user_id on agenda_opinions(user_id);
create index if not exists idx_tasks_assignee_id on tasks(assignee_id);
create index if not exists idx_tasks_meeting_id on tasks(meeting_id);

-- Enable RLS (Row Level Security) - Optional but recommended for Supabase
alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table meetings enable row level security;
alter table meeting_attendees enable row level security;
alter table agenda_items enable row level security;
alter table agenda_opinions enable row level security;
alter table tasks enable row level security;

-- Meeting-management permissions for every group member
-- Allow every member of a meeting's group to manage meeting-related data.
-- Run this once in the Supabase SQL Editor for existing databases.

CREATE POLICY "Group members can update meetings"
  ON meetings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = meetings.group_id AND group_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = meetings.group_id AND group_members.user_id = auth.uid()));

CREATE POLICY "Group members can delete meetings"
  ON meetings FOR DELETE
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = meetings.group_id AND group_members.user_id = auth.uid()));

CREATE POLICY "Group members can manage attendees"
  ON meeting_attendees FOR ALL
  USING (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = meeting_attendees.meeting_id AND group_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = meeting_attendees.meeting_id AND group_members.user_id = auth.uid()));

CREATE POLICY "Group members can manage agenda items"
  ON agenda_items FOR ALL
  USING (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = agenda_items.meeting_id AND group_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = agenda_items.meeting_id AND group_members.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update tasks assigned to them or in their groups" ON tasks;
CREATE POLICY "Group members can manage tasks"
  ON tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = tasks.meeting_id AND group_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = tasks.meeting_id AND group_members.user_id = auth.uid()));
