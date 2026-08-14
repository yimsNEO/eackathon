# API 테스트 가이드

## 서버 실행

```bash
# 개발 서버 (자동 재시작)
npm run dev

# 프로덕션 서버
npm start
```

서버는 `http://localhost:4000`에서 실행됩니다.

---

## 필수: Authorization 헤더

모든 인증이 필요한 엔드포인트는 Supabase JWT 토큰을 요구합니다.

```
Authorization: Bearer <supabase_jwt_token>
```

---

## 테스트 체크리스트

### 1. 서버 상태 확인
- [ ] `GET http://localhost:4000/` → "회의록 앱 백엔드 서버가 정상 작동 중입니다."

### 2. 그룹 API

#### 2-1. GET /api/groups - 사용자 그룹 목록 조회
```bash
curl -X GET http://localhost:4000/api/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**예상 응답:** 사용자가 속한 그룹 배열

#### 2-2. POST /api/groups - 새 그룹 생성
```bash
curl -X POST http://localhost:4000/api/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "팀 A"
  }'
```
**예상 응답:** 생성된 그룹 객체 + 생성자가 자동으로 admin으로 등록

#### 2-3. POST /api/groups/:id/members - 그룹에 멤버 추가
```bash
curl -X POST http://localhost:4000/api/groups/GROUP_ID/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID",
    "role": "member"
  }'
```
**예상 응답:** 추가된 멤버 정보
**주의:** 요청자가 그룹 admin이어야 함

---

### 3. 회의록 API

#### 3-1. GET /api/meetings - 회의록 목록 조회
```bash
curl -X GET "http://localhost:4000/api/meetings?group_id=GROUP_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**예상 응답:** 해당 그룹의 회의록 배열
**필터:** `group_id` (선택사항)
**보안:** 사용자가 그룹 멤버인지만 확인하면 조회 가능

#### 3-2. POST /api/meetings - 새 회의록 생성
```bash
curl -X POST http://localhost:4000/api/meetings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q3 목표 회의",
    "group_id": "GROUP_ID",
    "meeting_date": "2026-08-14",
    "raw_content": "회의 원문...",
    "attendee_ids": ["USER_ID_1", "USER_ID_2"]
  }'
```
**예상 응답:** 생성된 회의록 객체
**보안:** 요청자가 그룹 멤버여야 함

#### 3-3. GET /api/meetings/:meetingId - 회의록 상세 조회
```bash
curl -X GET http://localhost:4000/api/meetings/MEETING_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**예상 응답:** 회의록 + 참석자 + agenda_items + tasks 상세 정보
**보안:** 요청자가 그룹 멤버여야 함

#### 3-4. PATCH /api/meetings/:meetingId - 회의록 수정
```bash
curl -X PATCH http://localhost:4000/api/meetings/MEETING_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_content": "수정된 회의 원문...",
    "attendee_ids": ["USER_ID_1", "USER_ID_3"]
  }'
```
**예상 응답:** 수정된 회의록 객체
**보안:** 요청자가 그룹 멤버여야 함

#### 3-5. DELETE /api/meetings/:meetingId - 회의록 삭제
```bash
curl -X DELETE http://localhost:4000/api/meetings/MEETING_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**예상 응답:** `{ "message": "회의가 삭제되었습니다." }`
**보안:** 요청자가 그룹 멤버여야 함

#### 3-6. POST /api/meetings/:meetingId/generate - AI 요약 생성
```bash
curl -X POST http://localhost:4000/api/meetings/MEETING_ID/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**예상 응답:** 
```json
{
  "message": "요약 완료",
  "result": {
    "summary": "회의 요약 텍스트",
    "agendas": ["항목1", "항목2"],
    "tasks": ["작업1", "작업2"]
  },
  "meeting": { ... }
}
```
**보안:** 요청자가 그룹 멤버여야 함
**동작:**
1. 회의 원문 읽음
2. OpenAI로 요약 생성
3. `agenda_items` 테이블에 항목 추가
4. `tasks` 테이블에 작업 추가
5. `meetings.generated = true` 로 업데이트

---

## 에러 응답 형식

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증 토큰이 없습니다." 또는 "유효하지 않은 토큰입니다."
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "이 그룹/회의에 접근 권한이 없습니다."
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "회의/그룹을 찾을 수 없습니다."
  }
}
```

### 500 Server Error
```json
{
  "error": {
    "code": "SERVER_ERROR" 또는 "DB_ERROR",
    "message": "에러 상세 메시지"
  }
}
```

---

## 테스트 팁

### Postman/Insomnia로 테스트하기
1. Authorization 탭에서 "Bearer Token" 선택
2. Token 필드에 Supabase JWT 입력
3. 각 엔드포인트 테스트

### cURL로 빠르게 테스트하기
```bash
# 환경변수 설정
export TOKEN="your_jwt_token"
export GROUP_ID="your_group_id"

# 테스트
curl -X GET http://localhost:4000/api/groups \
  -H "Authorization: Bearer $TOKEN"
```

### 프론트에서 연결하기
```javascript
const BASE_URL = 'http://localhost:4000';
const token = localStorage.getItem('supabaseToken');

const response = await fetch(`${BASE_URL}/api/meetings`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

---

## 통합 테스트 순서

1. ✅ 서버 실행 (`npm run dev`)
2. ✅ `GET /` 헬스 체크
3. ✅ 토큰 없이 `/api/groups` 요청 → 401 확인
4. ✅ 토큰으로 `/api/groups` GET → 빈 배열 또는 기존 그룹
5. ✅ POST `/api/groups` → 새 그룹 생성
6. ✅ POST `/api/meetings` → 새 회의록 생성
7. ✅ GET `/api/meetings/:id` → 상세 조회
8. ✅ PATCH `/api/meetings/:id` → 수정
9. ✅ POST `/api/meetings/:id/generate` → AI 요약 생성
10. ✅ DELETE `/api/meetings/:id` → 삭제 확인
