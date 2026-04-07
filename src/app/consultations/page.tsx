'use client';

import { useState, useMemo } from 'react';
import { useCohort } from '@/context/CohortContext';
import { useSearchParams } from 'next/navigation';
import { Calendar, Search, Filter, X, PlusCircle, UserPlus, CheckCircle2 } from 'lucide-react';
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

  const { consultations, addConsultation, updateConsultation, students, tags } = useData();
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

  const filteredConsultations = useMemo(() => {
    return consultations
      .filter((c: Consultation) => {
        const student = students.find((s) => s.id === c.student_id);
        const matchesCohort = selectedCohort === '전체' || student?.cohort?.name === selectedCohort;
        const matchesSearch = student?.name.includes(searchTerm);
        const matchesType = filterType === '전체' || c.type === filterType;
        
        let matchesDate = true;
        const cDate = c.consulted_at;
        if (startDate && endDate) {
          matchesDate = cDate >= startDate && cDate <= endDate;
        } else if (startDate) {
          matchesDate = cDate >= startDate;
        } else if (endDate) {
          matchesDate = cDate <= endDate;
        }

        return matchesCohort && matchesSearch && matchesType && matchesDate;
      })
      .sort((a, b) => b.consulted_at.localeCompare(a.consulted_at));
  }, [selectedCohort, searchTerm, filterType, startDate, endDate, consultations, students]);

  const handleSaveConsultation = (data: Partial<Consultation>) => {
    if (editingCons) {
      updateConsultation(editingCons.id, data);
      toast.success('상담 기록이 수정되었습니다');
    } else {
      addConsultation(data as any);
      toast.success('상담 기록이 추가되었습니다');
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
          <h1 className="page-title">상담 이력 관리</h1>
          <p className="page-subtitle">수강생별 상담 기록 및 후속 조치 현황 ({selectedCohort})</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(startDate || endDate || searchTerm || filterType !== '전체') && (
            <button className="btn btn-secondary" onClick={clearFilters} style={{ height: 42, fontSize: 13 }}>
              <X size={16} /> 필터 초기화
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ height: 42, gap: 8 }}>
            <PlusCircle size={18} /> 상담 추가
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="form-input" 
              placeholder="수강생 이름 검색..." 
              style={{ paddingLeft: 40, height: 42 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <input type="date" className="form-input" style={{ height: 42, fontSize: 12, padding: '0 8px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span style={{ color: 'var(--text-muted)' }}>~</span>
              <input type="date" className="form-input" style={{ height: 42, fontSize: 12, padding: '0 8px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select 
              className="form-select" 
              style={{ height: 42 }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="전체">전체 유형</option>
              <option value="개인상담">개인상담</option>
              <option value="진로상담">진로상담</option>
              <option value="학습점검">학습점검</option>
              <option value="기타">기타</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 150, whiteSpace: 'nowrap' }}>상담 일자</th>
              <th style={{ width: 100 }}>이름</th>
              <th style={{ width: 120 }}>상담 유형</th>
              <th>상담 내용</th>
              <th>후속 조치 (Follow-up)</th>
            </tr>
          </thead>
          <tbody>
            {filteredConsultations.map((c: Consultation) => {
              const student = students.find((s) => s.id === c.student_id);
              return (
                <tr key={c.id} onClick={() => setSelectedStudent(student || null)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', width: 130 }} onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingCons(c);
                    setShowAddModal(true);
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={14} style={{ flexShrink: 0 }} />
                      {c.consulted_at}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <span style={{ color: 'var(--accent)' }}>{student?.name}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${c.type === '학습점검' ? '기획' : c.type === '진로상담' ? '완료' : '디자인'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {c.content}
                  </td>
                  <td>
                    {c.follow_up ? (
                      <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                        {c.follow_up}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredConsultations.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 0' }}>
            <div className="empty-icon">💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>기록된 상담 이력이 없습니다</div>
          </div>
        )}
      </div>

      <ConsultationModal 
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingCons(null); }}
        onSave={handleSaveConsultation}
        editingCons={editingCons}
        allStudents={currentCohortStudents}
      />

      {selectedStudent && (
        <StudentDetailPanel
          student={selectedStudent}
          tags={tags.filter(t => t.student_id === selectedStudent.id)}
          consultations={consultations.filter(c => c.student_id === selectedStudent.id)}
          onClose={() => setSelectedStudent(null)}
          initialTab="consultations"
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
          z-index: 2000; animation: fadeIn 0.2s ease-out;
        }
        .input-label {
          display: block; font-size: 13px; font-weight: 800; color: var(--text-muted); margin-bottom: 8px;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}
