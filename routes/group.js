const express = require('express');
const router = express.Router();
const supabase = require('../db');

// 그룹 목록 및 멤버 정보 조회
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_members (
        role,
        users ( id, name, position, avatar_url )
      )
    `);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 새 그룹 생성
router.post('/', async (req, res) => {
  const { name, created_by } = req.body;

  const { data, error } = await supabase
    .from('groups')
    .insert([{ name, created_by }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// 그룹에 멤버 추가
router.post('/:id/members', async (req, res) => {
  const { user_id, role } = req.body;

  const { data, error } = await supabase
    .from('group_members')
    .insert([{ group_id: req.params.id, user_id, role: role || 'member' }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

module.exports = router;
