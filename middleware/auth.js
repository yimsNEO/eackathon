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

  req.user = user;
  next();
}

module.exports = authenticateUser;
