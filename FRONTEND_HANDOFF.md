# 프론트엔드 핸드오프 가이드

> 백엔드에서 완료한 작업을 정리한 가이드입니다.
> 프론트엔드 팀은 이 문서를 기준으로 진행하세요.

---

## 1. 백엔드 구현 현황

### ✅ 완료된 작업

#### 1-1. 서버 세팅
- ✅ Node.js + Express 서버 구축
- ✅ Supabase 클라이언트 설정
- ✅ OpenAI API 연동
- ✅ CORS 설정 완료
- ✅ 환경변수 관리 (.env)
- ✅ 에러 처리 표준화

#### 1-2. API 엔드포인트 구현
- ✅ 모든 라우트 구현 완료
- ✅ 인증/권한 검증 로직 완료
- ✅ AI 요약 생성 로직 완료
- ✅ 데이터베이스 쿼리 최적화

#### 1-3. 보안
- ✅ Bearer 토큰 기반 인증
- ✅ Supabase JWT 검증
- ✅ 그룹 멤버 권한 검증
- ✅ 모든 데이터 접근 권한 확인

---

## 2. API 스펙

### 2-1. 기본 정보
- **베이스 URL**: `http://localhost:4000` (개발 환경)
- **모든 엔드포인트**: `/api/*` 경로
- **응답 형식**: JSON
- **포트**: 4000번

### 2-2. 인증
모든 인증이 필요한 요청 헤더:
```
Authorization: Bearer <supabase_jwt_token>
```

---

## 3. 그룹 API

### GET /api/groups
**현재 로그인한 사용자가 속한 그룹 목록**

```bash
curl -X GET http://localhost:4000/api/groups \
  -H "Authorization: Bearer JWT_TOKEN"
```

**응답 예시:**
```json
[
  {
    "id": "uuid",
    "name": "팀 A",
    "created_by": "user_uuid",
    "created_at": "2026-08-14T00:00:00Z",
    "role": "admin"
  }
]
```

**상태 코드:**
- 200: 성공
- 401: 인증 토큰 없음
- 500: 서버 오류

---

### POST /api/groups
**새 그룹 생성**

```bash
curl -X POST http://localhost:4000/api/groups \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "팀 B"
  }'
```

**요청 바디:**
- `name` (string, required): 그룹 이름

**응답 예시:**
```json
{
  "id": "uuid",
  "name": "팀 B",
  "created_by": "user_uuid",
  "created_at": "2026-08-14T00:00:00Z"
}
```

**자동 처리:**
- 생성자가 자동으로 `admin` 역할로 group_members에 등록됨

---

### POST /api/groups/:id/members
**그룹에 멤버 추가**

```bash
curl -X POST http://localhost:4000/api/groups/GROUP_ID/members \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_UUID",
    "role": "member"
  }'
```

**요청 바디:**
- `user_id` (string, required): 추가할 사용자 ID
- `role` (string, optional): "admin" 또는 "member" (기본값: "member")

**권한 검증:**
- 요청자가 해당 그룹의 `admin`이어야 함
- admin이 아니면 403 반환

---

## 4. 회의록 API

### GET /api/meetings
**회의록 목록 조회**

```bash
curl -X GET "http://localhost:4000/api/meetings?group_id=GROUP_ID" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**쿼리 파라미터:**
- `group_id` (optional): 특정 그룹의 회의록만 조회

**응답 예시:**
```json
[
  {
    "id": "uuid",
    "title": "Q3 목표 회의",
    "meeting_date": "2026-08-14",
    "group_id": "group_uuid",
    "created_by": "user_uuid",
    "raw_content": "회의 원문...",
    "ai_summary": "AI 요약 결과...",
    "generated": true,
    "status": "summarized",
    "created_at": "2026-08-14T00:00:00Z",
    "meeting_attendees": [
      {
        "id": "uuid",
        "user_id": "user_uuid",
        "users": {
          "id": "user_uuid",
          "name": "김철수",
          "position": "팀장",
          "avatar_url": "https://..."
        }
      }
    ]
  }
]
```

---

### POST /api/meetings
**새 회의록 생성**

```bash
curl -X POST http://localhost:4000/api/meetings \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q3 목표 회의",
    "group_id": "GROUP_ID",
    "meeting_date": "2026-08-14",
    "raw_content": "회의 원문...",
    "attendee_ids": ["USER_ID_1", "USER_ID_2"]
  }'
```

**요청 바디:**
- `title` (string, required): 회의 제목
- `group_id` (string, required): 소속 그룹 ID
- `meeting_date` (string, required): 회의 날짜 (YYYY-MM-DD)
- `raw_content` (string, optional): 회의 원문
- `attendee_ids` (array, optional): 참석자 사용자 ID 배열

**응답:** 생성된 회의록 객체

**권한 검증:**
- 요청자가 해당 그룹의 멤버여야 함

---

### GET /api/meetings/:meetingId
**회의록 상세 조회**

```bash
curl -X GET http://localhost:4000/api/meetings/MEETING_ID \
  -H "Authorization: Bearer JWT_TOKEN"
```

**응답 예시:**
```json
{
  "id": "uuid",
  "title": "Q3 목표 회의",
  "meeting_date": "2026-08-14",
  "group_id": "group_uuid",
  "created_by": "user_uuid",
  "raw_content": "회의 원문...",
  "ai_summary": "AI 요약 결과...",
  "generated": true,
  "status": "summarized",
  "created_at": "2026-08-14T00:00:00Z",
  "meeting_attendees": [...],
  "agenda_items": [
    {
      "id": "uuid",
      "title": "항목 1",
      "status": "pending"
    }
  ],
  "tasks": [
    {
      "id": "uuid",
      "title": "작업 1",
      "assigned_to": "user_uuid",
      "status": "pending",
      "due_date": "2026-08-21"
    }
  ]
}
```

---

### PATCH /api/meetings/:meetingId
**회의록 수정**

```bash
curl -X PATCH http://localhost:4000/api/meetings/MEETING_ID \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_content": "수정된 회의 원문...",
    "attendee_ids": ["USER_ID_1", "USER_ID_3"]
  }'
```

**요청 바디:**
- `raw_content` (string, optional): 회의 원문 수정
- `attendee_ids` (array, optional): 참석자 재설정

**응답:** 수정된 회의록 객체

---

### DELETE /api/meetings/:meetingId
**회의록 삭제**

```bash
curl -X DELETE http://localhost:4000/api/meetings/MEETING_ID \
  -H "Authorization: Bearer JWT_TOKEN"
```

**응답:**
```json
{
  "message": "회의가 삭제되었습니다."
}
```

---

### POST /api/meetings/:meetingId/generate
**AI 요약 생성**

```bash
curl -X POST http://localhost:4000/api/meetings/MEETING_ID/generate \
  -H "Authorization: Bearer JWT_TOKEN"
```

**동작:**
1. 회의 원문 가져오기
2. OpenAI (GPT-4o-mini) 호출
3. 요약, 안건(agendas), 작업(tasks) 추출
4. agenda_items, tasks 테이블에 저장
5. meetings.generated = true로 업데이트

**응답 예시:**
```json
{
  "message": "요약 완료",
  "result": {
    "summary": "오늘 회의는 Q3 목표에 대한 논의가 있었습니다...",
    "agendas": [
      "Q3 매출 목표 확인",
      "마케팅 전략 수립",
      "고객 만족도 개선"
    ],
    "tasks": [
      "시장 조사 보고서 작성",
      "경쟁사 분석",
      "전략 수립"
    ]
  },
  "meeting": {
    "id": "uuid",
    "generated": true,
    "status": "summarized",
    ...
  }
}
```

---

## 5. 프론트엔드에서 설정해야 할 것

### 5-1. 환경 변수 설정

`.env.local` 또는 `.env.development`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**주의:**
- `NEXT_PUBLIC_` 붙은 것은 브라우저에 노출됨
- 서버 비밀값은 절대 프론트에 포함하지 말 것

### 5-2. API 호출 예시 (JavaScript)

```javascript
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// 그룹 목록 조회
async function getGroups() {
  const token = localStorage.getItem('supabaseToken');
  
  const response = await fetch(`${BASE_URL}/api/groups`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(error);
    return [];
  }

  return await response.json();
}

// 회의록 생성
async function createMeeting(title, groupId, meetingDate, rawContent, attendeeIds) {
  const token = localStorage.getItem('supabaseToken');
  
  const response = await fetch(`${BASE_URL}/api/meetings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      group_id: groupId,
      meeting_date: meetingDate,
      raw_content: rawContent,
      attendee_ids: attendeeIds
    })
  });

  return await response.json();
}

// AI 요약 생성
async function generateSummary(meetingId) {
  const token = localStorage.getItem('supabaseToken');
  
  const response = await fetch(`${BASE_URL}/api/meetings/${meetingId}/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
}
```

---

## 6. 에러 처리

### 표준 에러 응답 형식

모든 에러 응답은 다음 형식을 따릅니다:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

### 주요 에러 코드

| HTTP | Code | 상황 |
|------|------|------|
| 400 | BAD_REQUEST | 요청 데이터 형식 오류 |
| 401 | UNAUTHORIZED | 인증 토큰 없음 또는 유효하지 않음 |
| 403 | FORBIDDEN | 권한 없음 (그룹 멤버 아님 등) |
| 404 | NOT_FOUND | 리소스 없음 |
| 500 | DB_ERROR | 데이터베이스 오류 |
| 500 | SERVER_ERROR | 서버 오류 |

### 401 처리 (프론트 구현 필요)
토큰이 만료되었을 때:
```javascript
if (response.status === 401) {
  // 로그인 페이지로 리다이렉트
  window.location.href = '/login';
}
```

---

## 7. 프론트엔드 구현 체크리스트

### Phase 1: 기본 설정
- [ ] `.env.local` 설정 (API_BASE_URL, Supabase URL/Key)
- [ ] API 호출 유틸리티 함수 작성
- [ ] 토큰 관리 (localStorage 또는 쿠키)
- [ ] 401 에러 처리 (자동 로그아웃)

### Phase 2: 그룹 기능
- [ ] 그룹 목록 페이지 UI
- [ ] 그룹 생성 모달 구현
- [ ] GET /api/groups 호출
- [ ] POST /api/groups 호출
- [ ] 그룹 멤버 관리 페이지 (선택사항)

### Phase 3: 회의록 기능
- [ ] 회의록 목록 페이지 (group_id 필터)
- [ ] 회의록 생성 폼
- [ ] 회의록 상세 조회 페이지
- [ ] 회의록 수정 폼
- [ ] 회의록 삭제 기능
- [ ] 참석자 추가/제거

### Phase 4: AI 요약 기능
- [ ] "요약 생성" 버튼 UI
- [ ] POST /api/meetings/:id/generate 호출
- [ ] 로딩 상태 표시 (OpenAI 응답 대기)
- [ ] 요약 결과 표시
- [ ] 안건(agenda_items) 렌더링
- [ ] 작업(tasks) 렌더링

### Phase 5: 테스트 & 배포
- [ ] 로컬 테스트 완료
- [ ] 404, 403 등 에러 케이스 테스트
- [ ] 토큰 만료 후 재로그인 테스트
- [ ] 프로덕션 환경 설정

---

## 8. 백엔드 서버 실행

개발 환경에서 백엔드 서버 실행:

```bash
cd c:\Users\yims0\OneDrive\Desktop\demo

# 개발 서버 (자동 재시작)
npm run dev

# 프로덕션 서버
npm start
```

서버는 `http://localhost:4000`에서 실행됩니다.

---

## 9. 통합 테스트 시나리오

### 시나리오 1: 그룹 생성 후 회의록 생성
1. 사용자 로그인 (Supabase JWT 토큰 획득)
2. `POST /api/groups` → 새 그룹 생성
3. `POST /api/meetings` → 새 회의록 생성
4. 회의록 목록에서 확인

### 시나리오 2: 회의록 작성 후 AI 요약
1. 회의 원문 입력
2. `PATCH /api/meetings/:id` → 회의 원문 저장
3. "요약 생성" 클릭 → `POST /api/meetings/:id/generate`
4. 안건과 작업 목록 표시

### 시나리오 3: 권한 검증
1. 그룹 A 멤버가 로그인
2. 그룹 B의 회의록 접근 시도
3. 403 Forbidden 반환 확인

---

## 10. 문제 해결

### "Authorization header is missing" (401)
- Supabase JWT 토큰이 localStorage에 저장되어 있는지 확인
- Authorization 헤더 형식: `Bearer <token>` (Bearer 다음에 공백 필수)

### "CORS 에러"
- 백엔드 index.js에 `app.use(cors());` 설정되어 있음
- 프론트 URL이 CORS 허용 목록에 있는지 확인

### "Cannot find module" 에러
- 백엔드에서 `npm install` 실행
- `node_modules` 폴더 삭제 후 재설치: `rm -r node_modules && npm install`

### API 응답이 느림
- OpenAI 요약 생성 시 5~10초 소요 가능
- 로딩 스피너 표시 필수

---

## 11. 결론

백엔드 API는 완전히 준비되었습니다.

**프론트엔드 팀의 역할:**
1. 환경변수 설정
2. API 호출 로직 구현
3. UI/UX 개발
4. 통합 테스트

**문의사항:**
백엔드 API 로직이나 데이터 구조에 대한 질문이 있으면 언제든지 물어보세요!

---

**문서 작성일:** 2026-08-14
**백엔드 상태:** ✅ 완료
**다음 단계:** 프론트엔드 개발 시작
