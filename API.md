# 📡 API 명세서 (API Specification)

## 아키텍처

```
클라이언트 (웹/앱) ←→ 서버 (API 키 보관, LLM 호출 담당) ←→ 데이터베이스 (Supabase Postgres)
                                    ↓
                              LLM 제공사 (OpenAI / Gemini)
```

- 클라이언트는 이 문서에 정의된 서버 엔드포인트만 호출하며, Supabase나 LLM API를 직접 호출하지 않습니다.
- LLM API 키는 서버 환경변수로만 보관하고, LLM 호출은 전부 서버에서 이루어집니다.

## 인증

모든 요청(로그인 관련 제외)은 아래 헤더가 필요합니다.

```
Authorization: Bearer <supabase access token>
```

서버는 이 토큰을 Supabase Auth로 검증해 `user_id`를 얻고, 이후 요청 처리에 사용합니다. 로그인/회원가입 자체는 프론트가 Supabase Auth SDK로 직접 처리하므로 별도 엔드포인트가 없습니다.

## 공통 오류 응답 형식

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "사람이 읽을 수 있는 오류 설명"
  }
}
```

| 상태 코드 | 의미 |
| :--- | :--- |
| `400` | 요청 형식이 잘못됨 (필수 필드 누락 등) |
| `401` | 인증 토큰이 없거나 유효하지 않음 |
| `403` | 권한 없음 (다른 그룹의 데이터 접근 시도 등) |
| `404` | 리소스를 찾을 수 없음 |
| `500` | 서버 내부 오류 (LLM 호출 실패 포함) |

---

## 1. 그룹 (Groups)

### `GET /api/groups`
내가 속한 그룹 목록을 조회합니다.

- **요청 형식**: 없음 (헤더의 토큰으로 사용자 식별)
- **응답 형식 (200 OK)**
```json
[
  { "id": "uuid", "name": "임원진", "memberCount": 7, "createdAt": "2026-08-13T10:00:00Z" }
]
```
- **오류 응답**: `401` 인증 실패

### `POST /api/groups`
새 그룹을 생성합니다.

- **요청 형식 (Body)**
```json
{ "name": "새 그룹" }
```
- **응답 형식 (201 Created)**
```json
{ "id": "uuid", "name": "새 그룹", "createdAt": "2026-08-13T10:00:00Z" }
```
- **오류 응답**: `400` name 누락, `401` 인증 실패

### `GET /api/groups/:groupId`
그룹 상세 정보와 멤버 목록을 함께 조회합니다.

- **요청 형식**: 경로 변수 `groupId`
- **응답 형식 (200 OK)**
```json
{
  "id": "uuid",
  "name": "임원진",
  "members": [
    { "userId": "uuid", "name": "김도윤", "position": "회장" }
  ]
}
```
- **오류 응답**: `404` 그룹 없음, `401` 인증 실패

### `PATCH /api/groups/:groupId`
그룹명을 수정합니다.

- **요청 형식 (Body)**
```json
{ "name": "수정할 그룹명" }
```
- **응답 형식 (200 OK)**
```json
{ "id": "uuid", "name": "수정할 그룹명" }
```
- **오류 응답**: `400` name 누락, `403` 그룹 멤버가 아님, `404` 그룹 없음

### `DELETE /api/groups/:groupId`
그룹을 삭제합니다.

- **요청 형식**: 경로 변수 `groupId`
- **응답 형식**: `204 No Content`
- **오류 응답**: `403` 권한 없음, `404` 그룹 없음

---

## 2. 그룹 멤버 (Group Members)

### `POST /api/groups/:groupId/members`
그룹에 멤버를 추가합니다.

- **요청 형식 (Body)**
```json
{ "userId": "uuid", "position": "총무" }
```
- **응답 형식 (201 Created)**
```json
{ "groupId": "uuid", "userId": "uuid", "position": "총무" }
```
- **오류 응답**: `400` userId 누락, `404` 그룹 또는 사용자 없음, `409` 이미 그룹 멤버임

### `DELETE /api/groups/:groupId/members/:userId`
그룹에서 멤버를 제외합니다. (해당 그룹의 회의록 참석자 목록에서도 함께 제거됩니다.)

- **요청 형식**: 경로 변수 `groupId`, `userId`
- **응답 형식**: `204 No Content`
- **오류 응답**: `403` 권한 없음, `404` 멤버 없음

---

## 3. 회의록 (Meetings)

### `GET /api/meetings?groupId=`
회의록 목록을 조회합니다. `groupId` 쿼리로 필터링할 수 있습니다.

- **요청 형식 (Query)**: `groupId` (선택)
- **응답 형식 (200 OK)**
```json
[
  {
    "id": "uuid",
    "title": "정기 임원진 회의",
    "meetingDate": "2026-08-13",
    "groupId": "uuid",
    "groupName": "임원진",
    "generated": true
  }
]
```
- **오류 응답**: `401` 인증 실패

### `POST /api/meetings`
새 회의록(초안)을 생성합니다.

- **요청 형식 (Body)**
```json
{ "groupId": "uuid", "title": "새 회의록", "meetingDate": "2026-08-13" }
```
- **응답 형식 (201 Created)**
```json
{ "id": "uuid", "title": "새 회의록", "meetingDate": "2026-08-13", "generated": false }
```
- **오류 응답**: `400` 필수 필드 누락, `403` 그룹 멤버가 아님

### `GET /api/meetings/:meetingId`
회의록 상세를 조회합니다. 참석자, 안건, 할일을 함께 반환합니다.

- **요청 형식**: 경로 변수 `meetingId`
- **응답 형식 (200 OK)**
```json
{
  "id": "uuid",
  "title": "정기 임원진 회의",
  "meetingDate": "2026-08-13",
  "rawContent": "다음 정기모임 일정 및 예산안 논의...",
  "generated": true,
  "attendees": [{ "userId": "uuid", "name": "김도윤" }],
  "agendaItems": [
    { "id": "uuid", "content": "예산안 초안 승인", "status": "confirmed" },
    {
      "id": "uuid",
      "content": "홍보 포스터 시안 최종 선택",
      "status": "needs_opinion",
      "opinions": [{ "userId": "uuid", "name": "정하은", "opinion": "2안이 좋아요" }]
    }
  ],
  "tasks": [
    { "id": "uuid", "text": "장소 예약 확정하기", "assigneeId": "uuid", "assigneeName": "박지훈", "done": false }
  ]
}
```
- **오류 응답**: `403` 그룹 멤버가 아님, `404` 회의록 없음

### `PATCH /api/meetings/:meetingId`
회의 원문(`rawContent`) 또는 참석자 목록을 수정합니다.

- **요청 형식 (Body, 둘 다 선택)**
```json
{ "rawContent": "수정된 회의 원문", "attendeeIds": ["uuid", "uuid"] }
```
- **응답 형식 (200 OK)**
```json
{ "id": "uuid", "rawContent": "수정된 회의 원문", "attendees": ["uuid", "uuid"] }
```
- **오류 응답**: `403` 권한 없음, `404` 회의록 없음

### `DELETE /api/meetings/:meetingId`
회의록을 삭제합니다.

- **응답 형식**: `204 No Content`
- **오류 응답**: `403` 권한 없음, `404` 회의록 없음

### `POST /api/meetings/:meetingId/generate`
**(핵심 LLM 기능)** 회의 원문을 LLM에 전달해 확정 안건 / 의견 필요 안건 / 할일을 생성하고 저장합니다.

- **요청 형식**: 경로 변수 `meetingId` (Body 없음, 이미 저장된 `rawContent`와 `attendees`를 사용)
- **응답 형식 (200 OK)**
```json
{
  "meetingId": "uuid",
  "generated": true,
  "agendaItems": [
    { "id": "uuid", "content": "예산안 초안 승인", "status": "confirmed" }
  ],
  "tasks": [
    { "id": "uuid", "text": "장소 예약 확정하기", "assigneeId": "uuid", "done": false }
  ]
}
```
- **오류 응답**: `400` rawContent 비어있음, `404` 회의록 없음, `500` LLM 호출 실패 (재시도 안내 메시지 포함)

---

## 4. 안건 의견 (Agenda Opinions)

### `POST /api/agenda-items/:agendaItemId/opinions`
`needs_opinion` 상태인 안건에 로그인한 사용자가 의견을 제출합니다.

- **요청 형식 (Body)**
```json
{ "opinion": "저는 2안이 좋을 것 같아요" }
```
- **응답 형식 (201 Created)**
```json
{ "id": "uuid", "agendaItemId": "uuid", "userId": "uuid", "opinion": "저는 2안이 좋을 것 같아요" }
```
- **오류 응답**: `400` opinion 비어있음, `404` 안건 없음, `409` 이미 의견을 제출함 (수정은 향후 `PATCH`로 지원 예정)

---

## 5. 할일 (Tasks)

### `GET /api/tasks/mine`
로그인한 사용자에게 할당된 할일만, 파생된 회의록별로 그룹화해서 조회합니다.

- **요청 형식**: 없음 (토큰으로 사용자 식별)
- **응답 형식 (200 OK)**
```json
[
  {
    "meetingId": "uuid",
    "meetingTitle": "정기 임원진 회의",
    "meetingDate": "2026-08-13",
    "tasks": [
      { "id": "uuid", "text": "홍보 포스터 시안 최종 컨펌", "done": false }
    ]
  }
]
```
- **오류 응답**: `401` 인증 실패

### `PATCH /api/tasks/:taskId`
할일의 완료 여부를 토글합니다.

- **요청 형식 (Body)**
```json
{ "done": true }
```
- **응답 형식 (200 OK)**
```json
{ "id": "uuid", "done": true }
```
- **오류 응답**: `403` 담당자 본인이 아님, `404` 할일 없음
