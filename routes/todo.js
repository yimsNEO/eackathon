const express = require('express');
const router = express.Router();
const supabase = require('../db');

// 사용자별 할일 목록 조회
router.get('/', async (req, res) => {
  const userId = req.query.user_id;

  let query = supabase
    .from('tasks')
    .select(`
      *,
      meetings ( title, meeting_date ),
      users:assignee_id ( name )
    `);

  if (userId) {
    query = query.eq('assignee_id', userId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 할일 상태 변경 (todo -> done 토글)
router.patch('/:id/toggle', async (req, res) => {
  const { status } = req.body; // 'todo' | 'in_progress' | 'done'

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: status || 'done' })
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

module.exports = router;
