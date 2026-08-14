# 협업 가이드 (Contributing Guide)

## 🎯 프로젝트 개요

**프로젝트명**: LLM Wrapper를 이용한 대학생 Productivity 서비스  
**기술 스택**: Next.js 16.3.1 (풀스택), Supabase (DB), OpenAI (LLM)  
**발표일**: 2026-08-15 (목) 21:00  
**최종 커밋 마감**: 2026-08-15 (목) 20:30

---

## 📋 브랜치 전략

```
main (배포용, PR 후 merge)
├── develop (통합 & 테스트용)
│   ├── feature/frontend-[name]
│   ├── feature/backend-[name]
│   └── feature/db-[name]
```

### 브랜치 명명 규칙
```bash
# 기능 개발
feature/[담당자]-[기능]
예: feature/john-meeting-analysis, feature/jane-group-management

# 버그 수정
fix/[담당자]-[버그내용]
예: fix/john-auth-token-expiry

# 문서
docs/[내용]
예: docs/api-specification
```

---

## 🚀 시작하기

### 1. 저장소 클론 및 환경 설정

```bash
# 저장소 클론
git clone https://github.com/yimsNEO/eackathon.git
cd eackathon

# develop 브랜치로 이동
git checkout develop

# 의존성 설치
npm install

# 환경변수 설정
# .env.local 파일 생성 (Discord에서 값 받기)
# 내용은 .env.example 참고
cp .env.example .env.local
# 에디터에서 .env.local 열어서 실제 값 입력
```

### 2. 개발 서버 시작

```bash
npm run dev
# 브라우저: http://localhost:3000
```

---

## 💻 코드 작업 방식

### Git 작업 흐름

```bash
# 1️⃣ develop에서 feature 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2️⃣ 코드 작성 & 커밋
git add .
git commit -m "feat(scope): description"
# 커밋 메시지 규칙 아래 참고

# 3️⃣ 푸시
git push origin feature/your-feature-name

# 4️⃣ GitHub에서 Pull Request (PR) 생성
# → base: develop, compare: feature/your-feature-name
# → 코드 리뷰 요청

# 5️⃣ 리뷰 반영 후 approve 받으면 merge
# 그 후 로컬에서:
git checkout develop
git pull origin develop
```

### 커밋 메시지 규칙

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 종류:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 스타일 변경 (formatter, 들여쓰기 등)
- `refactor`: 코드 재구성 (기능 변경 없음)
- `test`: 테스트 추가/수정
- `chore`: 빌드, 의존성 등

**Scope 예시:**
- `api`: API 라우트
- `client`: 클라이언트 (React 컴포넌트)
- `db`: 데이터베이스 (Supabase)
- `config`: 설정 파일

**Subject:**
- 명령조로 시작 (~한다)
- 마침표 없음
- 50자 이내

**예시:**
```
feat(api): add meeting analysis endpoint
fix(client): resolve calendar date display bug
docs(readme): update setup instructions
chore(deps): upgrade openai to v4.28
```

---

## ⚠️ 주의사항

### 🔴 절대 하지 말 것

| 항목 | 이유 |
|------|------|
| `.env.local` push | API 키 탈취 위험 |
| `node_modules/` push | 저장소 크기 증가 |
| 직접 `main`에 push | 협업 형식 무시 |
| 무단으로 남 코드 수정 | 충돌 발생 |

### ✅ 반드시 할 것

| 항목 | 사유 |
|------|------|
| `.env.local` 생성 후 로컬에서만 사용 | 보안 |
| 커밋 전 `npm run dev`로 테스트 | 빌드 오류 방지 |
| PR 생성 전 develop에서 rebase | 충돌 최소화 |
| 코드 리뷰 요청 | 품질 관리 |

---

## 📁 프로젝트 구조

```
eackathon/
├── app/
│   ├── page.tsx           ← 클라이언트 (메인 페이지)
│   ├── layout.tsx         ← 레이아웃
│   ├── globals.css        ← 전역 스타일
│   └── api/               ← 서버 API
│       ├── groups/        ← 그룹 관리 API
│       └── meetings/      ← 회의록 관리 API (LLM 분석 포함)
├── utils/
│   ├── supabase.js        ← 클라이언트 인증
│   └── supabase-server.js ← 서버 권한
├── supabase/
│   └── migrations/        ← DB 스키마
├── public/                ← 정적 파일
├── .env.example           ← 환경변수 템플릿
├── .env.local             ← 로컬 환경변수 (Git 추적 안 함)
├── package.json
├── tsconfig.json
└── next.config.ts
```

### 담당 영역 예시

```
Frontend (클라이언트 UI):
├── app/page.tsx
├── app/layout.tsx
└── app/globals.css

Backend (API 서버):
├── app/api/groups/
├── app/api/meetings/
└── utils/supabase-server.js

Database (스키마):
├── supabase/migrations/
└── utils/supabase.js (클라이언트 설정)
```

---

## 🔧 개발 환경 설정

### 필수 도구
- Node.js 18+ (확인: `node --version`)
- npm 9+ (확인: `npm --version`)
- Git (확인: `git --version`)

### VSCode 권장 확장
- ESLint
- Prettier
- Next.js Extension Pack
- Thunder Client (API 테스트용)

### 환경변수 (.env.local)

`.env.example`을 참고하여 `.env.local` 파일 생성:

```bash
# Discord에서 다음 값들을 요청
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
OPENAI_API_KEY=sk-proj-xxx...
```

**⚠️ 절대 원격 저장소에 업로드하면 안 됨!**

---

## 🧪 테스트 & 배포

### 로컬 테스트

```bash
# 개발 서버
npm run dev

# 빌드 테스트 (배포 전)
npm run build
npm run start
```

### API 테스트 (Postman / Thunder Client)

예: `POST /api/meetings/1/generate`

```bash
# Header
Authorization: Bearer <access_token>
Content-Type: application/json

# Body
{
  "meetingNotes": "Today we discussed..."
}
```

---

## 📞 문의 및 소통

| 채널 | 용도 |
|------|------|
| Discord #dev | 기술 질문, 코드 리뷰 |
| GitHub Issues | 버그 리포트, 기능 요청 |
| GitHub PR | 코드 리뷰, 피드백 |
| 직접 연락 | 긴급 (API 키 재발급 등) |

---

## ✅ 체크리스트 (본인 담당 영역)

개발 완료 전에 다음 항목들을 확인하세요:

```
[ ] 코드가 로컬에서 정상 작동하는가?
[ ] API 테스트가 완료되었는가? (Postman/Thunder Client)
[ ] 타입스크립트 에러가 없는가?
[ ] 환경변수가 제대로 설정되었는가?
[ ] 커밋 메시지가 명확한가?
[ ] .env.local이 커밋되지 않았는가?
[ ] PR 설명이 충분한가?
```

---

**행운을 빕니다! 🚀**
