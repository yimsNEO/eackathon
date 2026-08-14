const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authenticateUser = require('../middleware/auth');

// GET /api/groups - 현재 사용자가 속한 그룹 목록 조회
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // 사용자가 속한 그룹 조회
    const { data: groups, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        position,
        groups (
          id,
          name,
          created_by,
          admin_name,
          admin_email,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

    const groupIds = groups.map((item) => item.group_id);
    const { data: memberships, error: membershipsError } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds);

    if (membershipsError) return res.status(500).json({ error: { code: 'DB_ERROR', message: membershipsError.message } });

    const memberCounts = new Map();
    for (const membership of memberships || []) {
      memberCounts.set(membership.group_id, (memberCounts.get(membership.group_id) || 0) + 1);
    }

    const result = groups.map((item) => ({
      ...item.groups,
      position: item.position,
      role: item.position === 'admin' ? 'admin' : 'member',
      member_count: memberCounts.get(item.group_id) || 0
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/groups - 새 그룹 생성
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { name, admin_name: rawAdminName } = req.body;
    const userId = req.user.id;
    const userName = req.user.user_metadata?.name || req.user.email?.split('@')[0] || 'User';
    const adminName = typeof rawAdminName === 'string' && rawAdminName.trim() ? rawAdminName.trim() : userName;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Group name is required.' } });
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert([{ id: userId, name: userName, email: req.user.email || null }], { onConflict: 'id' });

    if (profileErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: profileErr.message } });

    // 그룹 생성
    const { data: group, error: cErr } = await supabase
      .from('groups')
      .insert([{ name: name.trim(), admin_name: adminName, admin_email: req.user.email || null, created_by: userId }])
      .select()
      .single();

    if (cErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: cErr.message } });

    // 생성자를 group_members에 자동 등록
    const { error: mErr } = await supabase
      .from('group_members')
      .insert([{
        group_id: group.id,
        user_id: userId,
        name: adminName,
        position: 'admin'
      }]);

    if (mErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: mErr.message } });

    res.status(201).json({
      ...group,
      members: [{
        group_id: group.id,
        user_id: userId,
        name: adminName,
        position: 'admin',
        users: { name: adminName, email: req.user.email || null }
      }]
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/groups/:id/members - 그룹에 멤버 추가
router.post('/:id/members', authenticateUser, async (req, res) => {
  try {
    const {
      user_id: snakeCaseUserId,
      userId: camelCaseUserId,
      email: rawEmail,
      name: rawName,
      position
    } = req.body;
    const requestedUserId = snakeCaseUserId || camelCaseUserId;
    const groupId = req.params.id;
    const requesterId = req.user.id;

    if (!requestedUserId && (!rawEmail || typeof rawEmail !== 'string')) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'user_id 또는 email을 입력해주세요.' } });
    }

    // 요청자가 그룹 admin인지 확인
    const { data: requester, error: rErr } = await supabase
      .from('group_members')
      .select('position')
      .eq('group_id', groupId)
      .eq('user_id', requesterId)
      .single();

    if (rErr || !requester || requester.position !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: '그룹에 멤버를 추가할 권한이 없습니다.' } });
    }

    // 멤버 추가
    let userId = requestedUserId;
    let authUser = null;

    if (!userId) {
      const email = rawEmail.trim().toLowerCase();
      let page = 1;
      const perPage = 1000;

      while (!authUser) {
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage });

        if (usersError) {
          return res.status(500).json({ error: { code: 'DB_ERROR', message: usersError.message } });
        }

        authUser = users.users.find(item => item.email && item.email.toLowerCase() === email);

        if (authUser || users.users.length < perPage) break;

        page += 1;
      }

      if (!authUser) {
        return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: '해당 이메일로 가입된 사용자를 찾을 수 없습니다.' } });
      }

      userId = authUser.id;
    } else {
      const { data: foundUser, error: foundUserError } = await supabase.auth.admin.getUserById(userId);

      if (foundUserError || !foundUser?.user) {
        return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: '해당 사용자를 찾을 수 없습니다.' } });
      }

      authUser = foundUser.user;
    }

    const memberName = typeof rawName === 'string' && rawName.trim()
      ? rawName.trim()
      : authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert([{ id: userId, name: memberName, email: authUser.email || null }], { onConflict: 'id' });

    if (profileErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: profileErr.message } });
    
    const { data, error } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id: userId, name: memberName, position: position || null }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

    res.status(201).json({
      ...data,
      email: authUser.email || null,
      name: memberName,
      role: 'member',
      users: { name: memberName, email: authUser.email || null }
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/groups/:id - group details for a member
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const groupId = req.params.id;

    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (membershipError) return res.status(500).json({ error: { code: 'DB_ERROR', message: membershipError.message } });
    if (!membership) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not a member of this group.' } });

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, admin_name, admin_email, created_by, created_at')
      .eq('id', groupId)
      .maybeSingle();

    if (groupError) return res.status(500).json({ error: { code: 'DB_ERROR', message: groupError.message } });
    if (!group) return res.status(404).json({ error: { code: 'GROUP_NOT_FOUND', message: 'Group not found.' } });

    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, name, position, joined_at, profiles:user_id ( name, email )')
      .eq('group_id', groupId);

    if (membersError) return res.status(500).json({ error: { code: 'DB_ERROR', message: membersError.message } });

    res.json({
      ...group,
      members: (members || []).map((member) => ({
        user_id: member.user_id,
        email: member.profiles?.email || null,
        name: member.name,
        position: member.position,
        role: member.position === 'admin' ? 'admin' : 'member',
        joined_at: member.joined_at,
        users: member.profiles || null
      }))
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});
// PATCH /api/groups/:id - rename a group (administrators only)
router.patch('/:id', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    const groupId = req.params.id;
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Group name is required.' } });

    const { data: membership, error: membershipError } = await supabase.from('group_members').select('position').eq('group_id', groupId).eq('user_id', req.user.id).maybeSingle();
    if (membershipError) return res.status(500).json({ error: { code: 'DB_ERROR', message: membershipError.message } });
    if (!membership || membership.position !== 'admin') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only group administrators can update a group.' } });

    const { data: group, error } = await supabase.from('groups').update({ name: name.trim() }).eq('id', groupId).select('id, name').maybeSingle();
    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
    if (!group) return res.status(404).json({ error: { code: 'GROUP_NOT_FOUND', message: 'Group not found.' } });
    res.json(group);
  } catch (err) { res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } }); }
});

// DELETE /api/groups/:id/members/:userId - remove a member (administrators only)
router.delete('/:id/members/:userId', authenticateUser, async (req, res) => {
  try {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;
    const { data: membership, error: membershipError } = await supabase.from('group_members').select('position').eq('group_id', groupId).eq('user_id', req.user.id).maybeSingle();
    if (membershipError) return res.status(500).json({ error: { code: 'DB_ERROR', message: membershipError.message } });
    if (!membership || membership.position !== 'admin') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only group administrators can remove members.' } });
    if (targetUserId === req.user.id) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'An administrator cannot remove themselves.' } });

    const { data: deleted, error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', targetUserId).select('user_id').maybeSingle();
    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
    if (!deleted) return res.status(404).json({ error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } }); }
});

// DELETE /api/groups/:id - delete a group (administrators only)
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { data: membership, error: membershipError } = await supabase.from('group_members').select('position').eq('group_id', groupId).eq('user_id', req.user.id).maybeSingle();
    if (membershipError) return res.status(500).json({ error: { code: 'DB_ERROR', message: membershipError.message } });
    if (!membership || membership.position !== 'admin') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only group administrators can delete a group.' } });

    const { data: deleted, error } = await supabase.from('groups').delete().eq('id', groupId).select('id').maybeSingle();
    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
    if (!deleted) return res.status(404).json({ error: { code: 'GROUP_NOT_FOUND', message: 'Group not found.' } });
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } }); }
});
module.exports = router;
