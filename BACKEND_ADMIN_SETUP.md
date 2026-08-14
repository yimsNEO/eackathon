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

### Phase 2-1: 멤버 추가 API 구현 (✨ 새로 추가됨)

#### ✨ 새로운 요청 형식 (이름 필드 제거!)
```json
{
  "email": "park@gmail.com",
  "position": "부회장"
}
```

#### 📊 응답 형식
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "email": "park@gmail.com",
  "name": "박준영",  // ← 백엔드에서 users 테이블에서 조회해서 반환
  "position": "부회장",
  "users": { "name": "박준영", "email": "park@gmail.com" }
}
```

#### 💻 구현 코드 예시 (Node.js + Express)

```javascript
// POST /api/groups/:groupId/members (멤버 추가 - 이메일로 사용자 조회)
router.post('/api/groups/:groupId/members', async (req, res) => {
  try {
    // 1. 인증 검증
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: { message: '토큰이 없습니다' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: { message: '인증 실패' } });

    // 2. 권한 검증: 그룹 생성자만 멤버 추가 가능
    const { groupId } = req.params;
    const { data: group } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (!group || group.created_by !== user.id) {
      return res.status(403).json({ error: { message: '그룹 관리 권한이 없습니다' } });
    }

    // 3. 요청 데이터 추출
    const { email, position } = req.body;
    
    if (!email?.trim() || !position?.trim()) {
      return res.status(400).json({ error: { message: '이메일과 직책은 필수입니다' } });
    }

    // 4. ✨ users 테이블에서 사용자 정보 조회 (이메일로 찾기)
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: { message: '해당 이메일의 사용자가 없습니다. 먼저 회원가입을 해야 합니다.' } });
    }

    // 5. group_members에 멤버 추가
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: targetUser.id,
        role: 'member',
        name: targetUser.name,  // ← users 테이블에서 조회한 이름 사용
        position: position.trim()
      })
      .select('*, users(name, email)')
      .single();

    if (memberError) {
      return res.status(500).json({ error: { message: '멤버 추가 실패' } });
    }

    return res.status(201).json({
      id: member.id,
      user_id: member.user_id,
      email: targetUser.email,
      name: targetUser.name,
      position: member.position,
      users: { name: targetUser.name, email: targetUser.email }
    });

  } catch (err) {
    console.error('멤버 추가 에러:', err);
    return res.status(500).json({ error: { message: '서버 오류' } });
  }
});
```

---

### Phase 3: GET /api/groups 수정 (⭐ 중요: 멤버인 그룹 포함!)

그룹 목록 조회 시 **사용자가 생성한 그룹 + 멤버로 추가된 그룹** 모두 반환:

```javascript
// GET /api/groups (⭐ 사용자가 속한 모든 그룹 반환!)
router.get('/api/groups', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: { message: '토큰이 없습니다' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: { message: '인증 실패' } });

    // ✨ 사용자가 멤버인 모든 그룹 조회 (생성자 포함)
    // 중요: group_members에 사용자가 있으면 반환되어야 함!
    const { data: groups, error } = await supabase
      .from('groups')
      .select('id, name, admin_name, admin_email, created_at')
      .in('id', (
        await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
      ).data?.map(m => m.group_id) || []);

    if (error) {
      console.error('그룹 조회 에러:', error);
      return res.status(500).json({ error: { message: '조회 실패' } });
    }

    // ⭐ 각 그룹의 멤버 수 계산
    const groupsWithMemberCount = await Promise.all(
      (groups || []).map(async (group) => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact' })
          .eq('group_id', group.id);
        
        return { ...group, member_count: count || 0 };
      })
    );

    return res.status(200).json(groupsWithMemberCount || []);

  } catch (err) {
    console.error('그룹 조회 에러:', err);
    return res.status(500).json({ error: { message: '서버 오류' } });
  }
});
```

**⚠️ 주의사항:**
- group_members 테이블에 사용자가 멤버로 등록되어야만 그룹이 조회됨
- 멤버 추가 시 반드시 group_members에 레코드 생성해야 함
- "멤버가 0명"으로 표시되는 문제는 group_members 조회 실패일 가능성 높음

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
4. ✅ **프론트**: 멤버 추가 시 이름 필드 제거, 이메일+직책만 입력 - **완료** ⭐ NEW
5. ⏳ **DB**: users 테이블 생성 (이메일, 이름 저장)
6. ⏳ **API**: POST /api/users 엔드포인트 구현
7. ⏳ **DB**: groups 테이블에 admin_name, admin_email 컬럼 추가
8. ⏳ **API**: POST /api/groups에서 admin_name 받기 및 저장
9. ⏳ **API**: 그룹 생성 시 admin을 group_members에 자동 추가
10. ⏳ **API**: POST /api/groups/:id/members 구현 (이메일로 사용자 조회) ⭐ NEW
11. ⏳ **API**: GET /api/groups 수정 (멤버인 그룹 모두 반환) ⭐ IMPORTANT
12. ⏳ **테스트**: 회원가입 후 users 테이블에 저장 확인
13. ⏳ **테스트**: 멤버 추가 후 group_members에 저장 확인 ⭐ NEW
14. ⏳ **테스트**: 멤버로 추가된 사용자 로그인 시 그룹 보이는지 확인 ⭐ NEW

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
- [ ] ⭐ POST /api/groups/:id/members 구현 (이메일로 users 테이블 조회)
- [ ] ⭐ POST /api/groups/:id/members에서 멤버 추가 후 group_members 저장
- [ ] ⭐ GET /api/groups에서 사용자가 멤버인 모든 그룹 반환
- [ ] ⭐ 멤버 추가 후 멤버 수(member_count) 제대로 계산되는지 확인
- [ ] GET /api/groups 응답에 admin_name 포함
- [ ] GET /api/groups/:id 응답에 admin_name 포함
- [ ] 로컬 테스트: 회원가입 후 users 테이블 확인
- [ ] 로컬 테스트: 그룹 생성 후 목록에서 admin 이름 확인
- [ ] 로컬 테스트: 그룹 상세 페이지에서 admin 표시 확인 (👑)
- [ ] ⭐ 로컬 테스트: 멤버 추가 후 그룹 멤버 목록에서 이메일과 직책만 표시 확인
- [ ] ⭐ 로컬 테스트: 멤버로 추가된 사용자 로그인 후 그룹이 보이는지 확인
- [ ] ⭐ 로컬 테스트: 멤버로 추가된 사용자 로그인 후 그룹 멤버 수가 0이 아닌지 확인

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

### 6단계: 멤버 추가 테스트 ⭐ (새로 추가)
**계정 1 (관리자: 서재욱) 에서:**
- 그룹 상세 페이지에서 "멤버 추가" 클릭
- 이메일: "park@example.com" (새 계정이 필요함)
- 직책: "부회장"
- **확인**: group_members 테이블에 저장됨
  ```sql
  SELECT * FROM group_members WHERE email = 'park@example.com';
  -- email, position: 부회장, name: (users 테이블에서 조회)
  ```

### 7단계: 멤버 계정으로 로그인 테스트 ⭐ (중요!)
**계정 2 (멤버: 박준영) 에서:**
1. 로그인: "park@example.com" / "password"
2. **확인 사항**:
   - [ ] 대시보드에서 "테스트그룹"이 보이는가? (멤버가 0명이 아닌가?)
   - [ ] 그룹 멤버 목록에서 "서재욱 👑 / 관리자"가 보이는가?
   - [ ] 그룹 멤버 목록에서 "박준영 / 부회장"이 보이는가?
3. **문제 해결**:
   - 그룹이 안 보임 → GET /api/groups 로직 확인 (group_members 조회 실패?)
   - 멤버가 0명 → member_count 계산 로직 확인
   - 이름이 안 보임 → users 테이블 조회 로직 확인

---

## 📞 질문 사항

Q: 멤버 추가 시 이름을 입력하는 이유는?
A: ❌ 더 이상 입력받지 않습니다. 이메일과 직책만 입력받고, 백엔드에서 이메일로 users 테이블에서 사용자 정보(이름)를 자동으로 조회합니다.

Q: "멤버가 0명"으로 표시되는 이유는?
A: 여러 가지 원인이 있을 수 있습니다:
   1. GET /api/groups에서 group_members 조회 실패
   2. member_count 계산이 제대로 안 됨
   3. 멤버 추가 후 group_members 테이블에 저장되지 않음
   
   **디버깅 방법**:
   - 백엔드 로그 확인
   - group_members 테이블 직접 확인: `SELECT * FROM group_members WHERE group_id = '...';`
   - GET /api/groups/:id/members API 응답 확인

Q: 프로필 테이블을 따로 만들어야 하나?
A: 선택사항입니다. Supabase `auth.user.user_metadata.name`으로도 충분하지만, 
   추후 프로필 확장성을 위해서는 전용 테이블 권장

Q: 여러 admin이 있는 경우?
A: 현재는 그룹 생성자만 admin, 나머지는 member
   추후 role='admin'인 멤버를 모두 표시하도록 확장 가능

---

## 📋 회의록 (Meetings) API 가이드

프론트엔드에서 회의록 추가, 조회, 수정, AI 요약 생성 기능을 구현했습니다.

### API 엔드포인트 목록

| 메서드 | 엔드포인트 | 설명 |
| --- | --- | --- |
| GET | /api/meetings | 회의록 목록 조회 |
| POST | /api/meetings | 새 회의록 생성 |
| GET | /api/meetings/:meetingId | 회의록 상세 조회 |
| PATCH | /api/meetings/:meetingId | 회의 원문 수정 |
| POST | /api/meetings/:meetingId/generate | AI 요약 생성 (LLM 호출) |
| DELETE | /api/meetings/:meetingId | 회의록 삭제 |

---

### 1️⃣ GET /api/meetings - 회의록 목록 조회

#### 📊 요청
```
GET /api/meetings?groupId=uuid (선택)
Authorization: Bearer <JWT>
```

#### 📊 응답 (200 OK)
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

### 2️⃣ POST /api/meetings - 새 회의록 생성

#### ✨ 요청
```json
{
  "group_id": "uuid",
  "title": "정기 임원진 회의",
  "meeting_date": "2026-08-15"
}
```

#### 📊 응답 (201 Created)
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

### 3️⃣ GET /api/meetings/:meetingId - 회의록 상세 조회

#### 📊 요청
```
GET /api/meetings/:meetingId
Authorization: Bearer <JWT>
```

#### 📊 응답 (200 OK)
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

### 4️⃣ PATCH /api/meetings/:meetingId - 회의 원문 수정

#### ✨ 요청
```json
{
  "raw_content": "수정된 회의 내용..."
}
```

#### 📊 응답 (200 OK)
```json
{
  "id": "uuid",
  "raw_content": "수정된 회의 내용..."
}
```

---

### 5️⃣ POST /api/meetings/:meetingId/generate - AI 요약 생성 (LLM)

#### ⭐ 핵심 기능: OpenAI GPT-4o-mini 호출

#### 📊 요청
```
POST /api/meetings/:meetingId/generate
Authorization: Bearer <JWT>
Body: 없음 (이미 저장된 raw_content와 meeting_attendees 사용)
```

#### 📊 응답 (200 OK)
```json
{
  "meeting_id": "uuid",
  "generated": true,
  "agenda_items": [
    {
      "id": "uuid",
      "content": "예산안 초안 승인",
      "status": "confirmed"
    },
    {
      "id": "uuid",
      "content": "홍보 포스터 시안 최종 선택",
      "status": "needs_opinion"
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

#### 💻 구현 코드 예시 (Node.js + Express + OpenAI)

```javascript
const OpenAI = require('openai').default;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// POST /api/meetings/:meetingId/generate
router.post('/api/meetings/:meetingId/generate', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: { message: '토큰이 없습니다' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: { message: '인증 실패' } });

    const { meetingId } = req.params;

    // 1. 회의록 조회
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return res.status(404).json({ error: { message: '회의록이 없습니다' } });
    }

    // 2. 권한 검증 (그룹 멤버 확인)
    const { data: isMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', meeting.group_id)
      .eq('user_id', user.id)
      .single();

    if (!isMember) {
      return res.status(403).json({ error: { message: '그룹 멤버가 아닙니다' } });
    }

    // 3. raw_content 확인
    if (!meeting.raw_content?.trim()) {
      return res.status(400).json({ error: { message: '회의 원문이 비어있습니다' } });
    }

    // 4. OpenAI API 호출
    const prompt = \`다음은 회의록입니다. 확정 안건, 의견 필요 안건, 할 일을 JSON 형식으로 분류해주세요.

회의록:
\${meeting.raw_content}

다음 JSON 형식으로 응답하세요:
{
  "agenda_items": [
    { "content": "안건 내용", "status": "confirmed" 또는 "needs_opinion" }
  ],
  "tasks": [
    { "title": "할일 내용", "due_date": "YYYY-MM-DD" }
  ]
}\`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.5
    });

    const responseText = completion.choices[0].message.content;
    const parsed = JSON.parse(responseText);

    // 5. 데이터베이스에 저장
    // 안건 저장
    const agendaPromises = (parsed.agenda_items || []).map(item =>
      supabase.from('agenda_items').insert({
        meeting_id: meetingId,
        content: item.content,
        status: item.status || 'confirmed'
      })
    );

    // 할일 저장
    const taskPromises = (parsed.tasks || []).map(task =>
      supabase.from('tasks').insert({
        meeting_id: meetingId,
        title: task.title,
        due_date: task.due_date || null,
        status: 'pending'
      })
    );

    // meetings 테이블 generated = true로 업데이트
    await supabase
      .from('meetings')
      .update({ generated: true })
      .eq('id', meetingId);

    await Promise.all([...agendaPromises, ...taskPromises]);

    // 6. 생성된 데이터 반환
    const { data: agendaItems } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('meeting_id', meetingId);

    return res.status(200).json({
      meeting_id: meetingId,
      generated: true,
      agenda_items: agendaItems || [],
      tasks: tasks || []
    });

  } catch (err) {
    console.error('AI 요약 생성 에러:', err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ 
        error: { 
          message: 'OpenAI 응답 파싱 실패. 다시 시도해주세요.',
          retry: true
        } 
      });
    }
    return res.status(500).json({ error: { message: '서버 오류' } });
  }
});
```

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
