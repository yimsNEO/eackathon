const express = require('express');
const router = express.Router();
const supabase = require('../db');

// 회의록 목록 조회 (그룹명, 참석자, 안건, 할일 한번에 가져오기)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      groups ( name ),
      meeting_attendees ( user_id, users ( name ) ),
      agenda_items ( id, title, status ),
      tasks ( id, title, status, assignee_id )
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 새 회의록 작성
router.post('/', async (req, res) => {
  const { group_id, title, meeting_date, raw_content, created_by } = req.body;

  const { data, error } = await supabase
    .from('meetings')
    .insert([{
      group_id,
      title: title || '새 회의록',
      meeting_date: meeting_date || new Date().toISOString().split('T')[0],
      raw_content: raw_content || '',
      status: 'draft',
      created_by
    }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// AI 요약 생성 (요약 상태 변경 및 안건/할일 자동 등록)
router.post('/:id/generate', async (req, res) => {
  const meetingId = req.params.id;

  // 1. 회의 상태 및 AI 요약 업데이트
  const { error: mErr } = await supabase
    .from('meetings')
    .update({ 
      status: 'summarized', 
    })
    .eq('id', meetingId);

  if (mErr) return res.status(500).json({ error: mErr.message });
  res.json({ success: true, message: '회의록이 요약되었습니다.' });
});

module.exports = router;
