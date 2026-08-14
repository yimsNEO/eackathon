import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';

// 1. GET: 내가 속한 그룹 목록 조회
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

    // 내가 속한 그룹 ID들을 먼저 조회
    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberError) throw memberError;

    const groupIds = memberships.map(m => m.group_id);
    if (groupIds.length === 0) {
      return NextResponse.json([]);
    }

    // 해당 그룹들의 상세 정보 및 멤버 수 조회
    const { data: groups, error: groupError } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        created_at,
        group_members ( count )
      `)
      .in('id', groupIds);

    if (groupError) throw groupError;

    const formattedGroups = groups.map(g => ({
      id: g.id,
      name: g.name,
      createdAt: g.created_at,
      memberCount: g.group_members?.[0]?.count || 0
    }));

    return NextResponse.json(formattedGroups);
  } catch (error) {
    console.error('그룹 조회 오류:', error);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}

// 2. POST: 새 그룹 생성 (생성자를 멤버로 자동 등록)
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
    const { name } = body;
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '그룹명은 필수입니다.' } }, { status: 400 });
    }

    // 1. groups 테이블에 새 그룹 삽입
    const { data: newGroup, error: insertError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. group_members 테이블에 생성자를 '회장' 직책으로 자동 추가
    const { error: memberInsertError } = await supabase
      .from('group_members')
      .insert({
        group_id: newGroup.id,
        user_id: user.id,
        position: '회장'
      });

    if (memberInsertError) throw memberInsertError;

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error('그룹 생성 오류:', error);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }
}