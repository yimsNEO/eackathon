const supabase = require('../db');

async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' } });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } });
  }

  req.user = user; // 라우터에서 req.user.id 로 사용자 정보 사용
  next();
}

module.exports = authenticateUser;
```[cite: 2]

---

**4. OpenAI AI 요약 연동 코드 (`routes/meetings.js` 내 적용)**

가이드 규격에 맞춰 경로를 `minutes`에서 `meetings`로 변경하고 실시간 OpenAI 요약을 연동합니다[cite: 2].

```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authenticateUser = require('../middleware/auth');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// AI 요약 생성 (POST /api/meetings/:meetingId/generate)
router.post('/:meetingId/generate', authenticateUser, async (req, res) => {
  const { meetingId } = req.params;

  // 1. 회의 원문 가져오기
  const { data: meeting, error: mErr } = await supabase
const supabase = require('../db');

async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' } });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } });
  }

  req.user = user; // 라우터에서 req.user.id 로 사용자 정보 사용
  next();
}

module.exports = authenticateUser;