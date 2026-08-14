# 🚀 백엔드 구현 가이드 (Backend Implementation Guide)

**작성일**: 2026-08-15  
**상태**: 프론트엔드 완료 → 백엔드 구현 필요  
**우선순위**: 높음

---

## 📋 목차

1. [개요](#개요)
2. [데이터베이스 스키마](#데이터베이스-스키마)
3. [API 엔드포인트](#api-엔드포인트)
4. [구현 순서](#구현-순서)
5. [체크리스트](#체크리스트)
6. [테스트 시나리오](#테스트-시나리오)

---

## 개요

프론트엔드(Next.js) 애플리케이션이 완성되었고, 다음 기능들이 구현되어 백엔드 API 연동을 기다리고 있습니다:

1. **사용자 관리**: 회원가입 시 이름, 이메일 저장
2. **그룹 관리**: 그룹 생성/조회/수정/삭제, 멤버 관리
3. **회의록**: 회의록 생성/조회/수정/삭제, AI 요약 생성 (OpenAI GPT-4o-mini)

모든 프론트엔드 API 요청에는 `Authorization: Bearer <JWT>` 헤더가 포함됩니다.

---

## 데이터베이스 스키마

### 1️⃣ 사용자 (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_users_email ON users(email);
```

### 2️⃣ 그룹 (groups)

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  admin_name VARCHAR(255),           -- ← 그룹 생성자의 이름
  admin_email VARCHAR(255),          -- ← 그룹 생성자의 이메일
  created_by UUID NOT NULL,          -- ← 그룹 생성자의 user_id
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_groups_created_by ON groups(created_by);
```

### 3️⃣ 그룹 멤버 (group_members)

```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member',  -- 'admin', 'member'
  position VARCHAR(255),              -- 직책
  name VARCHAR(255),                  -- users 테이블의 name 복사 (빠른 조회용)
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (group_id, user_id)
);

-- 인덱스
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
```

### 4️⃣ 회의록 (meetings)

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  meeting_date DATE NOT NULL,
  raw_content TEXT,                  -- 원문 (사용자 입력)
  generated BOOLEAN DEFAULT FALSE,   -- AI 요약 생성 여부
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_meetings_group_id ON meetings(group_id);
CREATE INDEX idx_meetings_meeting_date ON meetings(meeting_date);
```

### 5️⃣ 회의 참석자 (meeting_attendees)

```sql
CREATE TABLE meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (meeting_id, user_id)
);

-- 인덱스
CREATE INDEX idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
```

### 6️⃣ 안건 (agenda_items)

```sql
CREATE TABLE agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',  -- 'confirmed', 'needs_opinion'
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_agenda_items_meeting_id ON agenda_items(meeting_id);
```

### 7️⃣ 할일 (tasks)

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  assignee_id UUID,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 인덱스
CREATE INDEX idx_tasks_meeting_id ON tasks(meeting_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
```

---

## API 엔드포인트

모든 요청에 필수 헤더:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Phase 1: 사용자 관리

#### POST /api/users
회원가입 후 사용자 정보 저장 (프론트에서 Supabase 회원가입 후 호출)

**요청:**
```json
{
  "email": "hong@gmail.com",
  "name": "홍길동"
}
```

**응답 (201 Created):**
```json
{
  "id": "uuid",
  "email": "hong@gmail.com",
  "name": "홍길동",
  "created_at": "2026-08-15T10:00:00Z"
}
```

**오류 응답:**
- `400`: 이메일 또는 이름 누락
- `401`: 인증 실패
- `500`: 데이터베이스 오류

---

### Phase 2: 그룹 관리

#### GET /api/groups
사용자가 속한 모든 그룹 조회 (생성자 + 멤버)

**요청:**
```
GET /api/groups
Authorization: Bearer <JWT>
```

**응답 (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "임원진",
    "admin_name": "홍길동",
    "admin_email": "hong@gmail.com",
    "member_count": 7,
    "created_at": "2026-08-15T10:00:00Z"
  }
]
```

**⭐ 중요사항:**
- `group_members` 테이블에서 `user_id`가 일치하는 모든 그룹 반환
- 그룹 생성자가 아니어도 멤버면 표시되어야 함
- `member_count`: `group_members` 테이블의 해당 그룹 멤버 수

---

#### POST /api/groups
새 그룹 생성 (생성자가 자동으로 admin으로 등록)

**요청:**
```json
{
  "name": "마케팅팀",
  "admin_name": "홍길동"
}
```

**응답 (201 Created):**
```json
{
  "id": "uuid",
  "name": "마케팅팀",
  "admin_name": "홍길동",
  "admin_email": "hong@gmail.com",
  "created_at": "2026-08-15T10:00:00Z"
}
```

**백엔드 로직:**
1. JWT에서 `user_id` 추출
2. `users` 테이블에서 `admin_email` 조회
3. `groups` 테이블에 insert
4. **✨ 그룹 생성자를 `group_members`에 역할='admin'으로 자동 등록**

---

#### GET /api/groups/:groupId
그룹 상세 정보 + 멤버 목록 조회

**요청:**
```
GET /api/groups/:groupId
Authorization: Bearer <JWT>
```

**응답 (200 OK):**
```json
{
  "id": "uuid",
  "name": "임원진",
  "admin_name": "홍길동",
  "admin_email": "hong@gmail.com",
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "email": "hong@gmail.com",
      "name": "홍길동",
      "position": "회장",
      "role": "admin",
      "users": {
        "name": "홍길동",
        "email": "hong@gmail.com"
      }
    }
  ]
}
```

---

#### PATCH /api/groups/:groupId
그룹 이름 수정

**요청:**
```json
{
  "name": "수정된 그룹명"
}
```

**응답 (200 OK):**
```json
{
  "id": "uuid",
  "name": "수정된 그룹명"
}
```

---

#### DELETE /api/groups/:groupId
그룹 삭제

**응답:**
- `204 No Content` (성공)

---

#### POST /api/groups/:groupId/members
그룹에 멤버 추가 (⭐ 이메일로 사용자 조회)

**요청:**
```json
{
  "email": "park@gmail.com",
  "position": "부회장"
}
```

**응답 (201 Created):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "email": "park@gmail.com",
  "name": "박준영",
  "position": "부회장",
  "role": "member",
  "users": {
    "name": "박준영",
    "email": "park@gmail.com"
  }
}
```

**백엔드 로직:**
1. JWT에서 현재 `user_id` 추출
2. 그룹의 생성자 여부 확인 (권한 검증)
3. **✨ `users` 테이블에서 `email`로 사용자 조회**
4. 해당 사용자 없으면 404 반환
5. `group_members` 테이블에 insert
6. **✨ `name` 필드에는 `users` 테이블의 이름 저장**

**오류 응답:**
- `400`: 이메일 또는 직책 누락
- `403`: 권한 없음 (그룹 생성자 아님)
- `404`: 사용자 없음 (회원가입 필요)

---

#### DELETE /api/groups/:groupId/members/:userId
그룹에서 멤버 제거

**응답:**
- `204 No Content` (성공)

---

### Phase 3: 회의록 관리

#### GET /api/meetings
회의록 목록 조회 (선택: 그룹별 필터링)

**요청:**
```
GET /api/meetings?groupId=uuid (선택)
Authorization: Bearer <JWT>
```

**응답 (200 OK):**
```json
[
  {
    "id": "uuid",
    "title": "정기 임원진 회의",
    "meeting_date": "2026-08-15",
    "group_id": "uuid",
    "group_name": "임원진",
    "generated": false,
    "created_at": "2026-08-15T10:00:00Z"
  }
]
```

---

#### POST /api/meetings
새 회의록 생성

**요청:**
```json
{
  "group_id": "uuid",
  "title": "정기 임원진 회의",
  "meeting_date": "2026-08-15"
}
```

**응답 (201 Created):**
```json
{
  "id": "uuid",
  "title": "정기 임원진 회의",
  "meeting_date": "2026-08-15",
  "group_id": "uuid",
  "raw_content": null,
  "generated": false,
  "created_at": "2026-08-15T10:00:00Z"
}
```

---

#### GET /api/meetings/:meetingId
회의록 상세 조회 (참석자, 안건, 할일 포함)

**요청:**
```
GET /api/meetings/:meetingId
Authorization: Bearer <JWT>
```

**응답 (200 OK):**
```json
{
  "id": "uuid",
  "title": "정기 임원진 회의",
  "meeting_date": "2026-08-15",
  "raw_content": "회의 내용...",
  "generated": true,
  "meeting_attendees": [
    {
      "user_id": "uuid",
      "users": { "name": "김도윤", "email": "kim@example.com" }
    }
  ],
  "agenda_items": [
    {
      "id": "uuid",
      "content": "예산안 초안 승인",
      "status": "confirmed"
    }
  ],
  "tasks": [
    {
      "id": "uuid",
      "title": "장소 예약 확정하기",
      "assignee_id": "uuid",
      "due_date": "2026-08-20",
      "status": "pending"
    }
  ]
}
```

---

#### PATCH /api/meetings/:meetingId
회의 원문 수정

**요청:**
```json
{
  "raw_content": "수정된 회의 내용..."
}
```

**응답 (200 OK):**
```json
{
  "id": "uuid",
  "raw_content": "수정된 회의 내용..."
}
```

---

#### POST /api/meetings/:meetingId/generate
⭐ **AI 요약 생성 (OpenAI GPT-4o-mini 호출)**

**요청:**
```
POST /api/meetings/:meetingId/generate
Authorization: Bearer <JWT>
Body: 없음 (이미 저장된 raw_content 사용)
```

**응답 (200 OK):**
```json
{
  "meeting_id": "uuid",
  "generated": true,
  "agenda_items": [
    {
      "id": "uuid",
      "content": "예산안 초안 승인",
      "status": "confirmed"
    }
  ],
  "tasks": [
    {
      "id": "uuid",
      "title": "장소 예약 확정하기",
      "assignee_id": null,
      "due_date": "2026-08-20",
      "status": "pending"
    }
  ]
}
```

**백엔드 로직:**
1. `meetings` 테이블에서 `raw_content` 조회
2. `raw_content`가 비어있으면 400 반환
3. **✨ OpenAI API 호출:**
   ```javascript
   const prompt = `다음은 회의록입니다. 확정 안건, 의견 필요 안건, 할 일을 JSON 형식으로 분류해주세요.
   
   회의록:
   ${raw_content}
   
   다음 JSON 형식으로 응답하세요:
   {
     "agenda_items": [
       { "content": "안건 내용", "status": "confirmed" 또는 "needs_opinion" }
     ],
     "tasks": [
       { "title": "할일 내용", "due_date": "YYYY-MM-DD" }
     ]
   }`;
   ```
4. 응답 파싱하여 `agenda_items`, `tasks` 테이블에 저장
5. `meetings.generated = true` 업데이트

**오류 응답:**
- `400`: raw_content 비어있음
- `404`: 회의록 없음
- `500`: LLM 호출 실패 (재시도 메시지 포함)

---

#### DELETE /api/meetings/:meetingId
회의록 삭제

**응답:**
- `204 No Content` (성공)

---

## 구현 순서

### 1단계: 기초 인프라 (1-2일)
- [ ] 데이터베이스 테이블 생성 (1-7번)
- [ ] Supabase 연결 확인
- [ ] 환경변수 설정 (.env)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`

### 2단계: 사용자 관리 (1일)
- [ ] POST /api/users 구현
- [ ] users 테이블에 데이터 저장
- [ ] 로그 확인

### 3단계: 그룹 관리 (2일)
- [ ] POST /api/groups 구현 (✨ 그룹 생성자 자동 등록)
- [ ] GET /api/groups 구현 (✨ 멤버인 그룹 모두 반환)
- [ ] GET /api/groups/:id 구현
- [ ] PATCH /api/groups/:id 구현
- [ ] DELETE /api/groups/:id 구현
- [ ] POST /api/groups/:id/members 구현 (✨ 이메일로 조회)
- [ ] DELETE /api/groups/:id/members/:userId 구현

### 4단계: 회의록 관리 (2-3일)
- [ ] POST /api/meetings 구현
- [ ] GET /api/meetings 구현
- [ ] GET /api/meetings/:id 구현
- [ ] PATCH /api/meetings/:id 구현
- [ ] DELETE /api/meetings/:id 구현
- [ ] POST /api/meetings/:id/generate 구현 (✨ OpenAI 호출)

### 5단계: 테스트 (1일)
- [ ] 각 API 엔드포인트 테스트
- [ ] 프론트 연동 테스트
- [ ] 오류 처리 테스트

---

## 체크리스트

### 데이터베이스
- [ ] users 테이블 생성
- [ ] groups 테이블 생성 (admin_name, admin_email 포함)
- [ ] group_members 테이블 생성
- [ ] meetings 테이블 생성
- [ ] meeting_attendees 테이블 생성
- [ ] agenda_items 테이블 생성
- [ ] tasks 테이블 생성
- [ ] 모든 인덱스 생성

### 사용자 API
- [ ] POST /api/users 구현
- [ ] users 테이블에 이메일, 이름 저장
- [ ] Supabase JWT 검증

### 그룹 API
- [ ] GET /api/groups (멤버인 그룹 모두 반환) ⭐
- [ ] POST /api/groups (admin_name 저장) ⭐
- [ ] 그룹 생성 시 group_members에 생성자 등록 ⭐
- [ ] GET /api/groups/:id
- [ ] PATCH /api/groups/:id
- [ ] DELETE /api/groups/:id
- [ ] POST /api/groups/:id/members (이메일 조회) ⭐
- [ ] DELETE /api/groups/:id/members/:userId
- [ ] member_count 계산 정확성 확인 ⭐

### 회의록 API
- [ ] POST /api/meetings
- [ ] GET /api/meetings
- [ ] GET /api/meetings/:id (참석자, 안건, 할일 포함)
- [ ] PATCH /api/meetings/:id
- [ ] DELETE /api/meetings/:id
- [ ] POST /api/meetings/:id/generate (OpenAI) ⭐
- [ ] 프롬프트 튜닝

### 테스트
- [ ] 회원가입 → users 테이블 확인
- [ ] 그룹 생성 → group_members에 admin 자동 등록 확인
- [ ] 멤버로 로그인 → 그룹 보이는지 확인 (0명이 아닌지 확인) ⭐
- [ ] 멤버 추가 → 이메일로 조회 후 저장 확인
- [ ] 회의록 생성 → 제목, 날짜, 그룹 저장 확인
- [ ] 회의 원문 입력 → raw_content 저장 확인
- [ ] AI 요약 생성 → OpenAI API 호출 확인
- [ ] 안건, 할일 저장 확인

---

## 테스트 시나리오

### 시나리오 1: 회원가입 및 그룹 생성

```
1. 서재욱 회원가입
   - Supabase: 이메일 + 비밀번호 + 이름 (메타데이터)
   - 백엔드: POST /api/users (이메일, 이름) → users 테이블 저장

2. 서재욱 로그인
   - JWT 토큰 발급

3. 그룹 생성
   - POST /api/groups (name: "임원진", admin_name: "서재욱")
   - ✨ 확인사항:
     - groups 테이블: admin_name = "서재욱", created_by = 서재욱 user_id
     - group_members 테이블: 서재욱이 role='admin'으로 자동 등록
```

### 시나리오 2: 멤버 추가 및 로그인

```
1. 박준영 회원가입
   - users 테이블: email="park@...", name="박준영"

2. 서재욱이 박준영을 그룹에 추가
   - POST /api/groups/:id/members (email: "park@...", position: "부회장")
   - ✨ 확인사항:
     - users 테이블에서 email="park@..."로 조회
     - group_members 테이블에 park user_id 저장
     - name 필드에 "박준영" 저장

3. 박준영 로그인
   - GET /api/groups
   - ✨ 확인사항:
     - "임원진" 그룹이 보여야 함 (멤버이므로)
     - member_count > 0 이어야 함 ⭐
     - "서재욱 👑 / 회장" 보여야 함

4. 박준영이 그룹 클릭
   - GET /api/groups/:id
   - ✨ 확인사항:
     - 멤버 목록에 "박준영 / 부회장" 보여야 함
     - admin_name = "서재욱" 보여야 함
```

### 시나리오 3: 회의록 작성 및 AI 요약

```
1. 서재욱이 회의록 생성
   - POST /api/meetings (title: "정기회의", meeting_date: "2026-08-15")

2. 회의 원문 입력
   - PATCH /api/meetings/:id (raw_content: "...")

3. AI 요약 생성
   - POST /api/meetings/:id/generate
   - ✨ 로직:
     - OpenAI API 호출
     - 응답: {"agenda_items": [...], "tasks": [...]}
     - agenda_items 테이블에 저장
     - tasks 테이블에 저장
     - meetings.generated = true 업데이트

4. 결과 확인
   - GET /api/meetings/:id
   - ✨ 확인사항:
     - generated = true
     - agenda_items 배열에 데이터
     - tasks 배열에 데이터
```

---

## 중요 주의사항 ⭐

1. **JWT 검증**: 모든 요청에서 Bearer 토큰 검증
2. **권한 확인**: 그룹 생성자만 멤버 추가/삭제 가능
3. **이메일 조회**: POST /api/groups/:id/members에서 **반드시 users 테이블에서 이메일로 조회**
4. **member_count**: GET /api/groups에서 정확한 멤버 수 반환 필수
5. **admin_name 저장**: POST /api/groups에서 현재 사용자의 이름을 admin_name으로 저장
6. **생성자 등록**: 그룹 생성 시 생성자를 group_members에 자동 등록 (role='admin')
7. **OpenAI 에러**: LLM 호출 실패 시 재시도 로직 포함

---

## 환경변수 예시

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# Server
PORT=4000
NODE_ENV=development
```

---

## 참고 파일

- [API 명세서](./API_SPEC.md) - 전체 API 상세 명세
- [BACKEND_ADMIN_SETUP.md](./BACKEND_ADMIN_SETUP.md) - 추가 구현 가이드

---

**최종 목표**: 프론트엔드와 백엔드가 완벽하게 연동되어 회의록 관리 시스템이 정상 작동하는 상태

**완료되면**: 테스트 환경에서 엔드-투-엔드 테스트 진행 후 배포
