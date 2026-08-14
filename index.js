const express = require('express');
const cors = require('cors');
const os = require('os');
require('dotenv').config();

// 1. 화면별 라우터 불러오기
const meetingsRouter = require('./routes/meetings');
const groupRouter = require('./routes/group');
const calendarRouter = require('./routes/calender');
const todoRouter = require('./routes/todo');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

// 2. 미들웨어 설정
app.use(cors());
app.use(express.json());

// 3. API 엔드포인트 연결
app.use('/api/meetings', meetingsRouter);
app.use('/api/groups', groupRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/todos', todoRouter);
app.use('/api/users', usersRouter);

// 헬스체크용 기본 경로
app.get('/', (req, res) => {
  res.send('회의록 앱 백엔드 서버가 정상 작동 중입니다.');
});

// 4. 서버 실행
app.listen(PORT, '0.0.0.0', () => {
  // 현재 PC의 로컬 IP 주소 가져오기
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4 주소 찾기 (내부 네트워크)
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== 'localhost') break;
  }

  console.log(`🚀 백엔드 서버 실행 중:`);
  console.log(`   로컬: http://localhost:${PORT}`);
  console.log(`   네트워크: http://${localIP}:${PORT}`);
  console.log(`\n📝 다른 PC에서 접근할 때 사용할 주소: http://${localIP}:${PORT}`);
});