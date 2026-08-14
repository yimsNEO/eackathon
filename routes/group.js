const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authenticateUser = require('../middleware/auth');

// GET /api/groups - 현재 사용자가 속한 그룹 목록 조회
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // 사용자가 속한 그룹 조회
    const { data: groups, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        groups (
          id,
          name,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

    // 형식 정리
    const result = groups.map(item => ({
      ...item.groups,
      role: item.role
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/groups - 새 그룹 생성
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    // 그룹 생성
    const { data: group, error: cErr } = await supabase
      .from('groups')
      .insert([{ name, created_by: userId }])
      .select()
      .single();

    if (cErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: cErr.message } });

    // 생성자를 group_members에 자동 등록
    const { error: mErr } = await supabase
      .from('group_members')
      .insert([{
        group_id: group.id,
        user_id: userId,
        role: 'admin'
      }]);

    if (mErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: mErr.message } });

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/groups/:id/members - 그룹에 멤버 추가
router.post('/:id/members', authenticateUser, async (req, res) => {
  try {
    const { user_id, role } = req.body;
    const groupId = req.params.id;
    const requesterId = req.user.id;

    // 요청자가 그룹 admin인지 확인
    const { data: requester, error: rErr } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', requesterId)
      .single();

    if (rErr || !requester || requester.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '그룹에 멤버를 추가할 권한이 없습니다.' } });
    }

    // 멤버 추가
    const { data, error } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id, role: role || 'member' }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;
