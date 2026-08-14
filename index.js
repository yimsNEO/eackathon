const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. 화면별 라우터 불러오기
const minutesRouter = require('./routes/minutes');
const groupRouter = require('./routes/group');
const calendarRouter = require('./routes/calender');
const todoRouter = require('./routes/todo');

const app = express();
const PORT = process.env.PORT || 5000;

// 2. 미들웨어 설정
app.use(cors());
app.use(express.json());

// 3. API 엔드포인트 연결
app.use('/api/minutes', minutesRouter);
app.use('/api/groups', groupRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/todos', todoRouter);

// 헬스체크용 기본 경로
app.get('/', (req, res) => {
  res.send('회의록 앱 백엔드 서버가 정상 작동 중입니다.');
});

// 4. 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 백엔드 서버 실행 중: http://localhost:${PORT}`);
});