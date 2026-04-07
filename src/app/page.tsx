'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, isWithinInterval, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Users, GraduationCap, MessageSquare, Check, X, Pencil, Plus, Trash2, Clock, Calendar as CalIcon } from 'lucide-react';
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
    students, consultations, schedules, todos, projects,
    addSchedule, updateSchedule, deleteSchedule,
    addTodo, toggleTodo, deleteTodo, updateProject
  } = useData();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddCohort, setShowAddCohort] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [showEditCohort, setShowEditCohort] = useState(false);
  const [editCohortName, setEditCohortName] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // Instructor name state
  const [instructorName, setInstructorName] = useState('김강사');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('김강사');

  useEffect(() => {
    const saved = localStorage.getItem('instructorName');
    if (saved) { setInstructorName(saved); setTempName(saved); }
  }, []);

  const saveName = () => {
    if (!tempName.trim()) { toast.error('이름을 입력해주세요'); return; }
    setInstructorName(tempName);
    localStorage.setItem('instructorName', tempName);
    setIsEditingName(false);
    toast.success('이름이 변경되었습니다');
  };

  // Fix 2: Multi D-Day Logic (v8.28)
  const ddayWidget = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const activeProjects = projects
      .filter(p => p.end_date && new Date(p.end_date) >= today)
      .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());
      
    if (activeProjects.length === 0) return null;
    
    return (
      <div className="dday-hero-container" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12, marginBottom: 24, cursor: 'grab' }}>
        {activeProjects.map((p, idx) => {
           const diff = differenceInDays(new Date(p.end_date!), today);
           const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
           const pColor = colors[idx % colors.length];
           
           return (
              <div key={`dday-card-${p.id}`} 
                className="dday-card" 
                style={{ 
                  flexShrink: 0, 
                  background: pColor, 
                  color: 'white', 
                  padding: '16px 20px', 
                  borderRadius: 20, 
                  minWidth: 260, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  boxShadow: '0 6px 20px rgba(0,0,0,0.1)' 
                }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>마감 D-{diff === 0 ? 'Day' : diff}</div>
                  <div style={{ fontSize: 15, fontWeight: 950, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 950 }}>D-{diff}</div>
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

  const totalStudents = cohortFilteredStudents.length;
  const activeStudents = cohortFilteredStudents.filter((s) => s.status === '수강중').length;
  
  const consultationsThisWeek = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
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

  const calendarSchedules = useMemo(() => {
    const projectSchedules = projects.map(p => {
      const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ef4444'];
      const pColor = colors[p.id % colors.length];
      return {
        id: 10000 + p.id,
        originalProjectId: p.id,
        title: `[팀별] ${p.name}`,
        start_date: p.start_date || '',
        end_date: p.end_date || p.start_date || '',
        category: '팀활동' as any,
        is_dday: false,
        color: pColor,
        is_project: true
      };
    });
    return [...schedules, ...projectSchedules] as any[];
  }, [schedules, projects]);

  const handleUpdateProjectDate = async (id: number, start: string, end: string) => {
    if (new Date(end) < new Date(start)) {
      toast.error('종료일은 시작일 이후여야 합니다.');
      return;
    }
    await updateProject(id, { start_date: start, end_date: end });
    toast.success('프로젝트 일정이 변경되었습니다.');
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? '좋은 아침이에요' : today.getHours() < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

  const handleAddCohort = async () => { if (!newCohortName.trim()) return; await addCohort(newCohortName); setNewCohortName(''); setShowAddCohort(false); };
  const handleEditCohort = async () => { await updateCohort(selectedCohort, editCohortName); setShowEditCohort(false); setIsConfirmingDelete(false); };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, fontWeight: 900 }}>{greeting}, {instructorName}님 👋</div>
           <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>{format(today, 'yyyy년 M월 d일 (eee)', { locale: ko })} — 오늘의 현황입니다. <small style={{opacity:0.3}}>v8.28</small></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
           <select className="form-select" style={{ width: 130, height: 40 }} value={selectedCohort} onChange={e => setSelectedCohort(e.target.value)}>
             <option value="전체">전체 기수</option>
             {cohorts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
           </select>
           <button className="btn btn-secondary" style={{ width: 40, height: 40, padding: 0 }} onClick={() => setShowAddCohort(true)}><Plus size={18} /></button>
        </div>
      </div>

      {ddayWidget}

      <div className="stat-cards-grid">
        <div className="stat-card" onClick={() => router.push('/students')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-content"><div className="stat-card-label">전체 수강생</div><div className="stat-card-value">{totalStudents}명</div></div>
          <div className="stat-card-icon" style={{ background: 'rgba(124,58,237,0.1)' }}><Users size={20} color="#8b5cf6" /></div>
        </div>
        <div className="stat-card" onClick={() => router.push('/consultations?period=this_week')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-content"><div className="stat-card-label">이번주 상담</div><div className="stat-card-value">{consultationsThisWeek}건</div></div>
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.1)' }}><MessageSquare size={20} color="#10b981" /></div>
        </div>
        <div className="stat-card" onClick={() => router.push('/projects')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-content"><div className="stat-card-label">진행 프로젝트</div><div className="stat-card-value">{projects.length}개</div></div>
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}><CalIcon size={20} color="#3b82f6" /></div>
        </div>
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
        />
        <div style={{ flex: 1 }}>
          <TodoList selectedDate={selectedDate} />
        </div>
      </div>

      <WorkTaskSection />
    </div>
  );
}
