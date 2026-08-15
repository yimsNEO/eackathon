# 🗄️ DB 스키마 (Database Schema)

Supabase(PostgreSQL) 기반, Supabase Auth와 연동된 실 로그인 구조로 설계했습니다.

## 1) profiles — 사용자 프로필
Supabase Auth 계정(auth.users)과 1:1로 연결되는 사용자 정보입니다.

| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| id | uuid (PK, FK → auth.users.id) | O | Supabase Auth 계정 ID와 동일 |
| name | text | O | 이름 |
| avatar_url | text | X | 프로필 이미지 URL |
| created_at | timestamptz | O | 생성일시 (기본값 now()) |

## 2) groups — 그룹

| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| id | uuid (PK) | O | 그룹 고유 ID |
| name | text | O | 그룹명 (예: 임원진) |
| created_by | uuid (FK → profiles.id) | X | 그룹 생성자 |
| created_at | timestamptz | O | 생성일시 |

## 3) group_members — 그룹 멤버십

| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| group_id | uuid (PK, FK → groups.id) | O | 그룹 ID |
| user_id | uuid (PK, FK → profiles.id) | O | 사용자 ID |
| position | text | X | 그룹 내 직책 (예: 회장, 총무) — 그룹마다 다를 수 있어 여기에 둠 |
| joined_at | timestamptz | O | 가입일시 |

## 4) meetings — 회의록

| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| id | uuid (PK) | O | 회의록 고유 ID |
| group_id | uuid (FK → groups.id) | O | 소속 그룹 |
| title | text | O | 회의 제목 |
| meeting_date | date | O | 회의 날짜 |
| raw_content | text | X | 사용자가 입력한 회의 원문(텍스트/음성 전사) |
| generated | boolean | O | AI 요약 완료 여부 (기본값 false) |
| created_by | uuid (FK → profiles.id) | X | 작성자 |
| created_at | timestamptz | O | 생성일시 |

## 5) meeting_attendees — 회의 참석자

| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| meeting_id | uuid (PK, FK → meetings.id) | O | 회의록 ID |
| user_id | uuid (PK, FK → profiles.id) | O | 참석자 ID |

## 6) agenda_items — 안건 (AI가 생성)

| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| id | uuid (PK) | O | 안건 고유 ID |
| meeting_id | uuid (FK → meetings.id) | O | 소속 회의록 |
| content | text | O | 안건 내용 |
| status | text | O | confirmed(확정) \| needs_opinion(의견 필요) |
| created_at | timestamptz | O | 생성일시 |

## 7) agenda_opinions — 불참자 의견
needs_opinion 상태인 안건에 실제 로그인 유저가 제출하는 의견입니다.

| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| id | uuid (PK) | O | 의견 고유 ID |
| agenda_item_id | uuid (FK → agenda_items.id) | O | 대상 안건 |
| user_id | uuid (FK → profiles.id) | O | 의견 작성자 |
| opinion | text | O | 의견 내용 |
| created_at | timestamptz | O | 작성일시 |

*제약조건: unique (agenda_item_id, user_id) — 한 사람당 한 안건에 의견은 하나만 제출할 수 있습니다.*

## 8) tasks — 할일

| 컬럼명 (Column) | 데이터 타입 (Type) | 필수 | 설명 (Description) |
| :--- | :--- | :---: | :--- |
| id | uuid (PK) | O | 할일 고유 ID |
| meeting_id | uuid (FK → meetings.id) | O | 파생된 회의록 |
| agenda_item_id | uuid (FK → agenda_items.id, nullable) | X | 관련 안건 (선택 연결) |
| assignee_id | uuid (FK → profiles.id) | X | 담당자 |
| text | text | O | 할일 내용 |
| done | boolean | O | 완료 여부 (기본값 false) |
| created_at | timestamptz | O | 생성일시 |

## 관계 요약 (ERD)
```text
auth.users 1 --- 1 profiles
groups 1 --- N group_members --- N profiles
groups 1 --- N meetings
meetings 1 --- N meeting_attendees --- N profiles
meetings 1 --- N agenda_items
agenda_items 1 --- N agenda_opinions --- N profiles
meetings 1 --- N tasks (선택적으로 agenda_item에도 연결)
```

## 참고: 이번 범위에서 제외한 테이블
*   **notifications (알림/알람)** — 푸시·이메일 인프라까지 구축하기엔 개발 기간이 짧아 이번 범위에서 제외. 추후 추가 예정.
*   **calendar_events (별도 캘린더 이벤트)** — 현재는 meetings.meeting_date만으로 캘린더 화면을 구성. 회의 외 별도 일정이 필요해지면 추가.

## SQL DDL (Supabase SQL Editor에 그대로 실행 가능)
```sql
-- 1. 사용자 프로필 (Supabase Auth 연동)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. 그룹
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 3. 그룹 멤버십 (직책은 그룹별로 다를 수 있어 여기 둠)
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  position text,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- 4. 회의록
create table meetings (
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
create table meeting_attendees (
  meeting_id uuid references meetings(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (meeting_id, user_id)
);

-- 6. 안건 (AI가 생성 — 확정 / 의견 필요 둘 중 하나)
create table agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  content text not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'needs_opinion')),
  created_at timestamptz default now()
);

-- 7. 불참자 의견 (needs_opinion 안건에 실제 로그인 유저가 의견 제출)
create table agenda_opinions (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid references agenda_items(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  opinion text not null,
  created_at timestamptz default now(),
  unique (agenda_item_id, user_id)
);

-- 8. 할일
create table tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  agenda_item_id uuid references agenda_items(id) on delete set null,
  assignee_id uuid references profiles(id),
  text text not null,
  done boolean default false,
  created_at timestamptz default now()
);
```
