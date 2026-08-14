import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';

// 1. GET: 회의록 목록 조회 (groupId로 필터링 가능)[cite: 2]
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' } }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, { status: 401 });
    }

    // URL 쿼리에서 groupId 확인
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    let query = supabase
      .from('meetings')
      .select(`
        id,
        title,
        meeting_date,
        group_id,
        generated,
        groups ( name )
      `)
      .order('created_at', { ascending: false });

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data: meetings, error: meetingError } = await query;
    if (meetingError) throw meetingError;

    const formattedMeetings = meetings.map(m => ({
      id: m.id,
      title: m.title,
      meetingDate: m.meeting_date,
      groupId: m.group_id,
      groupName: m.groups?.name ?? '그룹 없음',
      generated: m.generated
    }));

    return NextResponse.json(formattedMeetings);
  } catch (error) {
    console.error('회의록 조회 오류:', error);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

// 2. POST: 새 회의록(초안) 생성[cite: 2]
export async function POST(request) {
  try {
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
    const { groupId, title, meetingDate } = body;

    if (!groupId || !title || !meetingDate) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '필수 필드(groupId, title, meetingDate)가 누락되었습니다.' } }, { status: 400 });
    }

    // 사용자가 해당 그룹의 멤버인지 확인
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: '해당 그룹의 멤버가 아닙니다.' } }, { status: 403 });
    }

    // 새 회의록 삽입
    const { data: newMeeting, error: insertError } = await supabase
      .from('meetings')
      .insert({
        group_id: groupId,
        title: title.trim(),
        meeting_date: meetingDate,
        created_by: user.id,
        generated: false
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      id: newMeeting.id,
      title: newMeeting.title,
      meetingDate: newMeeting.meeting_date,
      generated: newMeeting.generated
    }, { status: 201 });

  } catch (error) {
    console.error('회의록 생성 오류:', error);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}