// app/api/meetings/[meetingId]/generate/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '../../../../../utils/supabase';

// OpenAI 클라이언트 초기화 (서버 환경변수 OPENAI_API_KEY 사용)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request, { params }) {
  try {
    const { meetingId } = await params;

    // 1. 인증 헤더 검증 (Supabase Token)[cite: 3]
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' } },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } },
        { status: 401 }
      );
    }

    // 2. DB에서 회의록 정보 및 참석자 목록 조회[cite: 2]
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        raw_content,
        group_id,
        meeting_attendees (
          profiles ( id, name )
        )
      `)
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '회의록을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    if (!meeting.raw_content || meeting.raw_content.trim() === '') {
      return NextResponse.json(
        { error: { code: 'EMPTY_CONTENT', message: '회의 원문 내용이 비어있습니다.' } },
        { status: 400 }
      );
    }

    const attendeeNames = (meeting.meeting_attendees || [])
      .map((a) => a.profiles?.name)
      .filter(Boolean);

    // 3. OpenAI Chat Completion 호출 (JSON 모드 적용)
    const systemPrompt = `
당신은 동아리 및 소모임 회의록 전문 분석 AI입니다.
주어진 회의 원문을 분석하여 다음 3가지 항목으로 정확하게 분류하여 순수 JSON 객체로 반환하세요.

[분석 규칙]
1. confirmedItems: 회의에서 결정/확정된 안건 목록 (문자열 배열)
2. pendingItems: 결정되지 않아 불참자나 특정인의 추가 의견이 필요한 안건. text(내용)와 people(의견이 필요한 사람 이름 배열) 객체로 구성.
3. tasks: 회의 결과 발생한 구체적인 실행 과제(할 일). text(할일 내용)와 assigneeName(담당자 이름) 객체로 구성. 담당자는 가능한 한 참석자 목록(${attendeeNames.join(', ') || '전체'}) 내에서 매칭하세요.

[반환 형식]
{
  "confirmedItems": ["확정 내용 1", "확정 내용 2"],
  "pendingItems": [
    { "text": "의견 수렴 안건 내용", "people": ["이름1"] }
  ],
  "tasks": [
    { "text": "할일 내용", "assigneeName": "이름1" }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `[회의 원문]:\n${meeting.raw_content}` },
      ],
      temperature: 0.2,
    });

    const parsedResult = JSON.parse(completion.choices[0].message.content);

    // 4. 추출된 안건(agenda_items) 및 할일(tasks)을 DB에 저장[cite: 2]
    // 4-1. 확정 안건 저장
    const confirmedAgendaData = (parsedResult.confirmedItems || []).map((content) => ({
      meeting_id: meetingId,
      content,
      status: 'confirmed',
    }));

    // 4-2. 의견 필요 안건 저장
    const pendingAgendaData = (parsedResult.pendingItems || []).map((item) => ({
      meeting_id: meetingId,
      content: item.text,
      status: 'needs_opinion',
    }));

    if (confirmedAgendaData.length > 0 || pendingAgendaData.length > 0) {
      await supabase.from('agenda_items').insert([...confirmedAgendaData, ...pendingAgendaData]);
    }

    // 4-3. 할 일(tasks) 저장 (담당자 프로필 ID 매칭)
    const taskData = (parsedResult.tasks || []).map((t) => {
      const matchedProfile = (meeting.meeting_attendees || []).find(
        (a) => a.profiles?.name === t.assigneeName
      );
      return {
        meeting_id: meetingId,
        text: t.text,
        assignee_id: matchedProfile ? matchedProfile.profiles.id : null,
        done: false,
      };
    });

    if (taskData.length > 0) {
      await supabase.from('tasks').insert(taskData);
    }

    // 4-4. 회의록 상태를 generated = true로 갱신[cite: 2]
    await supabase.from('meetings').update({ generated: true }).eq('id', meetingId);

    // 5. 프론트엔드 응답 반환[cite: 3]
    return NextResponse.json({
      meetingId,
      generated: true,
      agendaItems: [
        ...(parsedResult.confirmedItems || []).map((c) => ({ content: c, status: 'confirmed' })),
        ...(parsedResult.pendingItems || []).map((p) => ({ content: p.text, status: 'needs_opinion', people: p.people })),
      ],
      tasks: parsedResult.tasks || [],
    });
  } catch (error) {
    console.error('OpenAI 분석 오류:', error);
    return NextResponse.json(
      { error: { code: 'LLM_GENERATION_FAILED', message: '회의록 요약 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}