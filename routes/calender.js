const express = require('express');
const router = express.Router();
const supabase = require('../db');

// 캘린더 일정 목록 조회
router.get('/upcoming', async (req, res) => {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      groups ( name ),
      meetings ( title, status )
    `)
    .order('start_time', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
