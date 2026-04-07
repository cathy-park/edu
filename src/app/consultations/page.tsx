'use client';

import { useState, useMemo } from 'react';
import { useCohort } from '@/context/CohortContext';
import { useSearchParams } from 'next/navigation';
import { Calendar, Search, Filter, X, PlusCircle, UserPlus, CheckCircle2, MessageSquare } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import { Consultation, ConsultationType, Student } from '@/lib/types';
import { useData } from '@/context/DataContext';
import StudentDetailPanel from '@/components/students/StudentDetailPanel';
import ConsultationModal from '@/components/common/ConsultationModal';

export default function ConsultationPage() {
  const { selectedCohort } = useCohort();
  const searchParams = useSearchParams();
  const periodParam = searchParams.get('period');

  const { consultations, addConsultation, updateConsultation, students, tags, projectLogs, teams } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('전체');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCons, setEditingCons] = useState<Consultation | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [startDate, setStartDate] = useState(
    periodParam === 'this_week' 
      ? format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') 
      : ''
  );
  const [endDate, setEndDate] = useState(
    periodParam === 'this_week' 
      ? format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') 
      : ''
  );

  // Fix 1: Unified Log Sync (RE-VERIFIED and STABILIZED v8.27)
  const allLogs = useMemo(() => {
    // 1. Individual consultations
    const individual = consultations.map(c => ({ 
      id: `c-${c.id}`,
      originalId: c.id,
      isTeam: false,
      // Ensure we use Number for matching
      student_id: Number(c.student_id),
      dateLine: c.consulted_at || '',
      type: c.type || '개인상담',
      content: c.content || '',
      display_name: students.find(s => Number(s.id) === Number(c.student_id))?.name || '기타'
    }));
    
    // 2. Team project logs
    const teamLogs = projectLogs.map(pl => {
      const t = teams.find(team => Number(team.id) === Number(pl.team_id));
      return {
        id: `pl-${pl.id}`,
        originalId: pl.id,
        isTeam: true,
        student_id: -1,
        dateLine: pl.log_date || '',
        type: pl.type || '회의록',
        content: pl.content || '',
        display_name: t ? `${t.team_name} (팀)` : '팀 활동'
      };
    });
    
    return [...individual, ...teamLogs];
  }, [consultations, projectLogs, students, teams]);

  const filteredLogs = useMemo(() => {
    return allLogs
      .filter((l: any) => {
        // Filter by Cohort (only for individual logs)
        let matchesCohort = true;
        if (!l.isTeam) {
          const student = students.find((s) => Number(s.id) === Number(l.student_id));
          matchesCohort = selectedCohort === '전체' || student?.cohort?.name === selectedCohort;
        }
        
        // Filter by Search (Name or Content)
        const sMatch = l.display_name.toLowerCase().includes(searchTerm.toLowerCase());
        const cMatch = l.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = sMatch || cMatch;
          
        // Filter by Type
        const matchesType = filterType === '전체' || l.type === filterType;
        
        // Filter by Date
        let matchesDate = true;
        const dStr = l.dateLine.split('T')[0];
        if (startDate && endDate) {
          matchesDate = dStr >= startDate && dStr <= endDate;
        } else if (startDate) {
          matchesDate = dStr >= startDate;
        } else if (endDate) {
          matchesDate = dStr <= endDate;
        }

        return matchesCohort && matchesSearch && matchesType && matchesDate;
      })
      .sort((a, b) => b.dateLine.localeCompare(a.dateLine));
  }, [selectedCohort, searchTerm, filterType, startDate, endDate, allLogs, students]);

  const handleSaveConsultation = (data: Partial<Consultation>) => {
    if (editingCons) {
      updateConsultation(editingCons.id, data);
      toast.success('기록이 수정되었습니다');
    } else {
      addConsultation(data as any);
      toast.success('기록이 저장되었습니다');
    }
    setShowAddModal(false);
    setEditingCons(null);
  };

  // Fix 2: HARDWARE date formatting inside loop
  const renderDate = (d: string) => {
    if (!d) return '-';
    // 2026-04-08T00:00:00+00:00 -> 2026-04-08 20:01
    const clean = d.replace('T', ' ').split('.')[0].replace(/(\+\d{2}:\d{2}|Z)$/, '');
    const final = clean.length > 16 ? clean.substring(0, 16) : clean;
    return final.includes(':') ? final : `${final} 00:00`;
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">상담 및 활동 통합 이력 <small style={{fontSize: 12, opacity: 0.4}}>v8.27</small></h1>
          <p className="page-subtitle">수강생/팀별 활동 기록 통합 관리 시스템</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => { setEditingCons(null); setShowAddModal(true); }} style={{ height: 42, gap: 8 }}>
            <PlusCircle size={18} /> 활동 추가
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="이름 또는 내용 검색..." style={{ paddingLeft: 40, height: 42 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} />
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="전체">전체 유형</option>
            <option value="회의록">회의록(팀)</option>
            <option value="개인상담">개인상담</option>
            <option value="학습점검">학습점검</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 150 }}>일시</th>
              <th style={{ width: 140 }}>대상 (이름/팀)</th>
              <th style={{ width: 110 }}>유형</th>
              <th>상세 내용</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((l: any) => (
              <tr key={l.id} onClick={() => { if(!l.isTeam){ const s = students.find(std => Number(std.id) === Number(l.student_id)); if(s) setSelectedStudent(s); } }} style={{ cursor: l.isTeam ? 'default' : 'pointer' }}>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{renderDate(l.dateLine)}</td>
                <td style={{ fontWeight: 700, color: l.isTeam ? 'var(--accent)' : 'inherit' }}>{l.display_name}</td>
                <td><span className={`badge ${l.isTeam ? 'badge-p1' : 'badge-p4'}`}>{l.type}</span></td>
                <td style={{ fontSize: 14 }}>{l.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>통합 로그 내역이 없습니다.</div>}
      </div>

      <ConsultationModal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setEditingCons(null); }} 
        onSave={handleSaveConsultation} 
        editingCons={editingCons}
        allStudents={students} 
      />

      {selectedStudent && (
        <StudentDetailPanel student={selectedStudent} tags={[]} consultations={[]} onClose={() => setSelectedStudent(null)} initialTab="consultations" />
      )}
    </div>
  );
}
