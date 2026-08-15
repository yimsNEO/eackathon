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
        generated,
        created_at,
        meeting_attendees (
          user_id,
          users:profiles!meeting_attendees_user_id_fkey ( id, name, avatar_url )
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
        .select('user_id')
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
    const { group_id, title, meeting_date, raw_content = '', attendee_ids = [] } = req.body;
    const userId = req.user.id;

    if (!group_id || !title || !meeting_date) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'group_id, title, meeting_date는 필수입니다.' } });
    }
    if (!Array.isArray(attendee_ids)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'attendee_ids는 배열이어야 합니다.' } });
    }

    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group_id)
      .eq('user_id', userId)
      .single();
    if (memberError || !member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '이 그룹에 접근 권한이 없습니다.' } });
    }

    const { data: meeting, error: createError } = await supabase
      .from('meetings')
      .insert([{ title, group_id, meeting_date, raw_content, created_by: userId, generated: false }])
      .select()
      .single();
    if (createError) return res.status(500).json({ error: { code: 'DB_ERROR', message: createError.message } });

    if (attendee_ids.length) {
      const attendees = attendee_ids.map((user_id) => ({ meeting_id: meeting.id, user_id }));
      const { error: attendeesError } = await supabase.from('meeting_attendees').insert(attendees);
      if (attendeesError) return res.status(500).json({ error: { code: 'DB_ERROR', message: attendeesError.message } });
    }

    res.status(201).json({
      id: meeting.id,
      title: meeting.title,
      group_id: meeting.group_id,
      meeting_date: meeting.meeting_date,
      raw_content: meeting.raw_content,
      generated: meeting.generated
    });
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
        generated,
        created_at,
        meeting_attendees (
          user_id,
          users:profiles!meeting_attendees_user_id_fkey ( id, name, avatar_url )
        ),
        agenda_items (
          id,
          content,
          status,
          created_at,
          agenda_opinions (
            id,
            user_id,
            opinion,
            created_at,
            profile:profiles!agenda_opinions_user_id_fkey ( id, name, avatar_url )
          ),
        ),
        tasks (
          id,
          text,
          assignee_id,
          done,
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
      .select('user_id')
      .eq('group_id', meeting.group_id)
      .eq('user_id', userId)
      .single();

    if (mErr || !member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '이 회의에 접근 권한이 없습니다.' } });
    }

    res.json({
      ...meeting,
      agenda_items: (meeting.agenda_items || []).map((agenda) => ({
        ...agenda,
        agenda_opinions: (agenda.agenda_opinions || []).map((assignment) => ({
          ...assignment,
          opinion_status: assignment.opinion === null ? 'pending' : 'submitted'
        }))
      }))
    });
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
      .select('user_id')
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
      .select('user_id')
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
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('raw_content, group_id')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '회의를 찾을 수 없습니다.' } });
    if (!meeting.raw_content || !meeting.raw_content.trim()) return res.status(400).json({ error: { code: 'EMPTY_RAW_CONTENT', message: '회의 원문을 입력한 뒤 요약을 생성해 주세요.' } });

    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', meeting.group_id)
      .eq('user_id', userId)
      .single();
    if (memberError || !member) return res.status(403).json({ error: { code: 'FORBIDDEN', message: '이 회의에 접근할 권한이 없습니다.' } });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: { code: 'OPENAI_NOT_CONFIGURED', message: 'OPENAI_API_KEY가 설정되지 않았습니다.' } });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '당신은 한국어 회의록 분석기입니다. 원문에 명시된 사실만 추출하세요. 확정된 결정은 confirmed, 추가 논의·확인·선발·결정이 필요한 항목은 needs_opinion으로 분류하세요. 할 일 담당자는 원문에 나온 이름을 쉼표로 연결해 assignee_name에 넣고, 담당자가 없으면 null로 두세요.' },
        { role: 'user', content: meeting.raw_content }
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'meeting_minutes', strict: true, schema: { type: 'object', additionalProperties: false, required: ['agenda_items', 'tasks'], properties: { agenda_items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['content', 'status'], properties: { content: { type: 'string' }, status: { type: 'string', enum: ['confirmed', 'needs_opinion'] } } } }, tasks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'assignee_name'], properties: { text: { type: 'string' }, assignee_name: { type: ['string', 'null'] } } } } } } } }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned an empty response.');
    const result = JSON.parse(content);
    const { data: groupMembers, error: groupMembersError } = await supabase.from('group_members').select('user_id, name').eq('group_id', meeting.group_id);
    if (groupMembersError) return res.status(500).json({ error: { code: 'DB_ERROR', message: groupMembersError.message } });

    const memberByName = new Map(groupMembers.map(({ name, user_id }) => [name.trim(), user_id]));
    const agendasToInsert = result.agenda_items.map((agenda) => ({ meeting_id: meetingId, content: agenda.content, status: agenda.status }));
    const taskEntries = result.tasks.flatMap((task) => {
      const assigneeNames = task.assignee_name
        ? task.assignee_name.split(',').map((name) => name.trim()).filter(Boolean)
        : [null];
      return assigneeNames.map((assignee_name) => ({ ...task, assignee_name }));
    });
    const validTaskEntries = taskEntries.filter((task) => !task.assignee_name || memberByName.has(task.assignee_name));
    const tasksToInsert = validTaskEntries.map((task) => ({ meeting_id: meetingId, text: task.text, assignee_id: task.assignee_name ? memberByName.get(task.assignee_name) : null, done: false }));

    let savedAgendas = [];
    if (agendasToInsert.length) {
      const { data, error } = await supabase.from('agenda_items').insert(agendasToInsert).select('id, content, status');
      if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
      savedAgendas = data;
    }
    const { data: attendees, error: attendeesError } = await supabase
      .from('meeting_attendees')
      .select('user_id')
      .eq('meeting_id', meetingId);
    if (attendeesError) return res.status(500).json({ error: { code: 'DB_ERROR', message: attendeesError.message } });

    const attendeeIds = new Set((attendees || []).map((attendee) => attendee.user_id));
    const opinionAssigneeIds = groupMembers
      .map((member) => member.user_id)
      .filter((memberId) => !attendeeIds.has(memberId));
    const opinionAssignmentsToInsert = savedAgendas
      .filter((agenda) => agenda.status === 'needs_opinion')
      .flatMap((agenda) => opinionAssigneeIds.map((user_id) => ({ agenda_item_id: agenda.id, user_id, opinion: null })));

    let savedOpinionAssignments = [];
    if (opinionAssignmentsToInsert.length) {
      const { data, error } = await supabase
        .from('agenda_opinions')
        .insert(opinionAssignmentsToInsert)
        .select('id, agenda_item_id, user_id, opinion, created_at');
      if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
      savedOpinionAssignments = data || [];
    }

    let savedTasks = [];
    if (tasksToInsert.length) {
      const { data, error } = await supabase.from('tasks').insert(tasksToInsert).select('id, text, assignee_id, done');
      if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
      savedTasks = data;
    }

    const { data: updatedMeeting, error: updateError } = await supabase
      .from('meetings')
      .update({ generated: true })
      .eq('id', meetingId)
      .select('id, generated')
      .single();
    if (updateError) return res.status(500).json({ error: { code: 'DB_ERROR', message: updateError.message } });

    res.json({
      meeting_id: updatedMeeting.id,
      generated: updatedMeeting.generated,
      agenda_items: savedAgendas,
      tasks: savedTasks.map((task, index) => ({ ...task, assignee_name: validTaskEntries[index].assignee_name }))
    });
  } catch (err) {
    const isInvalidJson = err instanceof SyntaxError;
    res.status(isInvalidJson ? 502 : 500).json({ error: { code: isInvalidJson ? 'AI_INVALID_RESPONSE' : 'AI_ERROR', message: 'AI 요약 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.' } });
  }
});
module.exports = router;
