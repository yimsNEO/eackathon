# Backend Handoff Guide

## 1. 현재 상태

현재 프로젝트는 아직 한 앱 안에서 프론트와 백엔드가 섞여 있는 구조입니다.

프론트 쪽은 이미 연동 준비를 마쳤습니다.
- 브라우저 호출 경로가 환경변수 기반으로 동작하도록 정리됨
- 현재 기준으로 외부 백엔드 서버 주소를 붙일 수 있음
- 빌드 확인 완료: `npm run build` 성공

주요 프론트 파일:
- app/page.tsx
- utils/supabase.js

백엔드 로직이 실제로 들어가 있는 핵심 파일:
- app/api/groups/route.js
- app/api/meetings/route.js
- app/api/meetings/[meetingId]/route.js
- app/api/meetings/[meetingId]/generate/route.js
- utils/supabase-server.js

핵심 원칙:
- 프론트는 화면/상태/UI만 담당
- 백엔드는 DB/인증/OpenAI/비즈니스 로직 담당
- 둘은 HTTP API로 연결해야 함

---

## 2. 지금 바로 해야 할 일

### 2-1. 백엔드 서버 프로젝트 세팅
다른 PC에서 Node.js 서버를 새로 만든 뒤, 아래 로직을 서버로 옮기면 됩니다.

옮겨야 할 핵심 파일:
- app/api/groups/route.js
- app/api/meetings/route.js
- app/api/meetings/[meetingId]/route.js
- app/api/meetings/[meetingId]/generate/route.js
- utils/supabase-server.js

반드시 분리해야 하는 이유:
- UI 코드와 서버 로직이 섞여 있음
- OpenAI 키와 서버 비밀값은 프론트에 두면 안 됨
- 팀 협업을 위해 역할을 분리해야 함

---

## 3. 백엔드 서버 구조 추천

권장 구조:

backend/
  src/
    routes/
      groups.js
      meetings.js
      meetingDetail.js
      generateSummary.js
    services/
      supabaseService.js
      aiSummaryService.js
    utils/
      auth.js
    server.js
  .env
  package.json

권장 기술 스택:
- Node.js
- Express 또는 NestJS
- @supabase/supabase-js
- openai

---

## 4. 필요한 환경변수

백엔드 서버에서만 넣어야 하는 값:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
PORT=4000
```

프론트에서만 넣어야 하는 값:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

중요:
- `OPENAI_API_KEY`는 서버에서만 사용
- `NEXT_PUBLIC_` 값은 브라우저에 노출됨
- 서버 비밀값은 절대 프론트에 포함하지 않음

---

## 5. 백엔드가 구현해야 할 API 목록

### 5-1. 그룹 API
- GET /api/groups
  - 현재 로그인 사용자가 속한 그룹 목록 반환
  - Authorization: Bearer <token>
- POST /api/groups
  - 새 그룹 생성
  - 생성자를 group_members에 자동 등록

### 5-2. 회의록 API
- GET /api/meetings
  - 회의록 목록 조회
  - groupId 필터 가능
- POST /api/meetings
  - 새 회의록 생성
  - group membership 검증

### 5-3. 회의록 상세 API
- GET /api/meetings/:meetingId
  - 회의록 상세, 참석자, agenda, tasks 조회
  - 그룹 멤버 여부 검증
- PATCH /api/meetings/:meetingId
  - rawContent 수정
  - attendeeIds 갱신
- DELETE /api/meetings/:meetingId
  - 회의록 삭제

### 5-4. AI 요약 API
- POST /api/meetings/:meetingId/generate
  - 회의 원문을 읽음
  - 인증 검증
  - OpenAI 호출
  - agenda_items, tasks 저장
  - meetings.generated = true 로 갱신

---

## 6. 백엔드에서 반드시 체크해야 하는 보안 로직

### 인증 검증
- Authorization 헤더가 없으면 401
- Bearer 토큰으로 Supabase 사용자를 확인
- 유효하지 않은 토큰이면 401

### 권한 검증
- 사용자가 속한 그룹의 멤버인지 확인
- 다른 사람의 그룹/회의를 볼 수 없게 처리
- 그룹/회의 수정/삭제는 본인 소유 또는 멤버 권한 기준 검증

### CORS
- 프론트가 다른 포트에서 접근할 수 있도록 허용 필요
- 예: http://localhost:3000

---

## 7. 현재 main 코드 기준으로 추출할 핵심 로직

아래 로직은 백엔드 서버로 이동해야 합니다.

1. Supabase 사용자 인증 검사
   - auth.getUser(token)

2. 그룹 조회 / 생성
   - group_members, groups 테이블 사용

3. 회의록 조회 / 생성 / 수정 / 삭제
   - meetings, meeting_attendees, tasks, agenda_items 처리

4. AI 요약 생성
   - OpenAI chat completion 호출
   - agenda_items, tasks 저장
   - meetings.generated 업데이트

5. 에러 응답 표준화
   - 400, 401, 403, 404, 500 형식 유지

---

## 8. 프론트와 백엔드 간 의사소통 규약

### 프론트가 기대하는 형식
- GET /api/groups -> 배열 반환
- GET /api/meetings -> 배열 반환
- POST /api/groups -> 생성된 그룹 객체 반환
- POST /api/meetings -> 생성된 회의록 객체 반환
- POST /api/meetings/:id/generate -> 요약 결과 반환

### 응답 형식 예시

```json
{
  "id": "uuid",
  "title": "회의 제목",
  "meetingDate": "2026-08-14",
  "generated": false
}
```

에러 응답 예시:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증 토큰이 없습니다."
  }
}
```

---

## 9. 통합 전 확인 체크리스트

백엔드가 완성되면 아래를 테스트해 주세요.

- [ ] 서버가 4000 포트에서 실행됨
- [ ] /api/groups GET 정상 응답
- [ ] /api/groups POST 정상 응답
- [ ] /api/meetings GET 정상 응답
- [ ] /api/meetings POST 정상 응답
- [ ] /api/meetings/:id GET 정상 응답
- [ ] /api/meetings/:id/generate 응답 정상
- [ ] 토큰 없이 요청 시 401
- [ ] 다른 그룹 멤버가 접근하면 403 또는 404
- [ ] OpenAI 요약 생성 후 DB 반영 확인

---

## 10. 최종 권장 순서

1. 다른 PC에서 백엔드 서버 프로젝트 생성
2. app/api 계열 파일을 서버 코드로 옮기기
3. 인증/권한 로직 구현
4. OpenAI 요약 로직 구현
5. 로컬에서 테스트
6. 프론트에서 NEXT_PUBLIC_API_BASE_URL 연결
7. 통합 테스트

---

## 11. 결론

이 프로젝트는 현재 프론트 준비 단계가 끝났고, 백엔드 분리 작업이 핵심 남은 과제입니다.

다음 단계는 "main 코드의 서버 부분을 추출해서 다른 PC의 Node.js 백엔드로 옮기고, 프론트는 그것을 호출하는 구조로 맞추는 것"입니다.

이 문서를 기준으로 백엔드 PC에서 작업을 시작하면 됩니다.
