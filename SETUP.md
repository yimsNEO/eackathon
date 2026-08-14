# 개발 환경 설정 가이드

## 🚀 빠른 시작 (Quick Start)

```bash
# 1. 저장소 클론
git clone https://github.com/yimsNEO/eackathon.git
cd eackathon

# 2. develop 브랜치로 전환
git checkout develop

# 3. 의존성 설치
npm install

# 4. 환경변수 설정
cp .env.example .env.local
# → .env.local 파일에 실제 API 키 입력

# 5. 개발 서버 시작
npm run dev
# → http://localhost:3000 접속
```

---

## 📋 필요한 정보

협업자(공지 만든 사람)에게 다음을 요청하세요:

```
1. GitHub Repository 초대 링크
2. Supabase 프로젝트 접근 권한
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
3. OpenAI API 키
   - OPENAI_API_KEY (sk-proj-xxx)
```

**⚠️ API 키는 Discord/Slack DM으로만 전달**

---

## 🔧 상세 설정

### 1. Node.js & npm 설치 확인

```bash
# 버전 확인
node --version  # v18.0.0 이상 필요
npm --version   # v9.0.0 이상 필요
```

**미설치 시:**
- [Node.js 공식 사이트](https://nodejs.org/) → LTS 버전 다운로드

### 2. 저장소 클론 & 브랜치 설정

```bash
# HTTPS 방식 (권장)
git clone https://github.com/yimsNEO/eackathon.git

# SSH 방식 (GitHub SSH 키 등록된 경우)
git clone git@github.com:yimsNEO/eackathon.git

# develop 브랜치로 전환
cd eackathon
git checkout develop
```

### 3. 의존성 설치

```bash
# npm으로 설치
npm install

# 또는 yarn으로 설치
yarn install
```

**설치되는 주요 패키지:**
- `next` (16.3.1) - 웹 프레임워크
- `react` (19.2.8) - UI 라이브러리
- `@supabase/supabase-js` - DB 클라이언트
- `openai` - LLM API 클라이언트

### 4. 환경변수 설정

**.env.local 파일 생성:**

```bash
cp .env.example .env.local
```

**파일 내용 (.env.local):**

```
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI 설정
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

**값 입력 방법:**
1. 협업자에게 값 요청
2. VSCode에서 `.env.local` 파일 열기
3. 플레이스홀더(`your-supabase-url`, `sk-proj-xxx`) 부분만 교체
4. 저장 (Ctrl+S)

### 5. 개발 서버 시작

```bash
npm run dev
```

**성공 시 터미널에 다음과 같이 표시됨:**

```
▲ Next.js 16.3.1 (Turbopack)
- Local:         http://localhost:3000
- Environments: .env.local
✓ Ready in 2.6s
```

**브라우저에서 접속:**
```
http://localhost:3000
```

---

## 🧪 작동 확인

### 클라이언트 확인
- [ ] http://localhost:3000 접속 가능
- [ ] 로그인 화면 표시됨
- [ ] Supabase 인증 정상 작동

### 서버 API 확인

**Thunder Client (VSCode 확장)로 테스트:**

1. VSCode → Thunder Client 열기
2. 새 Request 생성
3. 다음과 같이 설정:

```
Method: POST
URL: http://localhost:3000/api/meetings/1/generate

Headers:
Authorization: Bearer <token>
Content-Type: application/json

Body (JSON):
{
  "meetingNotes": "Today we discussed Q3 goals..."
}
```

4. Send 클릭 → 응답 확인

---

## 🐛 문제 해결

| 문제 | 해결 방법 |
|------|---------|
| **Port 3000 in use** | `npm run dev` 포트 변경 또는 다른 앱 종료 |
| **Cannot find module** | `npm install` 재실행 |
| **OPENAI_API_KEY undefined** | `.env.local` 파일이 존재하고 값이 설정되었는지 확인 |
| **Supabase 연결 실패** | NEXT_PUBLIC_SUPABASE_URL, ANON_KEY 값 확인 |
| **Git fatal error** | `git config --global user.email "your@email.com"` 설정 |
| **CORS 에러** | 클라이언트에서 외부 API 직접 호출 중 → `/api/` 라우트 사용 |

---

## 📚 유용한 명령어

```bash
# 개발 서버 시작
npm run dev

# 빌드 (배포 전 테스트)
npm run build

# 빌드된 버전 실행
npm run start

# 린트 & 타입 체크
npm run lint

# 특정 브랜치로 전환
git checkout develop

# 변경사항 확인
git status

# 변경사항 스테이징
git add .

# 커밋
git commit -m "feat: your message"

# 원격에 푸시
git push origin your-branch

# 로컬 브랜치 삭제
git branch -d branch-name

# 원격 브랜치 삭제
git push origin --delete branch-name
```

---

## 🚀 배포 준비

**Vercel 배포 (권장):**

```bash
# 1. Vercel 계정 생성 (https://vercel.com)
# 2. GitHub 계정 연동
# 3. eackathon 저장소 import
# 4. Environment Variables 설정
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - OPENAI_API_KEY
# 5. Deploy 클릭
```

---

## 📞 문제 발생 시

1. **로컬 환경이 정상인지 확인:**
   ```bash
   npm run dev
   curl http://localhost:3000
   ```

2. **Discord #dev 채널에 다음 정보 공유:**
   - 에러 메시지 (스크린샷)
   - 명령어 실행 결과
   - Node.js/npm 버전
   - 운영체제

3. **급한 경우:** 담당자에게 직접 연락

---

**설정 완료! 이제 개발을 시작할 준비가 되었습니다. 🎉**
