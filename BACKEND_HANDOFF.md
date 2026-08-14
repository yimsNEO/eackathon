# Backend Handoff Guide

## ✅ 최신 상황 (2026-08-14)

### 프론트엔드 완성! 🎉
프론트엔드는 **모든 UI와 API 연동이 완성**되었습니다.

#### 완성된 사항:
- ✅ 모든 UI 컴포넌트 구현 완료
- ✅ API 연동 준비 완료 (buildApiUrl 함수로 백엔드 주소 추상화)
- ✅ 로딩 상태 관리 (AI 요약 생성 중 스피너 표시)
- ✅ 에러 처리 (401/403 응답 시 자동 로그아웃)
- ✅ 데이터 필드명 통일 (snake_case)
- ✅ 빌드 성공: `npm run build` ✓

#### 완성된 프론트 구성요소:
1. **MinutesListView** - 회의록 목록
2. **MinutesDetailView** - 회의록 상세, AI 요약 생성 UI
3. **GroupListView** - 그룹 목록
4. **GroupDetailView** - 그룹 상세, 멤버 표시
5. **MyTodoView** - 진행/완료 할 일 분리 표시
6. **CalendarTab** - 캘린더 뷰

#### 프론트엔드 환경설정:
```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000  # 백엔드 연동 시작점
```

**이제 백엔드를 구현하면 됩니다. 프론트는 모든 준비가 끝났습니다!**

---

## 1️⃣ 지금 바로 해야 할 일 (백엔드 팀)

### 작업 개요
- 장소: **다른 PC**에서 독립적인 Node.js 서버 구축
- 포트: **4000** (프론트가 http://localhost:4000 기준)
- 역할: DB 조회, 인증 검증, OpenAI 호출

### 즉시 시작할 사항
1. 새로운 Node.js 프로젝트 생성 (다른 폴더)
2. 아래 API 엔드포인트 구현
3. Supabase 연결 (service role key 필요)
4. OpenAI 연결
5. 로컬 테스트 후 프론트와 연동

---

## 2️⃣ 백엔드 서버 구조 추천

### 프로젝트 디렉토리 구조
```
backend/
├── src/
│   ├── routes/
│   │   ├── groups.js          # GET/POST /api/groups
│   │   ├── meetings.js        # GET/POST /api/meetings
│   │   ├── meetingDetail.js   # GET/PATCH/DELETE /api/meetings/:id
│   │   └── generateSummary.js # POST /api/meetings/:id/generate
│   ├── middleware/
│   │   ├── auth.js            # 토큰 검증
│   │   └── errorHandler.js    # 에러 응답 표준화
│   ├── services/
│   │   ├── supabaseService.js # DB 쿼리 래퍼
│   │   └── aiSummaryService.js # OpenAI 호출
│   └── server.js              # Express 메인
├── .env                        # 서버 비밀값
├── .env.example
├── package.json
└── README.md

### 필수 패키지
```bash
npm install express @supabase/supabase-js openai dotenv cors
```

### 추천 기술스택
- Express.js (프레임워크)
- @supabase/supabase-js (DB 클라이언트)
- openai (ChatGPT API)
- dotenv (환경변수)
- cors (크로스도메인 허용)

---

## 3️⃣ 필수 환경변수

### 백엔드 서버 .env (비밀값 - 절대 공개하지 마세요)
```env
# Supabase (service role - 서버에서만 사용)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI API
OPENAI_API_KEY=sk-your-key-here

# 서버 포트
PORT=4000

# CORS 설정
FRONTEND_URL=http://localhost:3000
```

### 프론트엔드 .env.local (공개 가능 - NEXT_PUBLIC_ 접두사)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### ⚠️ 중요 보안 규칙
- **SUPABASE_SERVICE_ROLE_KEY**: 서버에서만 사용, 절대 클라이언트로 보내지 않기
- **OPENAI_API_KEY**: 서버에서만 사용, 프론트엔드에 두면 안 됨
- **NEXT_PUBLIC_** 변수: 브라우저에 노출되므로 공개값만 사용

---

## 4️⃣ 백엔드 API 스펙 (필수 구현)

### 📋 인증 공통 요소
모든 API 요청에 다음 헤더 필요:
```
Authorization: Bearer <JWT_TOKEN>
```
- 프론트에서 Supabase 로그인 후 JWT 토큰 획득
- 백엔드에서 `supabase.auth.getUser(token)` 호출로 검증
- 토큰 없거나 유효하지 않으면 **401 반환**

---

### 1️⃣ 그룹 API

#### GET /api/groups
**현재 사용자가 속한 그룹 목록 조회**

```
Header: Authorization: Bearer <token>
Response 200:
[
  {
    id: "uuid",
    name: "마케팅팀",
    created_at: "2026-08-14T10:00:00Z",
    members: [
      { id: "uuid", user_id: "uuid", users: { name: "홍길동", email: "hong@example.com" }, role: "admin" },
      { id: "uuid", user_id: "uuid", users: { name: "김영희", email: "kim@example.com" }, role: "member" }
    ]
  }
]
```

#### POST /api/groups
**새 그룹 생성**

```
Header: Authorization: Bearer <token>
Body: { name: "새 그룹" }
Response 201:
{
  id: "uuid",
  name: "새 그룹",
  created_at: "2026-08-14T10:00:00Z",
  members: [ /* 생성자가 자동 등록됨 */ ]
}
```

---

### 2️⃣ 회의록 목록 API

#### GET /api/meetings
**회의록 목록 조회 (그룹 멤버인 회의만)**

```
Header: Authorization: Bearer <token>
Query: ?group_id=uuid (선택사항)
Response 200:
[
  {
    id: "uuid",
    title: "정기회의",
    meeting_date: "2026-08-14",
    group_id: "uuid",
    generated: false,
    raw_content: null
  }
]
```

#### POST /api/meetings
**새 회의록 생성**

```
Header: Authorization: Bearer <token>
Body: { 
  group_id: "uuid", 
  title: "새 회의", 
  meeting_date: "2026-08-14" 
}
Response 201:
{
  id: "uuid",
  title: "새 회의",
  meeting_date: "2026-08-14",
  group_id: "uuid",
  generated: false,
  raw_content: null
}
```

---

### 3️⃣ 회의록 상세 API

#### GET /api/meetings/:meetingId
**회의록 상세 + 안건 + 할 일 + 참석자 조회**

```
Header: Authorization: Bearer <token>
Response 200:
{
  id: "uuid",
  title: "정기회의",
  meeting_date: "2026-08-14",
  group_id: "uuid",
  raw_content: "회의 원문...",
  generated: true,
  meeting_attendees: [
    { 
      id: "uuid", 
      user_id: "uuid", 
      users: { name: "홍길동", email: "hong@example.com" } 
    }
  ],
  agenda_items: [
    { id: "uuid", title: "안건 1", content: "내용..." }
  ],
  tasks: [
    { 
      id: "uuid", 
      title: "할 일 1", 
      status: "pending",
      due_date: "2026-08-21"
    }
  ]
}
```

#### PATCH /api/meetings/:meetingId
**회의 원문 저장**

```
Header: Authorization: Bearer <token>
Body: { raw_content: "회의 원문..." }
Response 200:
{ id: "uuid", raw_content: "회의 원문...", ... }
```

#### DELETE /api/meetings/:meetingId
**회의록 삭제**

```
Header: Authorization: Bearer <token>
Response 204: (No Content)
```

---

### 4️⃣ AI 요약 생성 API ⭐ (핵심)

#### POST /api/meetings/:meetingId/generate
**OpenAI로 회의 요약 생성 → agenda_items, tasks 저장**

```
Header: Authorization: Bearer <token>
Response 200 (완료):
{
  id: "uuid",
  title: "정기회의",
  generated: true,
  agenda_items: [
    { id: "uuid", title: "마케팅 전략", content: "Q3 캠페인..." },
    { id: "uuid", title: "예산 논의", content: "..총 500만원" }
  ],
  tasks: [
    { id: "uuid", title: "마케팅 자료 준비", status: "pending", due_date: "2026-08-21", assigned_to: "uuid" },
    { id: "uuid", title: "예산 계획서 작성", status: "pending", due_date: "2026-08-21", assigned_to: "uuid" }
  ]
}
```

**에러 응답 (5초 이상 대기):**
```
Response 500: { error: { message: "OpenAI 호출 실패" } }
```

---

### 5️⃣ 에러 응답 형식 (모든 API 공통)

#### 401 Unauthorized (토큰 없음/만료)
```json
{ 
  "error": { 
    "code": "UNAUTHORIZED", 
    "message": "인증 토큰이 없습니다." 
  } 
}
```

#### 403 Forbidden (권한 없음)
```json
{ 
  "error": { 
    "code": "FORBIDDEN", 
    "message": "이 그룹에 접근할 권한이 없습니다." 
  } 
}
```

#### 404 Not Found
```json
{ 
  "error": { 
    "code": "NOT_FOUND", 
    "message": "해당 회의록이 없습니다." 
  } 
}
```

#### 500 Internal Server Error
```json
{ 
  "error": { 
    "code": "SERVER_ERROR", 
    "message": "서버 오류가 발생했습니다." 
  } 
}
```

---

## 5️⃣ 필수 보안 검증 로직

### 🔐 인증 (Authentication)
모든 API에서:
1. Authorization 헤더 확인
2. Bearer 토큰 추출
3. `supabase.auth.getUser(token)` 호출
4. 토큰 유효하지 않으면 **401 반환**

```javascript
// 예시 코드
const token = req.headers.authorization?.split(' ')[1];
if (!token) return res.status(401).json({ error: { message: "토큰 없음" } });

try {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: { message: "유효하지 않은 토큰" } });
  const userId = data.user.id;
} catch (err) {
  return res.status(401).json({ error: { message: "인증 실패" } });
}
```

### 🛡️ 권한 (Authorization)
그룹/회의 조회 시:
1. `group_members` 테이블에서 `user_id` 확인
2. 그룹 멤버가 아니면 **403 또는 404 반환**

회의 수정/삭제 시:
1. 소유자(그룹의 admin)인지 확인
2. 권한 없으면 **403 반환**

### ⚠️ API 요청 시간 제한
- AI 요약 생성: 5~10초 소요 (OpenAI API 호출)
- 프론트에서 스피너 표시 중
- 타임아웃 발생 시 에러 응답

---

## 6️⃣ CORS 설정 (크로스도메인 허용)

프론트(localhost:3000)가 백엔드(localhost:4000)에 요청하므로 CORS 설정 필수:

```javascript
// Express 예시
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 7️⃣ 백엔드 구현 체크리스트

구현 순서대로 체크하세요:

### Phase 1: 기본 설정
- [ ] Node.js 프로젝트 생성 (다른 PC)
- [ ] Express 서버 설정 (PORT 4000)
- [ ] CORS 설정 (localhost:3000 허용)
- [ ] 환경변수 (.env) 설정

### Phase 2: 인증 미들웨어
- [ ] Bearer 토큰 검증 함수 구현
- [ ] `supabase.auth.getUser(token)` 통합
- [ ] 401 응답 처리
- [ ] 에러 미들웨어 설정

### Phase 3: 그룹 API
- [ ] GET /api/groups (사용자 그룹 목록)
- [ ] POST /api/groups (그룹 생성, 생성자 자동 등록)
- [ ] 권한 검증 (그룹 멤버 확인)

### Phase 4: 회의록 기본 API
- [ ] GET /api/meetings (회의록 목록)
- [ ] POST /api/meetings (회의록 생성)
- [ ] GET /api/meetings/:meetingId (상세 조회)
- [ ] PATCH /api/meetings/:meetingId (원문 저장)
- [ ] DELETE /api/meetings/:meetingId (삭제)

### Phase 5: 관계 테이블 (agenda, tasks, attendees)
- [ ] meeting_attendees 조회 (참석자 목록)
- [ ] agenda_items 조회 (안건)
- [ ] tasks 조회 (할 일)
- [ ] 조인된 user 정보 포함

### Phase 6: AI 요약 생성 (핵심!)
- [ ] OpenAI 라이브러리 연결
- [ ] 회의 원문 → GPT-4o-mini 호출
- [ ] agenda_items 파싱 및 저장
- [ ] tasks 파싱 및 저장
- [ ] meetings.generated = true 업데이트
- [ ] 5~10초 대기 시간 고려

### Phase 7: 테스트
- [ ] Postman/curl로 각 API 테스트
- [ ] 토큰 없이 요청 → 401 확인
- [ ] 다른 그룹 접근 → 403/404 확인
- [ ] AI 요약 생성 완료 확인

---

## 8️⃣ 백엔드 서버 로컬 테스트 (Postman/curl)

### 그룹 조회 테스트
```bash
curl -X GET http://localhost:4000/api/groups \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 회의 요약 생성 테스트
```bash
curl -X POST http://localhost:4000/api/meetings/[ID]/generate \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

응답 대기 시간: **5~10초** (OpenAI API 호출)

---

## 9️⃣ 백엔드 구현 핵심 팁

### OpenAI 프롬프트 예시
```javascript
const prompt = `
다음 회의 내용을 분석하고 안건과 할 일을 JSON으로 반환해주세요:

${rawContent}

반환 형식:
{
  "agenda_items": [
    { "title": "안건 제목", "content": "상세 내용" }
  ],
  "tasks": [
    { "title": "할 일 제목", "due_date": "YYYY-MM-DD", "assigned_to": "사용자명" }
  ]
}
`;
```

### Supabase 쿼리 예시 (그룹 조회)
```javascript
const { data, error } = await supabase
  .from('groups')
  .select(`
    id, name, created_at,
    members:group_members(
      id, user_id, role,
      users(name, email)
    )
  `)
  .eq('members.user_id', userId);
```

### Supabase 쿼리 예시 (회의 상세)
```javascript
const { data, error } = await supabase
  .from('meetings')
  .select(`
    *,
    attendees:meeting_attendees(
      id, user_id,
      users(name, email)
    ),
    agenda_items(*),
    tasks(*)
  `)
  .eq('id', meetingId)
  .single();
```

---

## 🔟 최종 실행 계획

### 1단계: 준비 (1~2시간)
- [ ] 다른 PC에서 백엔드 폴더 생성
- [ ] package.json 작성 및 의존성 설치
- [ ] Express 기본 서버 구동 (PORT 4000)
- [ ] Supabase 연결 테스트

### 2단계: API 구현 (4~6시간)
- [ ] 인증 미들웨어 구현
- [ ] 그룹/회의 API 구현
- [ ] 데이터베이스 쿼리 작성
- [ ] 에러 처리 표준화

### 3단계: AI 통합 (2~3시간)
- [ ] OpenAI API 통합
- [ ] 프롬프트 튜닝
- [ ] agenda_items, tasks 저장 로직
- [ ] generated 플래그 업데이트

### 4단계: 테스트 (2시간)
- [ ] 각 API 엔드포인트 테스트 (Postman/curl)
- [ ] 권한 검증 테스트
- [ ] 예외 상황 테스트
- [ ] OpenAI 응답 형식 검증

### 5단계: 프론트 연동 (1시간)
- [ ] 프론트 .env 업데이트 (NEXT_PUBLIC_API_BASE_URL)
- [ ] 프론트 `npm run dev` 실행
- [ ] 백엔드 `npm run dev` 실행 (다른 PC)
- [ ] 통합 테스트

**예상 총 소요시간: 10~14시간**

---

## 1️⃣1️⃣ 통합 테스트 체크리스트 (프론트 ↔ 백엔드)

이 단계는 **둘 다 준비 완료 후**에 진행합니다:

- [ ] 프론트에서 로그인 성공
- [ ] 그룹 목록 조회 성공
- [ ] 그룹 생성 성공
- [ ] 회의록 목록 조회 성공
- [ ] 회의록 생성 성공
- [ ] 회의록 상세 조회 성공
- [ ] 회의 원문 입력 후 저장 성공
- [ ] **AI 요약 생성 버튼 클릭 → 5~10초 스피너 표시 → 완료**
- [ ] 안건 목록 표시 확인
- [ ] 할 일 목록 표시 확인
- [ ] 할 일 완료/미완료 상태 표시 확인
- [ ] 토큰 만료 시 자동 로그아웃 확인
- [ ] 권한 없는 회의 접근 시 에러 표시 확인

---

## 🎯 결론 및 다음 단계

### ✅ 현재 상태
- **프론트엔드**: 100% 완성, localhost:3000에서 실행 가능
- **백엔드**: 대기 중, localhost:4000에서 구동 필요

### 📋 백엔드 팀이 해야 할 것
이 **BACKEND_HANDOFF.md** 문서를 기준으로:
1. 독립적인 Node.js 서버 프로젝트 생성
2. 위의 API 스펙 정확히 구현
3. Supabase + OpenAI 연결
4. 보안 검증 (인증/권한) 구현
5. 로컬 테스트 후 결과 보고

### 📞 커뮤니케이션
- API 응답 형식 질문 → 이 문서 참고
- 데이터베이스 스키마 질문 → Supabase 대시보드 확인
- 프론트 동작 방식 질문 → app/page.tsx 검토

**백엔드가 localhost:4000에서 구동되면, 프론트는 자동으로 연동됩니다!** 🚀
