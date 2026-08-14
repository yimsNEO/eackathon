# 회의록 앱 백엔드 서버

> 회의 내용을 기록하고 AI로 자동 요약하는 서비스의 **백엔드 API 서버**

---

## 🎯 프로젝트 개요

- **용도**: Express 기반 REST API 서버
- **주요 기능**: 그룹/회의록 관리, Supabase 인증, OpenAI AI 요약
- **포트**: 4000번
- **환경**: Node.js 18+

---

## 📦 설치 & 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일 생성:
```env
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. 개발 서버 실행
```bash
npm run dev
```

또는 프로덕션:
```bash
npm start
```

서버는 `http://localhost:4000`에서 실행됩니다.

---

## 📚 API 문서

### 전체 문서
📖 [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md) - 프론트엔드 개발자를 위한 완전한 API 스펙

### 테스트 가이드
🧪 [TEST_API.md](./TEST_API.md) - API 테스트 방법 및 예시

---

## 📁 프로젝트 구조

```
demo/
├── index.js                 # 메인 서버 파일
├── db.js                    # Supabase 클라이언트 설정
├── package.json             # 의존성 & 스크립트
├── .env                     # 환경 변수
├── .gitignore              # Git 무시 파일
├── README.md               # 이 파일
├── FRONTEND_HANDOFF.md     # 프론트 개발자용 가이드 ⭐
├── TEST_API.md             # API 테스트 가이드 ⭐
├── API.md                  # 초기 API 설계 문서
├── DB.md                   # 데이터베이스 스키마
├── routes/
│   ├── group.js            # 그룹 관련 API
│   ├── meetings.js         # 회의록 관련 API
│   ├── calendar.js         # 캘린더 (미사용)
│   ├── todo.js             # 투두 (미사용)
│   └── minutes.js          # 사용되지 않음
└── middleware/
    └── auth.js             # Supabase JWT 인증 미들웨어
```

---

## 🔑 핵심 기능

### 1. 그룹 관리
- ✅ 그룹 생성 & 조회
- ✅ 멤버 추가 & 권한 관리
- ✅ 그룹 멤버만 데이터 접근 가능

### 2. 회의록 관리
- ✅ 회의록 생성, 조회, 수정, 삭제
- ✅ 참석자 관리
- ✅ 회의 원문 저장

### 3. AI 요약 (OpenAI)
- ✅ 회의 원문을 GPT-4o-mini로 자동 요약
- ✅ 안건(agenda_items) 자동 추출
- ✅ 작업(tasks) 자동 생성

### 4. 보안
- ✅ Supabase JWT 기반 인증
- ✅ 그룹 멤버 권한 검증
- ✅ 에러 응답 표준화

---

## 🔗 API 엔드포인트 요약

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/groups | 사용자 그룹 목록 | ✅ |
| POST | /api/groups | 새 그룹 생성 | ✅ |
| POST | /api/groups/:id/members | 그룹에 멤버 추가 | ✅ |
| GET | /api/meetings | 회의록 목록 | ✅ |
| POST | /api/meetings | 새 회의록 생성 | ✅ |
| GET | /api/meetings/:id | 회의록 상세 조회 | ✅ |
| PATCH | /api/meetings/:id | 회의록 수정 | ✅ |
| DELETE | /api/meetings/:id | 회의록 삭제 | ✅ |
| POST | /api/meetings/:id/generate | AI 요약 생성 | ✅ |

> 모든 엔드포인트는 `Authorization: Bearer <JWT>` 헤더 필수

---

## 📊 데이터베이스 스키마

자세한 내용은 [DB.md](./DB.md) 참고

주요 테이블:
- **groups**: 그룹 정보
- **group_members**: 그룹 멤버 & 권한
- **meetings**: 회의록 데이터
- **meeting_attendees**: 회의 참석자
- **agenda_items**: 안건 항목
- **tasks**: 작업 항목

---

## 🧪 테스트

### cURL로 테스트
```bash
# 그룹 목록 조회
curl -X GET http://localhost:4000/api/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 새 그룹 생성
curl -X POST http://localhost:4000/api/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "팀 A"}'
```

### Postman/Insomnia
1. Authorization 탭 → "Bearer Token" 선택
2. Token 필드에 Supabase JWT 입력
3. 각 엔드포인트 테스트

자세한 테스트 가이드는 [TEST_API.md](./TEST_API.md) 참고

---

## ⚙️ 의존성

| 패키지 | 용도 |
|--------|------|
| express | 웹 서버 |
| cors | CORS 처리 |
| dotenv | 환경 변수 관리 |
| @supabase/supabase-js | Supabase 클라이언트 |
| openai | OpenAI API |
| nodemon | 개발 시 자동 재시작 |

---

## 🚀 배포 준비

### 프로덕션 체크리스트
- [ ] `.env` 파일에 실제 서버 키 입력
- [ ] Supabase SERVICE_ROLE_KEY 확인
- [ ] OpenAI API 키 확인
- [ ] 모든 API 엔드포인트 테스트 완료
- [ ] 에러 로깅 설정
- [ ] CORS 도메인 화이트리스트 설정 (필요시)

---

## 📝 프론트엔드 연동

### 환경 변수 (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### API 호출 예시
```javascript
const response = await fetch('http://localhost:4000/api/groups', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json'
  }
});
```

자세한 내용은 [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md) 참고

---

## 🐛 문제 해결

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### "CORS 에러"
- 백엔드에서 CORS 미들웨어 설정 확인
- 프론트 URL이 허용되는지 확인

### "Unauthorized (401)"
- JWT 토큰이 유효한지 확인
- Authorization 헤더 형식: `Bearer <token>`

### "Permission denied (403)"
- 사용자가 그룹 멤버인지 확인
- 그룹 관리자 권한이 필요한 작업인지 확인

더 많은 문제 해결 내용은 [TEST_API.md](./TEST_API.md) 참고

---

## 📞 문의

API 스펙, 데이터 구조, 백엔드 로직에 대한 질문은 이 문서의 다음 파일들을 참고하세요:

- **API 스펙**: [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md)
- **테스트 방법**: [TEST_API.md](./TEST_API.md)
- **DB 스키마**: [DB.md](./DB.md)

---

## 📅 상태

- **작성일**: 2026-08-14
- **백엔드 상태**: ✅ 완료
- **마지막 업데이트**: 2026-08-14

**프론트엔드 개발 시작 준비 완료! 🚀**