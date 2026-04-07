'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, isWithinInterval, differenceInDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Users, GraduationCap, MessageSquare, Check, X, Pencil, Plus, Trash2, Clock, Calendar as CalIcon, Layout, Target, Activity, Rocket } from 'lucide-react';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import TodoList from '@/components/dashboard/TodoList';
import WorkTaskSection from '@/components/dashboard/WorkTaskSection';
import { useCohort } from '@/context/CohortContext';
import { useData } from '@/context/DataContext';
import { Schedule } from '@/lib/types';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedCohort, setSelectedCohort, cohorts, addCohort, updateCohort, deleteCohort } = useCohort();
  const { 
    students, consultations, schedules, todos, projects, teams,
    addSchedule, updateSchedule, deleteSchedule,
    addTodo, toggleTodo, deleteTodo, updateProject, updateTodo
  } = useData();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddCohort, setShowAddCohort] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [showEditCohort, setShowEditCohort] = useState(false);
  const [editCohortName, setEditCohortName] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // v8.36: Restore Instructor Name Edit
  const [instructorName, setInstructorName] = useState('김강사');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('김강사');

  useEffect(() => {
    const saved = localStorage.getItem('instructorName');
    if (saved) { setInstructorName(saved); setTempName(saved); }
  }, []);

  const saveInstructorName = () => {
    if (!tempName.trim()) { toast.error('이름을 입력해주세요'); return; }
    setInstructorName(tempName);
    localStorage.setItem('instructorName', tempName);
    setIsEditingName(false);
    toast.success('이름이 변경되었습니다');
  };

  const ddayWidget = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const activeProjects = projects
      .filter(p => p.end_date && new Date(p.end_date) >= today)
      .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());
    if (activeProjects.length === 0) return null;
    return (
      <div className="dday-hero-container" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
        {activeProjects.map((p, idx) => {
           const diff = differenceInDays(new Date(p.end_date!), today);
           const pColor = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'][idx % 5];
           return (
              <div key={`dday-n-${p.id}`} className="dday-card" style={{ flexShrink: 0, background: pColor, color: 'white', padding: '14px 18px', borderRadius: 16, minWidth: 240, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <Clock size={18} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>마감까지</div>
                  <div style={{ fontSize: 14, fontWeight: 950, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 950 }}>D-{diff}</div>
              </div>
           );
        })}
      </div>
    );
  }, [projects]);

  const cohortFilteredStudents = useMemo(() => {
    if (selectedCohort === '전체') return students;
    return students.filter(s => s.cohort?.name === selectedCohort);
  }, [selectedCohort, students]);

  const totalStudentsCount = cohortFilteredStudents.length;
  
  const consultationsThisWeek = useMemo(() => {
    const startOfCurrentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const endOfCurrentWeek = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return consultations.filter(c => {
      const cDate = c.consulted_at.split('T')[0];
      const isThisWeek = cDate >= startOfCurrentWeek && cDate <= endOfCurrentWeek;
      const student = students.find(s => Number(s.id) === Number(c.student_id));
      const matchesCohort = selectedCohort === '전체' || student?.cohort?.name === selectedCohort;
      return isThisWeek && matchesCohort;
    }).length;
  }, [selectedCohort, consultations, students]);

  const ongoingProjectsCount = useMemo(() => projects.length, [projects]);

  const calendarSchedules = useMemo(() => {
    const projectSchedules = projects.map(p => {
      const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ef4444'];
      const pColor = colors[Number(p.id) % colors.length];
      return { id: 10000 + p.id, originalProjectId: p.id, title: `[팀별] ${p.name}`, start_date: p.start_date || '', end_date: p.end_date || p.start_date || '', category: '팀활동' as any, is_dday: false, color: pColor, is_project: true };
    });
    return [...schedules, ...projectSchedules] as any[];
  }, [schedules, projects]);

  const handleUpdateProjectDate = async (id: number, start: string, end: string) => {
    if (new Date(end) < new Date(start)) { toast.error('종료일 오입력'); return; }
    await updateProject(id, { start_date: start, end_date: end });
    toast.success('날짜 업데이트 성공');
  };

  const handleUpdateTodoDate = async (id: number, date: string) => {
    await updateTodo(id, { due_date: date });
    toast.success('할 일이 이동되었습니다');
  };

  const handleAddCohort = async () => { if (!newCohortName.trim()) return; await addCohort(newCohortName); setNewCohortName(''); setShowAddCohort(false); };
  const handleEditCohort = async () => { await updateCohort(selectedCohort, editCohortName); setShowEditCohort(false); setIsConfirmingDelete(false); };

  const today = new Date();
  const greeting = today.getHours() < 12 ? '좋은 아침이에요' : today.getHours() < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, fontWeight: 900 }}>
             {isEditingName ? (
               <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                 <input className="form-input" style={{ width: 140, height: 36, fontSize: 18 }} value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveInstructorName()} />
                 <button className="btn btn-primary" style={{ width: 36, height: 36, padding:0 }} onClick={saveInstructorName}><Check size={16} /></button>
                 <button className="btn btn-secondary" style={{ width: 36, height: 36, padding:0 }} onClick={() => { setIsEditingName(false); setTempName(instructorName); }}><X size={16} /></button>
               </div>
             ) : (
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 {greeting}, {instructorName}님 👋
                 <button className="btn-icon-hover" onClick={() => setIsEditingName(true)} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3 }}><Pencil size={14} /></button>
               </div>
             )}
           </div>
           <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>{format(today, 'yyyy년 M월 d일 (eee)', { locale: ko })} — <span style={{color:'var(--accent)', fontWeight:900}}>v8.36 Identity Fix</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
           {showAddCohort ? (
              <div style={{ display: 'flex', gap: 6 }}>
                 <input className="form-input" style={{ width: 140, height: 40 }} placeholder="기수명..." value={newCohortName} onChange={e => setNewCohortName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCohort()} />
                 <button className="btn btn-primary" style={{ width: 40, height: 40, padding:0 }} onClick={handleAddCohort}><Check size={18} /></button>
                 <button className="btn btn-secondary" style={{ width: 40, height: 40, padding:0 }} onClick={() => setShowAddCohort(false)}><X size={18} /></button>
              </div>
           ) : showEditCohort ? (
              <div style={{ display: 'flex', gap: 6 }}>
                 <input className="form-input" style={{ width: 140, height: 40 }} value={editCohortName} onChange={e => setEditCohortName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEditCohort()} />
                 <button className="btn btn-primary" style={{ width: 40, height: 40, padding:0 }} onClick={handleEditCohort}><Check size={18} /></button>
                 {isConfirmingDelete ? (
                    <button className="btn btn-primary" style={{ height: 40, background: 'var(--red)' }} onClick={() => { deleteCohort(selectedCohort, true); setShowEditCohort(false); setIsConfirmingDelete(false); }}>확인</button>
                 ) : (
                    <button className="btn btn-secondary" style={{ width: 40, height: 40, padding:0, color: 'var(--red)' }} onClick={() => setIsConfirmingDelete(true)}><Trash2 size={18} /></button>
                 )}
                 <button className="btn btn-secondary" style={{ width: 40, height: 40, padding:0 }} onClick={() => setShowEditCohort(false)}><X size={18} /></button>
              </div>
           ) : (
              <>
                <select className="form-select" style={{ width: 130, height: 40 }} value={selectedCohort} onChange={e => setSelectedCohort(e.target.value)}>
                  <option value="전체">전체 기수</option>
                  {cohorts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button className="btn btn-secondary" style={{ width: 40, height: 40, padding: 0 }} onClick={() => { setEditCohortName(selectedCohort); setShowEditCohort(true); }} disabled={selectedCohort === '전체'}><Pencil size={18} /></button>
                <button className="btn btn-primary" style={{ width: 40, height: 40, padding: 0 }} onClick={() => setShowAddCohort(true)}><Plus size={18} /></button>
              </>
           )}
        </div>
      </div>

      <div className="stat-cards-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card" onClick={() => router.push('/students')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-content"><div className="stat-card-label">전체 수강생</div><div className="stat-card-value">{totalStudentsCount}명</div></div>
          <div className="stat-card-icon" style={{ background: 'rgba(124,58,237,0.1)' }}><Users size={20} color="#8b5cf6" /></div>
        </div>
        <div className="stat-card" onClick={() => router.push('/consultations?period=this_week')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-content"><div className="stat-card-label">이번주 상담</div><div className="stat-card-value">{consultationsThisWeek}건</div></div>
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.1)' }}><MessageSquare size={20} color="#10b981" /></div>
        </div>
        <div className="stat-card" onClick={() => router.push('/teams')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-content"><div className="stat-card-label">진행 중 프로젝트</div><div className="stat-card-value">{ongoingProjectsCount}개</div></div>
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}><Rocket size={20} color="#3b82f6" /></div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
         <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} color="var(--accent)" /> 현재 마감 임박 프로젝트 (D-Day)
         </div>
         {ddayWidget}
      </div>

      <div className="dashboard-grid">
        <DashboardCalendar 
          schedules={calendarSchedules}
          todos={todos}
          onAdd={addSchedule}
          onUpdate={updateSchedule}
          onDelete={deleteSchedule}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onUpdateProjectDate={handleUpdateProjectDate}
          onUpdateTodoDate={handleUpdateTodoDate}
        />
        <div style={{ flex: 1 }}>
          <TodoList selectedDate={selectedDate} />
        </div>
      </div>
      <WorkTaskSection />
    </div>
  );
}
