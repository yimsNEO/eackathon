const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authenticateUser = require('../middleware/auth');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GET /api/meetings - 회의록 목록 조회
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { group_id } = req.query;
    const userId = req.user.id;

    let query = supabase
      .from('meetings')
      .select(`
        id,
        title,
        meeting_date,
        group_id,
        created_by,
        raw_content,
        ai_summary,
        generated,
        status,
        created_at,
        updated_at,
        meeting_attendees (
          id,
          user_id,
          users ( id, name, position, avatar_url )
        )
      `);

    // groupId 필터가 있으면 적용
    if (group_id) {
      query = query.eq('group_id', group_id);
    }

    const { data: meetings, error } = await query;

    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

    // 권한 검증: 사용자가 그룹 멤버인지 확인
    const validMeetings = [];
    for (const meeting of meetings) {
      const { data: member, error: mErr } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', meeting.group_id)
        .eq('user_id', userId)
        .single();

      if (!mErr && member) {
        validMeetings.push(meeting);
      }
    }

    res.json(validMeetings);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/meetings - 새 회의록 생성
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { title, group_id, meeting_date, raw_content, attendee_ids } = req.body;
    const userId = req.user.id;

    // 그룹 멤버 검증
    const { data: member, error: mErr } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', userId)
      .single();

    if (mErr || !member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '이 그룹에 접근 권한이 없습니다.' } });
    }

    // 회의록 생성
    const { data: meeting, error: cErr } = await supabase
      .from('meetings')
      .insert([{
        title,
        group_id,
        meeting_date,
        raw_content: raw_content || '',
        created_by: userId,
        generated: false,
        status: 'created'
      }])
      .select()
      .single();

    if (cErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: cErr.message } });

    // 참석자 추가
    if (attendee_ids && attendee_ids.length > 0) {
      const attendees = attendee_ids.map(user_id => ({
        meeting_id: meeting.id,
        user_id
      }));

      await supabase
        .from('meeting_attendees')
        .insert(attendees);
    }

    res.status(201).json(meeting);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/meetings/:meetingId - 회의록 상세 조회
router.get('/:meetingId', authenticateUser, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        meeting_date,
        group_id,
        created_by,
        raw_content,
        ai_summary,
        generated,
        status,
        created_at,
        updated_at,
        meeting_attendees (
          id,
          user_id,
          users ( id, name, position, avatar_url )
        ),
        agenda_items (
          id,
          title,
          status,
          created_at
        ),
        tasks (
          id,
          title,
          assigned_to,
          status,
          due_date,
          created_at
        )
      `)
      .eq('id', meetingId)
      .single();

    if (error || !meeting) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '회의를 찾을 수 없습니다.' } });
    }

    // 그룹 멤버 검증
    const { data: member, error: mErr } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', meeting.group_id)
      .eq('user_id', userId)
      .single();

    if (mErr || !member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '이 회의에 접근 권한이 없습니다.' } });
    }

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/meetings/:meetingId - 회의록 수정
router.patch('/:meetingId', authenticateUser, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { raw_content, attendee_ids } = req.body;
    const userId = req.user.id;

    // 회의 존재 확인
    const { data: meeting, error: fErr } = await supabase
      .from('meetings')
      .select('group_id, created_by')
      .eq('id', meetingId)
      .single();

    if (fErr || !meeting) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '회의를 찾을 수 없습니다.' } });
    }

    // 그룹 멤버 검증
    const { data: member, error: mErr } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', meeting.group_id)
      .eq('user_id', userId)
      .single();

    if (mErr || !member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '이 회의를 수정할 권한이 없습니다.' } });
    }

    // 회의록 업데이트
    const updateData = {};
    if (raw_content !== undefined) updateData.raw_content = raw_content;

    const { data: updated, error: uErr } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', meetingId)
      .select()
      .single();

    if (uErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: uErr.message } });

    // 참석자 업데이트
    if (attendee_ids !== undefined) {
      // 기존 참석자 삭제
      await supabase
        .from('meeting_attendees')
        .delete()
        .eq('meeting_id', meetingId);

      // 새 참석자 추가
      if (attendee_ids.length > 0) {
        const attendees = attendee_ids.map(user_id => ({
          meeting_id: meetingId,
          user_id
        }));

        await supabase
          .from('meeting_attendees')
          .insert(attendees);
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /api/meetings/:meetingId - 회의록 삭제
router.delete('/:meetingId', authenticateUser, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    // 회의 존재 확인
    const { data: meeting, error: fErr } = await supabase
      .from('meetings')
      .select('group_id, created_by')
      .eq('id', meetingId)
      .single();

    if (fErr || !meeting) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '회의를 찾을 수 없습니다.' } });
    }

    // 그룹 멤버 검증
    const { data: member, error: mErr } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', meeting.group_id)
      .eq('user_id', userId)
      .single();

    if (mErr || !member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '이 회의를 삭제할 권한이 없습니다.' } });
    }

    // 회의록 삭제
    const { error: dErr } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (dErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: dErr.message } });

    res.json({ message: '회의가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/meetings/:meetingId/generate - AI 요약 생성
router.post('/:meetingId/generate', authenticateUser, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    // 회의 존재 확인
    const { data: meeting, error: mErr } = await supabase
      .from('meetings')
      .select('raw_content, group_id')
      .eq('id', meetingId)
      .single();

    if (mErr || !meeting) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '회의를 찾을 수 없습니다.' } });
    }

    // 그룹 멤버 검증
    const { data: member, error: mErr2 } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', meeting.group_id)
      .eq('user_id', userId)
      .single();

    if (mErr2 || !member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '이 회의를 수정할 권한이 없습니다.' } });
    }

    // 2. OpenAI 호출
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '회의록 원문을 분석하여 JSON 형식으로 summary, agendas(배열), tasks(배열)를 추출하세요.' },
        { role: 'user', content: meeting.raw_content }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // 3. DB 업데이트
    const { data: updated, error: uErr } = await supabase
      .from('meetings')
      .update({ ai_summary: result.summary, generated: true, status: 'summarized' })
      .eq('id', meetingId)
      .select()
      .single();

    if (uErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: uErr.message } });

    // 4. agenda_items 저장
    if (result.agendas && result.agendas.length > 0) {
      const agendas = result.agendas.map(agenda => ({
        meeting_id: meetingId,
        title: agenda.title || agenda,
        status: 'pending'
      }));

      await supabase
        .from('agenda_items')
        .insert(agendas);
    }

    // 5. tasks 저장
    if (result.tasks && result.tasks.length > 0) {
      const tasks = result.tasks.map(task => ({
        meeting_id: meetingId,
        title: task.title || task,
        status: 'pending'
      }));

      await supabase
        .from('tasks')
        .insert(tasks);
    }

    res.json({ message: '요약 완료', result, meeting: updated });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;