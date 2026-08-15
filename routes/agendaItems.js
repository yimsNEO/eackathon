const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authenticateUser = require('../middleware/auth');

function serializeAgenda(agenda) {
  return {
    ...agenda,
    agenda_opinions: (agenda.agenda_opinions || []).map((assignment) => ({
      ...assignment,
      opinion_status: assignment.opinion === null ? 'pending' : 'submitted'
    }))
  };
}

async function getAgendaForMember(agendaItemId, userId) {
  const { data: agenda, error: agendaError } = await supabase
    .from('agenda_items')
    .select('id, meeting_id, status, meetings!inner(group_id)')
    .eq('id', agendaItemId)
    .maybeSingle();

  if (agendaError) throw agendaError;
  if (!agenda) return { agenda: null, member: null };

  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', agenda.meetings.group_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError) throw memberError;
  return { agenda, member };
}

router.post('/', authenticateUser, async (req, res) => {
  try {
    const { meeting_id, content, status, opinion_user_ids, opinionUserIds } = req.body;
    const assigneeIds = opinion_user_ids ?? opinionUserIds ?? [];

    if (!meeting_id || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'meeting_id and content are required.' } });
    }
    if (!['confirmed', 'needs_opinion'].includes(status)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'status must be confirmed or needs_opinion.' } });
    }
    if (!Array.isArray(assigneeIds)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'opinion_user_ids must be an array.' } });
    }
    if (status !== 'needs_opinion' && assigneeIds.length) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Only needs_opinion agendas can have opinion assignees.' } });
    }

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('group_id')
      .eq('id', meeting_id)
      .maybeSingle();
    if (meetingError) throw meetingError;
    if (!meeting) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Meeting not found.' } });

    const { data: requester, error: requesterError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', meeting.group_id)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (requesterError) throw requesterError;
    if (!requester) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not a member of this meeting group.' } });

    const uniqueAssigneeIds = [...new Set(assigneeIds)];
    if (uniqueAssigneeIds.length) {
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', meeting.group_id)
        .in('user_id', uniqueAssigneeIds);
      if (membersError) throw membersError;
      if ((members || []).length !== uniqueAssigneeIds.length) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'All opinion assignees must be members of the meeting group.' } });
      }
    }

    const { data: agenda, error: agendaError } = await supabase
      .from('agenda_items')
      .insert([{ meeting_id, content: content.trim(), status }])
      .select('id, meeting_id, content, status, created_at')
      .single();
    if (agendaError) throw agendaError;

    let assignments = [];
    if (status === 'needs_opinion' && uniqueAssigneeIds.length) {
      const { data, error } = await supabase
        .from('agenda_opinions')
        .insert(uniqueAssigneeIds.map((user_id) => ({ agenda_item_id: agenda.id, user_id, opinion: null })))
        .select('id, agenda_item_id, user_id, opinion, created_at');
      if (error) throw error;
      assignments = data || [];
    }

    res.status(201).json(serializeAgenda({ ...agenda, agenda_opinions: assignments }));
  } catch (err) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: err.message } });
  }
});

router.get('/:agendaItemId', authenticateUser, async (req, res) => {
  try {
    const { agenda, member } = await getAgendaForMember(req.params.agendaItemId, req.user.id);
    if (!agenda) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agenda item not found.' } });
    if (!member) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not a member of this meeting group.' } });

    const { data, error } = await supabase
      .from('agenda_items')
      .select('id, meeting_id, content, status, created_at, agenda_opinions(id, user_id, opinion, created_at, profile:profiles!agenda_opinions_user_id_fkey(id, name, avatar_url))')
      .eq('id', req.params.agendaItemId)
      .single();
    if (error) throw error;

    res.json(serializeAgenda(data));
  } catch (err) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: err.message } });
  }
});

router.post('/:agendaItemId/opinions', authenticateUser, async (req, res) => {
  try {
    const { opinion } = req.body;
    if (typeof opinion !== 'string' || !opinion.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'opinion is required.' } });
    }

    const { agenda, member } = await getAgendaForMember(req.params.agendaItemId, req.user.id);
    if (!agenda) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agenda item not found.' } });
    if (!member) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not a member of this meeting group.' } });
    if (agenda.status !== 'needs_opinion') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'This agenda does not require an opinion.' } });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('agenda_opinions')
      .select('id')
      .eq('agenda_item_id', agenda.id)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment) return res.status(403).json({ error: { code: 'NOT_ASSIGNED', message: 'You are not assigned to submit an opinion for this agenda.' } });

    const { data: updated, error: updateError } = await supabase
      .from('agenda_opinions')
      .update({ opinion: opinion.trim() })
      .eq('id', assignment.id)
      .select('id, agenda_item_id, user_id, opinion, created_at')
      .single();
    if (updateError) throw updateError;

    res.json({ ...updated, opinion_status: 'submitted' });
  } catch (err) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: err.message } });
  }
});

module.exports = router;
