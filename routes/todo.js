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
      meetings ( group_id, title, meeting_date ),
      assignee:profiles!tasks_assignee_id_fkey ( id, name, avatar_url )
    `);

  if (userId) {
    query = query.eq('assignee_id', userId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const groupIds = [...new Set((data || []).map((task) => task.meetings?.group_id).filter(Boolean))];
  if (!groupIds.length) return res.json((data || []).filter((task) => !task.assignee_id));

  const { data: memberships, error: membershipsError } = await supabase
    .from('group_members')
    .select('group_id, user_id')
    .in('group_id', groupIds);
  if (membershipsError) return res.status(500).json({ error: membershipsError.message });

  const memberKeys = new Set((memberships || []).map((member) => `${member.group_id}:${member.user_id}`));
  const visibleTasks = (data || []).filter((task) => {
    if (!task.assignee_id) return true;
    const groupId = task.meetings?.group_id;
    return Boolean(groupId && memberKeys.has(`${groupId}:${task.assignee_id}`));
  });

  res.json(visibleTasks);
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
