'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Users, GraduationCap, MessageSquare, Check, X, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import TodoList from '@/components/dashboard/TodoList';
import WorkTaskSection from '@/components/dashboard/WorkTaskSection';
import { useCohort } from '@/context/CohortContext';
import { useData } from '@/context/DataContext';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedCohort, setSelectedCohort, cohorts, addCohort, updateCohort, deleteCohort } = useCohort();
  const { 
    students, consultations, schedules, todos, 
    addSchedule, updateSchedule, deleteSchedule,
    addTodo, toggleTodo, deleteTodo 
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
    if (saved) {
      setInstructorName(saved);
      setTempName(saved);
    }
  }, []);

  const saveName = () => {
    if (!tempName.trim()) { toast.error('이름을 입력해주세요'); return; }
    setInstructorName(tempName);
    localStorage.setItem('instructorName', tempName);
    setIsEditingName(false);
    toast.success('이름이 변경되었습니다');
  };

  // Helper to filter stats based on cohort
  const cohortFilteredStudents = useMemo(() => {
    if (selectedCohort === '전체') return students;
    return students.filter(s => s.cohort?.name === selectedCohort);
  }, [selectedCohort, students]);

  const totalStudents = cohortFilteredStudents.length;
  const activeStudents = cohortFilteredStudents.filter((s) => s.status === '수강중').length;
  
  // Real calculation for consultations this week (consistent with consultation page)
  const consultationsThisWeek = useMemo(() => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });
    
    return consultations.filter(c => {
      const cDate = new Date(c.consulted_at);
      const isThisWeek = isWithinInterval(cDate, { start: startOfCurrentWeek, end: endOfCurrentWeek });
      const student = students.find(s => s.id === c.student_id);
      const matchesCohort = selectedCohort === '전체' || student?.cohort?.name === selectedCohort;
      return isThisWeek && matchesCohort;
    }).length;
  }, [selectedCohort, consultations, students]);

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';

  const handleAddCohort = async () => {
    if (!newCohortName.trim()) return;
    await addCohort(newCohortName);
    setNewCohortName('');
    setShowAddCohort(false);
  };

  const handleEditCohort = async () => {
    await updateCohort(selectedCohort, editCohortName);
    setShowEditCohort(false);
    setIsConfirmingDelete(false);
  };

  return (
    <div className="page-wrapper">
      {/* Top Header - Greeting Left, Selector Right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 20 }}>
        <div style={{ flex: 1, paddingTop: 15 }}> {/* greeting-title 상단 15px margin */}
          <div className="greeting-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, fontWeight: 800, marginTop: 30 }}>
            {greeting}, 
            {isEditingName ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  className="form-input"
                  style={{ width: 160, height: 40, fontSize: 20, fontWeight: 700, padding: '0 12px' }}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  autoFocus
                />
                <button className="action-btn" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={saveName}>
                  <Check size={20} color="var(--green)" />
                </button>
                <button className="action-btn" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setIsEditingName(false); setTempName(instructorName); }}>
                  <X size={20} color="var(--red)" />
                </button>
              </div>
            ) : (
              <div 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => setIsEditingName(true)}
                title="클릭하여 이름 수정"
              >
                {instructorName}님 <Pencil size={18} style={{ color: 'var(--text-muted)', opacity: 0.5 }} /> 👋
              </div>
            )}
          </div>
          <div className="greeting-sub" style={{ marginTop: 6, fontSize: 14 }}>
            <span>{format(today, 'yyyy년 M월 d일 (eee)', { locale: ko })}</span>
            &nbsp;— 오늘도 수고하세요!
          </div>
        </div>

        {/* Home page button vertical alignment and sizing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, alignSelf: 'flex-end', marginBottom: 6, transform: 'translateY(-20px)' }}>
          <div style={{ position: 'relative' }}>
            <select 
              className="form-select" 
              style={{ width: 140, height: 38, padding: '0 12px', fontWeight: 700, fontSize: 14, background: 'var(--bg-card)', border: '1.5px solid var(--border)' }} 
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
            >
              <option value="전체">전체 기수</option>
              {cohorts.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          
          {showAddCohort ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input 
                className="form-input"
                style={{ width: 140, height: 38, fontSize: 14 }}
                placeholder="기수 명칭..."
                value={newCohortName}
                onChange={(e) => setNewCohortName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCohort()}
                autoFocus
              />
              <button 
                className="btn btn-primary" 
                style={{ width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 'var(--radius-sm)' }} 
                onClick={handleAddCohort}
              >
                <Check size={18} />
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 'var(--radius-sm)' }} 
                onClick={() => setShowAddCohort(false)}
              >
                <X size={18} />
              </button>
            </div>
          ) : showEditCohort ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {isConfirmingDelete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>정말 삭제할까요?</span>
                  <button 
                    className="action-btn" 
                    style={{ background: 'var(--red)', color: 'white', width: 26, height: 26, borderRadius: 6 }} 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      if (await deleteCohort(selectedCohort, true)) {
                        setIsConfirmingDelete(false);
                        setShowEditCohort(false);
                      }
                    }}
                    title="확인"
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    className="action-btn" 
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', width: 26, height: 26, borderRadius: 6 }} 
                    onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); }}
                    title="취소"
                  >
                    <X size={14} color="var(--text-muted)" />
                  </button>
                </div>
              ) : (
                <>
                  <input 
                    className="form-input"
                    style={{ width: 130, height: 38, fontSize: 14 }}
                    placeholder="새 기수 명칭..."
                    value={editCohortName}
                    onChange={(e) => setEditCohortName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditCohort()}
                    autoFocus
                  />
                  <button className="btn btn-secondary" style={{ width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }} onClick={handleEditCohort}><Check size={18} /></button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', color: 'var(--red)' }} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setIsConfirmingDelete(true);
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                  <button className="btn btn-secondary" style={{ width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }} onClick={() => { setShowEditCohort(false); setIsConfirmingDelete(false); }}><X size={18} /></button>
                </>
              )}
            </div>
          ) : (
            <>
              <button className="btn btn-secondary" style={{ height: 38, padding: '0 16px', borderRadius: 'var(--radius-md)', fontSize: 13, gap: 6 }} onClick={() => { setEditCohortName(selectedCohort); setShowEditCohort(true); }} disabled={selectedCohort === '전체'}>
                <Pencil size={15} /> 기수 편집
              </button>
              <button className="btn btn-primary" style={{ height: 38, padding: '0 16px', borderRadius: 'var(--radius-md)', fontSize: 13, gap: 6 }} onClick={() => setShowAddCohort(true)}>
                <Plus size={15} /> 기수 추가
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards-grid">
        <div 
          className="stat-card" 
          onClick={() => router.push('/students')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-content">
            <div className="stat-card-label">{selectedCohort === '전체' ? '전체 수강생' : `${selectedCohort} 수강생`}</div>
            <div className="stat-card-value">{totalStudents}명</div>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(124,58,237,0.15)' }}>
            <Users size={20} color="#a78bfa" />
          </div>
        </div>
        <div 
          className="stat-card" 
          onClick={() => router.push('/students?status=수강중')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-content">
            <div className="stat-card-label">{selectedCohort === '전체' ? '전체 수강중' : `${selectedCohort} 수강중`}</div>
            <div className="stat-card-value">{activeStudents}명</div>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <GraduationCap size={20} color="#34d399" />
          </div>
        </div>
        <div 
          className="stat-card" 
          onClick={() => router.push('/consultations?period=this_week')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-content">
            <div className="stat-card-label">이번주 상담 ({selectedCohort})</div>
            <div className="stat-card-value">{consultationsThisWeek}건</div>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <MessageSquare size={20} color="#f87171" />
          </div>
        </div>
      </div>

      {/* Calendar + Todo Grid */}
      <div className="dashboard-grid">
        <DashboardCalendar 
          schedules={schedules}
          onAdd={addSchedule}
          onUpdate={updateSchedule}
          onDelete={deleteSchedule}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        <div style={{ flex: 1 }}>
          <TodoList 
            selectedDate={selectedDate}
          />
        </div>
      </div>

      {/* NEW: Work Task / GPTs Section */}
      <WorkTaskSection />
    </div>
  );
}
