// @ts-nocheck
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  FileText, Calendar, Users, CheckSquare, Settings, X, Mic,
  ChevronLeft, ChevronRight, Moon, Sun, LogOut, Check,
  HelpCircle, Circle, CheckCircle2, Plus, Trash2, Pencil, Save
} from 'lucide-react';

const COLOR_PALETTE = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-violet-600', 'bg-cyan-600', 'bg-orange-600', 'bg-teal-600'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

const UPCOMING_MEETINGS = [
  { date: '8월 27일(목)', time: '19:00', title: '정기 임원진 회의', attend: '5/7명 참석 예정' },
  { date: '9월 3일(목)', time: '19:00', title: '엠티 준비 회의', attend: '참석 조율 중' },
];

function buildCalendarDays() {
  const leading = 6; 
  const days = [...Array(leading).fill(null), ...Array.from({ length: 31 }, (_, i) => i + 1)];
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

// ---------------------------------------------------------
// 1. 로그인 래퍼 (AppWrapper)
// ---------------------------------------------------------
export default function AppWrapper() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage('로그인 실패: ' + error.message);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (password !== passwordConfirm) {
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setMessage('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    const { error } = await supabase.auth.signUp({ 
      email, 
      password 
    });
    
    if (error) {
      setMessage('회원가입 실패: ' + error.message);
    } else {
      setMessage('회원가입 성공! 이메일을 확인하거나 로그인하세요.');
      setTimeout(() => {
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setPasswordConfirm('');
        setMessage('');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-100">
        <div className="text-neutral-500 font-medium">세션 확인 중...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-100" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl flex flex-col justify-center px-8" style={{ width: 380, height: 'auto', minHeight: 600 }}>
          
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-200">
              <Users size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-neutral-900">임원진 회의록</h1>
            <p className="text-sm text-neutral-500 mt-2">회의 내용과 할 일을 확인하세요.</p>
          </div>

          {/* 탭 버튼 */}
          <div className="flex gap-2 mb-6 bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => { setIsSignUp(false); setMessage(''); }}
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition ${
                !isSignUp 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => { setIsSignUp(true); setMessage(''); }}
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition ${
                isSignUp 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* 메시지 표시 */}
          {message && (
            <div className={`p-3 rounded-lg text-sm mb-4 text-center ${
              message.includes('성공') 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-rose-100 text-rose-700'
            }`}>
              {message}
            </div>
          )}

          {/* 로그인 폼 */}
          {!isSignUp && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 ml-1">이메일</label>
                <input 
                  type="email" 
                  placeholder="test1@gmail.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 ml-1">비밀번호</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold mt-2 shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform hover:bg-blue-700">
                로그인
              </button>
            </form>
          )}

          {/* 회원가입 폼 */}
          {isSignUp && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 ml-1">이메일</label>
                <input 
                  type="email" 
                  placeholder="example@gmail.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 ml-1">비밀번호</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                  className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
                <p className="text-xs text-neutral-400 mt-1 ml-1">최소 6자 이상</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5 ml-1">비밀번호 확인</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={passwordConfirm} 
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength="6"
                  className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold mt-2 shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform hover:bg-blue-700">
                회원가입
              </button>
            </form>
          )}
          
        </div>
      </div>
    );
  }

  return <MeetingApp session={session} />;
}

// ---------------------------------------------------------
// 2. 메인 앱 컴포넌트
// ---------------------------------------------------------
function MeetingApp({ session }) {
  const [tab, setTab] = useState('minutes');
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [groups, setGroups] = useState([]);
  const [minutes, setMinutes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [minutesView, setMinutesView] = useState('list');
  const [selectedMinuteId, setSelectedMinuteId] = useState(null);
  const [selectedMinuteDetail, setSelectedMinuteDetail] = useState(null);
  const [groupView, setGroupView] = useState('list');
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // 그룹 생성 모달 상태
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const token = session.access_token;
  const currentUserName = session.user.email.split('@')[0];

  useEffect(() => {
    if (!token) {
      setGroups([]);
      setMinutes([]);
      setLoadingData(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setLoadingData(true);

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [groupRes, minuteRes] = await Promise.all([
          fetch(buildApiUrl('/api/groups'), { headers }),
          fetch(buildApiUrl('/api/meetings'), { headers })
        ]);

        if (!isMounted) return;

        // 401: 토큰 만료 - 로그아웃 처리
        if (groupRes.status === 401 || minuteRes.status === 401) {
          console.warn('인증 토큰이 만료되었습니다. 다시 로그인하세요.');
          await supabase.auth.signOut();
          return;
        }

        if (groupRes.ok) setGroups(await groupRes.json());
        if (minuteRes.ok) setMinutes(await minuteRes.json());
      } catch (err) {
        console.error('데이터 로딩 실패:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleLogout = async () => {
    setTab('minutes');
    setShowSettings(false);
    setGroups([]);
    setMinutes([]);
    setLoadingData(false);
    setMinutesView('list');
    setSelectedMinuteId(null);
    setSelectedMinuteDetail(null);
    setGroupView('list');
    setSelectedGroupId(null);
    setShowGroupModal(false);
    setNewGroupName('');
    await supabase.auth.signOut();
  };

  const fetchMinuteDetail = async (id) => {
    try {
      const res = await fetch(buildApiUrl(`/api/meetings/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSelectedMinuteDetail(await res.json());
    } catch (err) {
      console.error('회의록 상세 조회 실패:', err);
    }
  };

  useEffect(() => {
    if (selectedMinuteId) fetchMinuteDetail(selectedMinuteId);
  }, [selectedMinuteId]);

  const theme = darkMode
    ? {
        appBg: 'bg-neutral-950', cardBg: 'bg-neutral-900', cardBorder: 'border-neutral-800',
        inputBorder: 'border-neutral-700', text: 'text-neutral-50', subtext: 'text-neutral-400',
        faint: 'text-neutral-600', navBg: 'bg-neutral-950', navBorder: 'border-neutral-800',
        navInactive: 'text-neutral-500', chipOutline: 'border-neutral-700 text-neutral-300',
        iconBtn: 'bg-neutral-900 border-neutral-800 text-neutral-300',
      }
    : {
        appBg: 'bg-neutral-50', cardBg: 'bg-white', cardBorder: 'border-neutral-200',
        inputBorder: 'border-neutral-300', text: 'text-neutral-900', subtext: 'text-neutral-500',
        faint: 'text-neutral-400', navBg: 'bg-white', navBorder: 'border-neutral-200',
        navInactive: 'text-neutral-400', chipOutline: 'border-neutral-300 text-neutral-600',
        iconBtn: 'bg-white border-neutral-200 text-neutral-500',
      };

  const addMinute = async () => {
    if (groups.length === 0) {
      alert('먼저 그룹을 생성해주세요!');
      setTab('group');
      return;
    }
    try {
      const res = await fetch(buildApiUrl('/api/meetings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          group_id: groups[0].id,
          title: '새 회의록',
          meeting_date: new Date().toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        const newM = await res.json();
        setMinutes(prev => [newM, ...prev]);
        setSelectedMinuteId(newM.id);
        setMinutesView('detail');
        fetchData();
      }
    } catch (err) {
      console.error('회의록 생성 실패:', err);
    }
  };

  const deleteMinute = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(buildApiUrl(`/api/meetings/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMinutes(prev => prev.filter(m => m.id !== id));
        if (selectedMinuteId === id) { setMinutesView('list'); setSelectedMinuteId(null); }
      }
    } catch (err) {
      console.error('회의록 삭제 실패:', err);
    }
  };

  const handleGenerateAI = async (minuteId, rawContent) => {
    try {
      const patchRes = await fetch(buildApiUrl(`/api/meetings/${minuteId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ raw_content: rawContent })
      });

      if (patchRes.status === 401) {
        alert('인증 토큰이 만료되었습니다. 다시 로그인하세요.');
        await supabase.auth.signOut();
        return;
      }

      if (patchRes.status === 403) {
        alert('이 회의록을 수정할 권한이 없습니다.');
        return;
      }

      const res = await fetch(buildApiUrl(`/api/meetings/${minuteId}/generate`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        alert('인증 토큰이 만료되었습니다. 다시 로그인하세요.');
        await supabase.auth.signOut();
        return;
      }

      if (res.status === 403) {
        alert('이 회의록의 요약을 생성할 권한이 없습니다.');
        return;
      }

      if (res.ok) {
        alert('AI 요약이 성공적으로 완료되었습니다!');
        fetchData();
        fetchMinuteDetail(minuteId);
      } else {
        const errJson = await res.json();
        alert('요약 실패: ' + (errJson.error?.message || '서버 오류'));
      }
    } catch (err) {
      console.error('AI 요약 요청 중 오류:', err);
      alert('AI 요약 요청 중 오류가 발생했습니다.');
    }
  };

  // 그룹 생성 실행 함수 (prompt 대체)
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch(buildApiUrl('/api/groups'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newGroupName.trim() })
      });
      if (res.ok) {
        setNewGroupName('');
        setShowGroupModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('그룹 생성 실패:', err);
    }
  };

  const goToMinute = (id) => { setTab('minutes'); setMinutesView('detail'); setSelectedMinuteId(id); };

  const days = buildCalendarDays();
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const TABS = [
    { id: 'minutes', label: '회의록', icon: FileText },
    { id: 'calendar', label: '캘린더', icon: Calendar },
    { id: 'group', label: '그룹', icon: Users },
    { id: 'todo', label: '할일', icon: CheckSquare },
  ];

  const showBack = (tab === 'minutes' && minutesView === 'detail') || (tab === 'group' && groupView === 'detail');
  const onBack = () => { if (tab === 'minutes') setMinutesView('list'); if (tab === 'group') setGroupView('list'); };

  let headerTitle = '';
  let headerSubtitle = '';
  if (tab === 'minutes') {
    headerTitle = minutesView === 'list' ? '회의록' : (selectedMinuteDetail?.title ?? '회의록');
    headerSubtitle = minutesView === 'list' ? `총 ${minutes.length}개` : (selectedMinuteDetail?.meetingDate ?? '');
  } else if (tab === 'calendar') {
    headerTitle = '캘린더'; headerSubtitle = '이번 달 일정';
  } else if (tab === 'group') {
    headerTitle = groupView === 'list' ? '그룹' : (selectedGroup?.name ?? '그룹');
    headerSubtitle = groupView === 'list' ? `총 ${groups.length}개 그룹` : '그룹 상세';
  } else if (tab === 'todo') {
    headerTitle = '할일'; headerSubtitle = '내 담당 과제';
  }

  const showFab = (tab === 'minutes' && minutesView === 'list') || (tab === 'group' && groupView === 'list');

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className={`relative overflow-hidden rounded-3xl border ${theme.cardBorder} ${theme.appBg} shadow-2xl`} style={{ width: 380, height: 760 }}>
        
        {/* 상단 바 */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            {showBack && (
              <button onClick={onBack} className={`p-1 -ml-1 ${theme.text}`} aria-label="뒤로가기">
                <ChevronLeft size={22} />
              </button>
            )}
            <div className="min-w-0">
              <p className={`text-xs ${theme.subtext} mb-1 truncate`}>{headerSubtitle}</p>
              <h1 className={`text-xl font-extrabold ${theme.text} truncate`}>{headerTitle}</h1>
            </div>
          </div>
          <button onClick={() => setShowSettings(true)} className={`p-2 rounded-full border shrink-0 ${theme.iconBtn}`} aria-label="설정">
            <Settings size={18} />
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="overflow-y-auto px-5 pb-4" style={{ height: 760 - 96 - 72 }}>
          {loadingData ? (
            <div className={`text-center text-sm ${theme.subtext} pt-20`}>데이터 불러오는 중...</div>
          ) : (
            <>
              {tab === 'minutes' && minutesView === 'list' && (
                <MinutesListView theme={theme} minutes={minutes} onSelect={(id) => { setSelectedMinuteId(id); setMinutesView('detail'); }} onDelete={deleteMinute} />
              )}
              {tab === 'minutes' && minutesView === 'detail' && selectedMinuteDetail && (
                <MinutesDetailView
                  key={selectedMinuteDetail.id}
                  theme={theme}
                  minute={selectedMinuteDetail}
                  token={token}
                  onGenerateAI={handleGenerateAI}
                  onRefresh={() => fetchMinuteDetail(selectedMinuteDetail.id)}
                />
              )}
              {tab === 'calendar' && <CalendarTab theme={theme} days={days} />}
              {tab === 'group' && groupView === 'list' && (
                <GroupListView theme={theme} groups={groups} onSelect={(id) => { setSelectedGroupId(id); setGroupView('detail'); }} />
              )}
              {tab === 'group' && groupView === 'detail' && selectedGroup && (
                <GroupDetailView key={selectedGroup.id} theme={theme} group={selectedGroup} token={token} />
              )}
              {tab === 'todo' && <MyTodoView theme={theme} minutes={minutes} currentUser={currentUserName} onGoToMinute={goToMinute} />}
            </>
          )}
        </div>

        {/* FAB */}
        {showFab && (
          <button
            onClick={tab === 'minutes' ? addMinute : () => setShowGroupModal(true)}
            className="rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center gap-1.5 px-4 h-12"
            style={{ position: 'absolute', bottom: 88, right: 20 }}
          >
            <Plus size={18} />
            <span className="text-sm font-semibold">{tab === 'minutes' ? '회의록 추가' : '그룹 추가'}</span>
          </button>
        )}

        {/* 그룹 생성 모달 (prompt 오류 원천 차단) */}
        {showGroupModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className={`w-full max-w-xs rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5 shadow-2xl`}>
              <h3 className={`text-base font-bold ${theme.text} mb-3`}>새 그룹 추가</h3>
              <form onSubmit={handleCreateGroupSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="그룹 이름 입력"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  className={`w-full p-3 rounded-xl border text-sm ${theme.inputBorder} ${theme.text} bg-transparent outline-none`}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGroupModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-neutral-500 text-sm font-semibold"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow"
                  >
                    생성
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 하단 네비게이션 */}
        <div className={`absolute bottom-0 left-0 right-0 flex justify-around items-center border-t ${theme.navBorder} ${theme.navBg}`} style={{ height: 72 }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => { setTab(id); setMinutesView('list'); setGroupView('list'); }} className="flex flex-col items-center gap-1">
                <Icon size={22} className={active ? 'text-blue-500' : theme.navInactive} />
                <span className={`text-xs ${active ? 'text-blue-500 font-semibold' : theme.navInactive}`}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* 설정 시트 */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className={`w-full rounded-t-3xl border-t ${theme.cardBorder} ${theme.cardBg} p-5`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className={`text-lg font-bold ${theme.text}`}>설정</h2>
                <button onClick={() => setShowSettings(false)} className={theme.subtext}><X size={20} /></button>
              </div>
              <div className={`flex items-center justify-between py-3 border-b ${theme.cardBorder}`}>
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon size={18} className={theme.text} /> : <Sun size={18} className={theme.text} />}
                  <span className={theme.text}>다크 모드</span>
                </div>
                <button onClick={() => setDarkMode((v) => !v)} className={`w-11 h-6 rounded-full flex items-center px-0.5 transition ${darkMode ? 'bg-blue-600 justify-end' : 'bg-neutral-300 justify-start'}`}>
                  <span className="w-5 h-5 rounded-full bg-white block" />
                </button>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-3 py-4 text-rose-500 w-full hover:bg-rose-50 rounded-xl px-2 transition">
                <LogOut size={18} /><span className="font-medium">로그아웃</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 3. 서브 뷰 컴포넌트들
// ---------------------------------------------------------

function MinutesListView({ theme, minutes, onSelect, onDelete }) {
  if (minutes.length === 0) {
    return <div className={`text-center text-sm ${theme.subtext} pt-16`}>회의록이 없어요.<br />오른쪽 아래 버튼으로 추가해보세요.</div>;
  }
  return (
    <div className="space-y-2.5 pb-16">
      {minutes.map((m) => (
        <div key={m.id} onClick={() => onSelect(m.id)} className={`rounded-xl border p-3 flex items-center justify-between cursor-pointer ${theme.cardBorder} ${theme.cardBg}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-semibold truncate ${theme.text}`}>{m.title}</span>
              {m.generated ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">생성완료</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600 shrink-0">작성중</span>
              )}
            </div>
            <p className={`text-xs ${theme.subtext} truncate`}>{m.meetingDate} · {m.groupName}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(m.id); }} className="p-2 text-neutral-400 shrink-0" aria-label="삭제">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function MinutesDetailView({ theme, minute, token, onGenerateAI, onRefresh }) {
  const [content, setContent] = useState(minute.rawContent || '');
  const [editingContent, setEditingContent] = useState(false);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {minute.attendees?.length === 0 ? (
          <span className={`text-xs ${theme.faint}`}>참석자 없음</span>
        ) : (
          minute.attendees?.map((a) => (
            <span key={a.userId} className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{a.name}</span>
          ))
        )}
      </div>

      {!minute.generated ? (
        <div>
          <p className={`text-sm ${theme.subtext} mb-2 flex items-center gap-2`}><Mic size={14} /> 회의 내용을 입력하세요</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="회의 내용을 입력하면 OpenAI가 확정 안건, 의견 필요 안건, 할 일을 자동으로 정리해드려요"
            rows={6}
            className={`w-full rounded-2xl border border-dashed p-4 text-sm resize-none ${theme.inputBorder} ${theme.text} bg-transparent`}
          />
          <button
            onClick={() => onGenerateAI(minute.id, content)}
            disabled={!content.trim()}
            className={`w-full mt-3 py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-white ${content.trim() ? 'bg-blue-600' : 'bg-neutral-400'}`}
          >
            <Save size={16} /> AI 요약 생성하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <button
              onClick={() => setEditingContent((v) => !v)}
              className={`text-xs font-medium flex items-center gap-1.5 ${theme.subtext}`}
            >
              <FileText size={13} /> {editingContent ? '원본 닫기' : '원문 보기 / 수정'}
            </button>
            {editingContent && (
              <div className="mt-2">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className={`w-full rounded-2xl border p-4 text-sm resize-none ${theme.inputBorder} ${theme.text} bg-transparent`}
                />
                <button
                  onClick={async () => {
                    await fetch(buildApiUrl(`/api/meetings/${minute.id}`), {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ raw_content: content })
                    });
                    setEditingContent(false);
                    onRefresh();
                  }}
                  className={`w-full mt-2 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium ${theme.cardBorder} ${theme.text}`}
                >
                  <Save size={14} /> 수정사항 저장
                </button>
              </div>
            )}
          </div>

          <div>
            <p className={`text-sm font-bold ${theme.text} mb-2 flex items-center gap-1.5`}><Check size={15} className="text-emerald-500" /> 확정된 안건</p>
            <div className="space-y-2">
              {minute.agendaItems?.filter(i => i.status === 'confirmed').map((item) => (
                <div key={item.id} className={`rounded-xl border ${theme.cardBorder} ${theme.cardBg} p-3 text-sm ${theme.text}`}>{item.content}</div>
              ))}
            </div>
          </div>

          <div>
            <p className={`text-sm font-bold ${theme.text} mb-2 flex items-center gap-1.5`}><HelpCircle size={15} className="text-amber-500" /> 의견 필요 안건</p>
            <div className="space-y-2">
              {minute.agendaItems?.filter(i => i.status === 'needs_opinion').map((item) => (
                <div key={item.id} className={`rounded-xl border ${theme.cardBorder} ${theme.cardBg} p-3`}>
                  <p className={`text-sm ${theme.text} mb-1.5`}>{item.content}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {item.opinions?.map((op) => (
                      <span key={op.userId} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{op.name}: {op.opinion}</span>
                    ))}
                    {(!item.opinions || item.opinions.length === 0) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600">의견 대기중</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className={`text-sm font-bold ${theme.text} mb-2 flex items-center gap-1.5`}><CheckSquare size={15} className="text-blue-500" /> 파생된 할 일</p>
            <div className="space-y-2">
              {minute.tasks?.map((t) => (
                <div key={t.id} className={`w-full flex items-start gap-3 rounded-xl border ${theme.cardBorder} ${theme.cardBg} p-3 text-left`}>
                  {t.done ? <CheckCircle2 size={18} className="text-blue-500 mt-0.5 shrink-0" /> : <Circle size={18} className={`${theme.faint} mt-0.5 shrink-0`} />}
                  <div className="flex-1">
                    <p className={`text-sm ${t.done ? `line-through ${theme.faint}` : theme.text}`}>{t.text}</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t.assigneeName || '담당자 미정'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarTab({ theme, days }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className={theme.subtext}><ChevronLeft size={18} /></button>
        <span className={`font-bold ${theme.text}`}>2026년 8월</span>
        <button className={theme.subtext}><ChevronRight size={18} /></button>
      </div>
      <div>
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((d) => <div key={d} className={`text-center text-xs ${theme.faint}`}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {days.map((d, i) => {
            const isToday = d === 13;
            const hasMeeting = d === 27;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${isToday ? 'bg-blue-600 text-white font-bold' : theme.text} ${d === null ? 'invisible' : ''}`}>{d}</div>
                <span className={`w-1 h-1 rounded-full ${hasMeeting ? 'bg-amber-500' : 'bg-transparent'}`} />
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className={`text-sm font-bold ${theme.text} mb-2`}>다가오는 회의</p>
        <div className="space-y-2">
          {UPCOMING_MEETINGS.map((m, i) => (
            <div key={i} className={`rounded-xl border ${theme.cardBorder} ${theme.cardBg} p-3`}>
              <p className={`text-sm font-semibold ${theme.text}`}>{m.title}</p>
              <p className={`text-xs ${theme.subtext} mt-0.5`}>{m.date} · {m.time}</p>
              <p className="text-xs text-blue-500 mt-1">{m.attend}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupListView({ theme, groups, onSelect }) {
  if (groups.length === 0) {
    return <div className={`text-center text-sm ${theme.subtext} pt-16`}>그룹이 없어요.<br />오른쪽 아래 버튼으로 추가해보세요.</div>;
  }
  return (
    <div className="space-y-2.5 pb-16">
      {groups.map((g) => (
        <div key={g.id} onClick={() => onSelect(g.id)} className={`rounded-xl border p-3 flex items-center justify-between cursor-pointer ${theme.cardBorder} ${theme.cardBg}`}>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${theme.text}`}>{g.name}</p>
            <p className={`text-xs ${theme.subtext}`}>멤버 {g.memberCount}명</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupDetailView({ theme, group }) {
  return (
    <div className="space-y-4 pb-4">
      <h2 className={`text-base font-bold ${theme.text}`}>{group.name}</h2>
      <p className={`text-xs ${theme.subtext}`}>생성일: {new Date(group.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

function MyTodoView({ theme, minutes, currentUser, onGoToMinute }) {
  return (
    <div className={`text-center text-sm ${theme.subtext} pt-16`}>
      할 일 관리 화면입니다.
    </div>
  );
}