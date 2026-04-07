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
import { formatDateTime } from '@/lib/utils';

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

  // Fix 1: Global Sync - Merge Consultation and ProjectLogs
  const allLogs = useMemo(() => {
    const individual = consultations.map(c => ({ 
      ...c, isTeam: false, date: c.consulted_at, 
      display_name: students.find(s => s.id === c.student_id)?.name || '알 수 없음'
    }));
    
    const teamLogs = projectLogs.map(pl => {
      const t = teams.find(team => team.id === pl.team_id);
      return {
        ...pl, isTeam: true, date: pl.log_date, type: pl.type || '회의록',
        display_name: t ? `${t.team_name} (팀)` : '팀 로그'
      };
    });
    
    return [...individual, ...teamLogs];
  }, [consultations, projectLogs, students, teams]);

  const filteredLogs = useMemo(() => {
    return allLogs
      .filter((l: any) => {
        // For individual logs, check cohort. For team logs, we allow them or group by project's cohort (simplified for now).
        let matchesCohort = true;
        if (!l.isTeam) {
          const student = students.find((s) => s.id === l.student_id);
          matchesCohort = selectedCohort === '전체' || student?.cohort?.name === selectedCohort;
        }
        
        const matchesSearch = l.display_name.toLowerCase().includes(searchTerm.toLowerCase()) || l.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === '전체' || l.type === filterType;
        
        let matchesDate = true;
        const cDate = l.date; // already mapped correctly
        if (startDate && endDate) {
          matchesDate = cDate >= startDate && cDate <= endDate;
        } else if (startDate) {
          matchesDate = cDate >= startDate;
        } else if (endDate) {
          matchesDate = cDate <= endDate;
        }

        return matchesCohort && matchesSearch && matchesType && matchesDate;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedCohort, searchTerm, filterType, startDate, endDate, allLogs, students]);

  const handleSaveConsultation = (data: Partial<Consultation>) => {
    if (editingCons) {
      updateConsultation(editingCons.id, data);
      toast.success('기록이 수정되었습니다');
    } else {
      addConsultation(data as any);
      toast.success('기록이 추가되었습니다');
    }
    setShowAddModal(false);
    setEditingCons(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('전체');
    setStartDate('');
    setEndDate('');
  };

  const currentCohortStudents = students.filter(s => selectedCohort === '전체' || s.cohort?.name === selectedCohort);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">상담 및 활동 이력 관리</h1>
          <p className="page-subtitle">수강생 및 팀별 활동 내역 통합 관리 (v8.25)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(startDate || endDate || searchTerm || filterType !== '전체') && (
            <button className="btn btn-secondary" onClick={clearFilters} style={{ height: 42, fontSize: 13 }}>
              <X size={16} /> 필터 초기화
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ height: 42, gap: 8 }}>
            <PlusCircle size={18} /> 상담 기록 추가
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="form-input" 
              placeholder="이름 또는 내용 검색..." 
              style={{ paddingLeft: 40, height: 42 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <input type="date" className="form-input" style={{ height: 42, fontSize: 12, padding: '0 8px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span style={{ color: 'var(--text-muted)' }}>—</span>
              <input type="date" className="form-input" style={{ height: 42, fontSize: 12, padding: '0 8px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select className="form-select" style={{ height: 42 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="전체">전체 유형</option>
              <optgroup label="개인 상담">
                <option value="개인상담">개인상담</option>
                <option value="진로상담">진로상담</option>
                <option value="학습점검">학습점검</option>
              </optgroup>
              <optgroup label="팀 활동">
                <option value="회의록">회의록</option>
                <option value="멘토피드백">멘토피드백</option>
                <option value="진행보고">진행보고</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 160 }}>일시</th>
              <th style={{ width: 140 }}>이름/팀명</th>
              <th style={{ width: 120 }}>구분</th>
              <th>주요 내용</th>
              <th style={{ width: 100 }}>로그 타입</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((l: any) => (
              <tr key={`${l.isTeam ? 't' : 's'}-${l.id}`} onClick={() => !l.isTeam && setSelectedStudent(students.find(s => s.id === l.student_id) || null)} style={{ cursor: l.isTeam ? 'default' : 'pointer' }}>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {formatDateTime(l.date)}
                </td>
                <td style={{ fontWeight: 700 }}>
                  <span style={{ color: l.isTeam ? 'var(--accent)' : 'var(--text-primary)' }}>{l.display_name}</span>
                </td>
                <td>
                  <span className={`badge ${l.isTeam ? 'badge-p1' : 'badge-p3'}`}>{l.type}</span>
                </td>
                <td style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {l.content}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.isTeam ? '👥 팀활동' : '👤 개별상담'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredLogs.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 0' }}>
            <div className="empty-icon">💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>검색 결과가 없습니다</div>
          </div>
        )}
      </div>

      <ConsultationModal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingCons(null); }} onSave={handleSaveConsultation} editingCons={editingCons} allStudents={currentCohortStudents} />

      {selectedStudent && (
        <StudentDetailPanel student={selectedStudent} tags={tags.filter(t => t.student_id === selectedStudent.id)} consultations={consultations.filter(c => c.student_id === selectedStudent.id)} onClose={() => setSelectedStudent(null)} initialTab="consultations" />
      )}
    </div>
  );
}
