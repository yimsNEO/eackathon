# 백엔드 구현 가이드: Admin 이름 자동 저장

## 📋 개요
프론트엔드에서 회원가입 시 이름을 입력받고, 그룹 생성 시 admin 이름을 자동으로 저장하는 기능이 추가되었습니다.

---

## 🔄 변경된 API 요청/응답 형식

### 1️⃣ 회원가입 API: POST /api/users

#### ✨ 새로운 요청 형식
```json
{
  "email": "hong@gmail.com",
  "name": "홍길동"
}
```

**헤더 필수:**
```
Authorization: Bearer <JWT_ACCESS_TOKEN>  // Supabase 회원가입 후 발급된 토큰
Content-Type: application/json
```

#### 📊 응답 형식
```json
{
  "id": "uuid",
  "email": "hong@gmail.com",
  "name": "홍길동",
  "created_at": "2026-08-15T10:00:00Z"
}
```

**프론트 수정:**
- Supabase auth.signUp()에서 `options.data.name` 포함
- 회원가입 성공 후 **POST /api/users** 호출해서 백엔드 DB에 사용자 정보 저장
- JWT 토큰은 Supabase 응답의 `session.access_token` 사용

---

### 2️⃣ 그룹 생성 API: POST /api/groups

#### ✨ 새로운 요청 형식
```json
{
  "name": "마케팅팀",
  "admin_name": "홍길동"  // ← 새로 추가됨
}
```

#### 📊 응답 형식 (기존과 동일, admin_name 추가)
```json
{
  "id": "uuid",
  "name": "마케팅팀",
  "admin_name": "홍길동",  // ← 새로 추가됨
  "created_at": "2026-08-15T10:00:00Z",
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "role": "admin",
      "name": "홍길동",
      "position": "대표",
      "users": { "name": "홍길동", "email": "hong@gmail.com" }
    }
  ]
}
```

---

## 🛠️ 백엔드 구현 체크리스트

### Phase 0: 사용자 관리 API 구현

#### ❌ 필요한 테이블 구조 (users 또는 user_profiles 테이블)
```sql
-- 사용자 정보 저장 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

#### 💻 구현 코드 예시 (Node.js + Express)

```javascript
// POST /api/users (회원가입 후 사용자 정보 저장)
router.post('/api/users', async (req, res) => {
  try {
    // 1. 인증 검증
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: { message: '토큰이 없습니다' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: { message: '인증 실패' } });

    // 2. 요청 데이터 추출
    const { email, name } = req.body;
    
    if (!email?.trim() || !name?.trim()) {
      return res.status(400).json({ error: { message: '이메일과 이름은 필수입니다' } });
    }

    // 3. 백엔드 DB에 사용자 정보 저장
    const { data: savedUser, error: userError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: email.trim(),
        name: name.trim()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (userError) {
      return res.status(500).json({ error: { message: '사용자 정보 저장 실패' } });
    }

    return res.status(201).json({
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      created_at: savedUser.created_at
    });

  } catch (err) {
    console.error('사용자 등록 에러:', err);
    return res.status(500).json({ error: { message: '서버 오류' } });
  }
});
```

---

### Phase 1: 데이터베이스 스키마 확인

#### ❌ 필요한 테이블 구조 (groups 테이블)
```sql
-- 추가할 컬럼
ALTER TABLE groups ADD COLUMN admin_name VARCHAR(255);
ALTER TABLE groups ADD COLUMN admin_email VARCHAR(255);

-- 또는 새로 생성하는 경우
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  admin_name VARCHAR(255),      -- ← 추가됨
  admin_email VARCHAR(255),     -- ← 추가됨
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### ❓ Supabase 프로필 테이블 확인
프론트에서 사용자 이름을 `auth.user.user_metadata.name`에 저장하므로, 
백엔드에서는 Supabase JWT를 디코딩하여 이름 정보 확인 가능:

```javascript
const token = req.headers.authorization.split(' ')[1];
const { data: { user }, error } = await supabase.auth.getUser(token);
const userName = user?.user_metadata?.name || user?.email?.split('@')[0];
```

---

### Phase 2: POST /api/groups 수정

#### 💻 구현 코드 예시 (Node.js + Express)

```javascript
// POST /api/groups
router.post('/api/groups', async (req, res) => {
  try {
    // 1. 인증 검증
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: { message: '토큰이 없습니다' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: { message: '인증 실패' } });

    // 2. 요청 데이터 추출
    const { name, admin_name } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: { message: '그룹 이름은 필수입니다' } });
    }

    // 3. 그룹 생성
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        admin_name: admin_name?.trim() || user.email.split('@')[0],  // admin_name 저장
        admin_email: user.email,
        created_by: user.id
      })
      .select()
      .single();

    if (groupError) {
      return res.status(500).json({ error: { message: '그룹 생성 실패' } });
    }

    // 4. Admin을 자동으로 group_members에 추가
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
        name: admin_name?.trim() || user.email.split('@')[0],
        position: '관리자'
      });

    if (memberError) {
      console.error('Admin 추가 실패:', memberError);
      // 그룹은 생성되었으므로 계속 진행
    }

    // 5. 그룹 정보와 멤버 반환
    const { data: members } = await supabase
      .from('group_members')
      .select('*, users(name, email)')
      .eq('group_id', group.id);

    return res.status(201).json({
      ...group,
      members: members || []
    });

  } catch (err) {
    console.error('그룹 생성 에러:', err);
    return res.status(500).json({ error: { message: '서버 오류' } });
  }
});
```

---

### Phase 3: GET /api/groups 수정 (선택사항)

그룹 목록 조회 시에도 `admin_name` 필드 포함:

```javascript
// GET /api/groups
router.get('/api/groups', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: { message: '토큰이 없습니다' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: { message: '인증 실패' } });

    // ✨ admin_name 필드 포함
    const { data: groups, error } = await supabase
      .from('groups')
      .select('id, name, admin_name, admin_email, created_at, member_count')
      .in('id', (
        await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
      ).data.map(m => m.group_id));

    if (error) {
      return res.status(500).json({ error: { message: '조회 실패' } });
    }

    return res.status(200).json(groups || []);

  } catch (err) {
    console.error('그룹 조회 에러:', err);
    return res.status(500).json({ error: { message: '서버 오류' } });
  }
});
```

---

### Phase 4: 사용자 프로필 테이블 생성 (선택사항)

Supabase `auth.user.user_metadata.name` 대신 전용 프로필 테이블 사용하려면:

```sql
-- 프로필 테이블
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 트리거: 사용자 생성 시 프로필 자동 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name'
  );
  RETURN new;
END;
$$;
```

---

## 📝 구현 순서

1. ✅ **프론트**: 회원가입 폼에 이름 필드 추가 - **완료**
2. ✅ **프론트**: 그룹 생성 시 admin_name 전송 - **완료**
3. ✅ **프론트**: 회원가입 후 POST /api/users 호출 - **완료**
4. ⏳ **DB**: users 테이블 생성 (이메일, 이름 저장)
5. ⏳ **API**: POST /api/users 엔드포인트 구현
6. ⏳ **DB**: groups 테이블에 admin_name, admin_email 컬럼 추가
7. ⏳ **API**: POST /api/groups에서 admin_name 받기 및 저장
8. ⏳ **API**: 그룹 생성 시 admin을 group_members에 자동 추가
9. ⏳ **API**: GET /api/groups에 admin_name 필드 포함
10. ⏳ **테스트**: 회원가입 후 users 테이블에 저장 확인
11. ⏳ **테스트**: 그룹 생성 후 admin_name 확인

---

## 🔍 수정 영향도

### 변경 범위
- **테이블**: groups 테이블 (admin_name, admin_email 추가)
- **API 엔드포인트**: 
  - POST /api/groups (요청/응답 형식 변경)
  - GET /api/groups (응답에 admin_name 추가)
  - GET /api/groups/:id (응답에 admin_name 추가)

### 기존 데이터 마이그레이션
```sql
-- 기존 그룹에 admin_name 설정 (선택사항)
UPDATE groups
SET admin_name = (
  SELECT name FROM group_members 
  WHERE group_members.group_id = groups.id 
  AND group_members.role = 'admin'
  LIMIT 1
)
WHERE admin_name IS NULL;
```

---

## ✨ 완료 체크리스트

- [ ] users 테이블 생성 (id, email, name, created_at)
- [ ] POST /api/users 엔드포인트 구현
- [ ] 회원가입 테스트: users 테이블에 이메일과 이름 저장 확인
- [ ] groups 테이블에 admin_name, admin_email 컬럼 추가
- [ ] POST /api/groups에서 admin_name 받아서 저장
- [ ] 그룹 생성 시 admin을 group_members에 자동 추가 (role='admin')
- [ ] GET /api/groups 응답에 admin_name 포함
- [ ] GET /api/groups/:id 응답에 admin_name 포함
- [ ] 로컬 테스트: 회원가입 후 users 테이블 확인
- [ ] 로컬 테스트: 그룹 생성 후 목록에서 admin 이름 확인
- [ ] 로컬 테스트: 그룹 상세 페이지에서 admin 표시 확인 (👑)

---

## 🚀 테스트 순서

### 1단계: 로컬 테스트 시작
```bash
# 백엔드
npm run dev  # localhost:4000

# 프론트
npm run dev  # localhost:3000
```

### 2단계: 회원가입 테스트 ⭐ (새로 추가)
- 이름: "테스트사용자"
- 이메일: "test@example.com"
- 비밀번호: "test1234"
- **확인**: users 테이블에 이메일과 이름 저장됨
- **예상 결과**: 
  ```sql
  SELECT * FROM users WHERE email = 'test@example.com';
  -- id, email: test@example.com, name: 테스트사용자, created_at: ...
  ```

### 3단계: 로그인 테스트
- 이메일: "test@example.com"
- 비밀번호: "test1234"
- 성공하면 대시보드로 이동

### 4단계: 그룹 생성 테스트
- 그룹 이름: "테스트그룹"
- 예상 결과: 
  - admin_name = "테스트사용자"
  - groups 테이블: admin_name 저장됨
  - group_members 테이블: admin 역할로 자동 추가

### 5단계: 그룹 상세 확인
- 멤버 목록에서 "테스트사용자 👑 / 관리자" 표시 확인
- 그룹 정보에 "관리자: 테스트사용자" 표시 확인

---

## 📞 질문 사항

Q: 프로필 테이블을 따로 만들어야 하나?
A: 선택사항입니다. Supabase `auth.user.user_metadata.name`으로도 충분하지만, 
   추후 프로필 확장성을 위해서는 전용 테이블 권장

Q: 기존 그룹의 admin은?
A: admin_name이 NULL이면 프론트에서 이메일 앞부분 사용하거나, 
   마이그레이션 쿼리로 group_members의 admin 이름으로 채우기

Q: 여러 admin이 있는 경우?
A: 현재는 그룹 생성자만 admin, 나머지는 member
   추후 role='admin'인 멤버를 모두 표시하도록 확장 가능

---

## 🎯 최종 결과 이미지

```
그룹 상세 화면:
┌──────────────────────┐
│ 테스트그룹            │
│ 생성일: 2026.8.15     │
│ 관리자: 테스트사용자  │  ← 추가됨
│                      │
│ 멤버 (2명)           │
│ ┌──────────────────┐ │
│ │테스트사용자 👑   │ │
│ │관리자            │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │홍길동            │ │
│ │회장              │ │
│ └──────────────────┘ │
└──────────────────────┘
```

---

**작성일**: 2026-08-15
**프론트 수정**: 완료
**백엔드 대기**: 구현 필요
