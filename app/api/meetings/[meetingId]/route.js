import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase';

// 1. GET: 회의록 상세 조회 (참석자, 안건, 할일 함께 반환)[cite: 2]
export async function GET(request, { params }) {
  try {
    const { meetingId } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' } }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, { status: 401 });
    }

    // 회의록 및 연관 테이블 데이터를 JOIN하여 조회
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        meeting_date,
        raw_content,
        generated,
        group_id,
        meeting_attendees (
          user_id,
          profiles ( id, name )
        ),
        agenda_items (
          id,
          content,
          status,
          agenda_opinions (
            id,
            user_id,
            opinion,
            profiles ( id, name )
          )
        ),
        tasks (
          id,
          text,
          assignee_id,
          done,
          profiles:assignee_id ( id, name )
        )
      `)
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '회의록을 찾을 수 없습니다.' } }, { status: 404 });
    }

    // 사용자가 해당 그룹의 멤버인지 확인
    const { data: membership } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', meeting.group_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '그룹 멤버가 아닙니다.' } }, { status: 403 });
    }

    // API 명세서에 맞춘 포맷으로 데이터 가공[cite: 2]
    const formattedMeeting = {
      id: meeting.id,
      title: meeting.title,
      meetingDate: meeting.meeting_date,
      rawContent: meeting.raw_content,
      generated: meeting.generated,
      attendees: (meeting.meeting_attendees || []).map(a => ({
        userId: a.profiles?.id,
        name: a.profiles?.name
      })),
      agendaItems: (meeting.agenda_items || []).map(item => ({
        id: item.id,
        content: item.content,
        status: item.status,
        opinions: (item.agenda_opinions || []).map(op => ({
          userId: op.profiles?.id,
          name: op.profiles?.name,
          opinion: op.opinion
        }))
      })),
      tasks: (meeting.tasks || []).map(t => ({
        id: t.id,
        text: t.text,
        assigneeId: t.assignee_id,
        assigneeName: t.profiles?.name || null,
        done: t.done
      }))
    };

    return NextResponse.json(formattedMeeting);
  } catch (error) {
    console.error('회의록 상세 조회 오류:', error);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

// 2. PATCH: 회의록 원문 또는 참석자 목록 수정[cite: 2]
export async function PATCH(request, { params }) {
  try {
    const { meetingId } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' } }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, { status: 401 });
    }

    const body = await request.json();
    const { rawContent, attendeeIds } = body;

    const { data: meeting } = await supabase
      .from('meetings')
      .select('group_id')
      .eq('id', meetingId)
      .single();

    if (!meeting) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '회의록을 찾을 수 없습니다.' } }, { status: 404 });
    }

    // 원문 수정 반영
    if (rawContent !== undefined) {
      await supabase.from('meetings').update({ raw_content: rawContent }).eq('id', meetingId);
    }

    // 참석자 목록 갱신 (기존 연결을 지우고 새로 등록)
    if (attendeeIds && Array.isArray(attendeeIds)) {
      await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingId);
      if (attendeeIds.length > 0) {
        const newAttendees = attendeeIds.map(uid => ({
          meeting_id: meetingId,
          user_id: uid
        }));
        await supabase.from('meeting_attendees').insert(newAttendees);
      }
    }

    return NextResponse.json({ id: meetingId, success: true });
  } catch (error) {
    console.error('회의록 수정 오류:', error);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

// 3. DELETE: 회의록 삭제[cite: 2]
export async function DELETE(request, { params }) {
  try {
    const { meetingId } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' } }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (deleteError) throw deleteError;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('회의록 삭제 오류:', error);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}