'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { Student, StudentStatus } from '@/lib/types';
import StudentModal from '@/components/students/StudentModal';
import StudentDetailPanel from '@/components/students/StudentDetailPanel';
import { useCohort } from '@/context/CohortContext';
import { useData } from '@/context/DataContext';
import toast from 'react-hot-toast';

const PAGE_SIZE = 8;
const STATUS_FILTERS: (StudentStatus | '전체')[] = ['전체', '수강중', '수료', '탈퇴'];

function getTagClass(tag: string) {
  if (tag.includes('기획')) return 'tag-기획강점';
  if (tag.includes('개발')) return 'tag-개발관심';
  if (tag.includes('디자인')) return 'tag-디자인';
  return 'tag-default';
}

function GpaCell({ gpa }: { gpa?: number }) {
  if (gpa === undefined || gpa === null || gpa <= 0) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
  const cls = gpa >= 3.5 ? 'gpa-high' : gpa >= 2.5 ? 'gpa-mid' : 'gpa-low';
  return <span className={cls}>{gpa.toFixed(1)}</span>;
}

function ProgressCell({ value }: { value?: number }) {
  const pct = value ?? 0;
  const color = pct >= 85 ? 'var(--green)' : pct >= 70 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div className="progress-wrap" style={{ minWidth: 100 }}>
      <div className="progress-bg">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="progress-pct">{pct}%</span>
    </div>
  );
}

export default function StudentsPage() {
  const { selectedCohort } = useCohort();
  const { students, consultations, tags, addStudent, updateStudent, deleteStudent, updateStudentTags } = useData();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | '전체'>('전체');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !search ||
        s.name.includes(search) ||
        (s.phone ?? '').includes(search) ||
        (s.email ?? '').includes(search);
      const matchCohort = selectedCohort === '전체' || s.cohort?.name === selectedCohort;
      const matchStatus = statusFilter === '전체' || s.status === statusFilter;
      return matchSearch && matchCohort && matchStatus;
    });
  }, [students, search, selectedCohort, statusFilter]);

  const studentConsultations = useMemo(() => {
    if (!selected) return [];
    return consultations.filter(c => c.student_id === selected.id);
  }, [selected, consultations]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status && STATUS_FILTERS.includes(status as any)) {
      setStatusFilter(status as any);
      setPage(1);
    }

    const id = searchParams.get('id');
    if (id) {
      const found = students.find((s) => s.id === parseInt(id));
      if (found) {
        setSelected(found);
      }
    }
  }, [searchParams, students]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openAdd = () => { setEditTarget(null); setShowModal(true); };
  const openEdit = (s: Student) => { setEditTarget(s); setShowModal(true); setSelected(null); };

  const handleSave = async (data: any) => {
    const { inputTags, ...studentData } = data;
    
    if (editTarget) {
      await updateStudent(editTarget.id, studentData);
      if (inputTags) await updateStudentTags(editTarget.id, inputTags);
      toast.success('수강생 정보가 수정되었습니다');
    } else {
      const newId = await addStudent({
        ...studentData,
        project_scores: [],
        gpa: 0,
        attendance_rate: studentData.attendance_rate || 0,
        joined_at: new Date().toISOString().split('T')[0],
      });
      if (newId && inputTags) await updateStudentTags(newId, inputTags);
      // toast.success is already called inside addStudent
    }
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await deleteStudent(id);
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <div className="page-title">수강생 관리</div>
          <div className="page-subtitle">{selectedCohort} 수강생 {filtered.length}명</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={15} /> 수강생 추가
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <Search className="search-icon" />
          <input
            className="search-input"
            placeholder="이름, 연락처 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="filter-chips">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-chip ${statusFilter === f ? 'active' : ''}`}
              onClick={() => { setStatusFilter(f); setPage(1); }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>기수</th>
              <th>경력</th>
              <th>나이</th>
              <th>연락처</th>
              <th>상태</th>
              <th>GPA</th>
              <th>출석률</th>
              <th>관심 분야</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <div>검색 결과가 없습니다</div>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((s) => {
                const studentTags = tags.filter((t) => t.student_id === s.id);
                return (
                  <tr key={s.id} onClick={() => setSelected(s)}>
                    <td className="td-name">{s.name}</td>
                    <td className="td-muted">{s.cohort?.name ?? '-'}</td>
                     <td className="td-muted">
                       {s.experience || '비전공자'}
                       {s.experience_detail ? ` (${s.experience_detail})` : ''}
                     </td>
                    <td className="td-muted">{s.age ? `${s.age}세` : '-'}</td>
                    <td className="td-muted">{s.phone ?? '-'}</td>
                    <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                    <td><GpaCell gpa={s.gpa} /></td>
                    <td><ProgressCell value={s.attendance_rate} /></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {studentTags.map((t) => (
                          <span key={t.id} className={`tag-chip ${getTagClass(t.tag)}`}>{t.tag}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="td-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="action-btn" title="상세보기" onClick={() => setSelected(s)}>
                          <Eye size={14} />
                        </button>
                        <button className="action-btn" title="수정" onClick={() => openEdit(s)}>
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn danger" title="삭제" onClick={() => handleDelete(s.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`pagination-btn ${p === currentPage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>›</button>
          </div>
        )}
      </div>

      {selected && (
        <StudentDetailPanel
          student={selected}
          tags={tags.filter((t) => t.student_id === selected.id)}
          consultations={studentConsultations}
          onClose={() => setSelected(null)}
        />
      )}

      {showModal && (
        <StudentModal
          student={editTarget}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
