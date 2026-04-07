'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, User, Award, MessageSquare, Plus, Trash2, Edit3, ExternalLink, Users, Bookmark
} from 'lucide-react';
import { Student, ProjectScore, Consultation, ConsultationType, Project } from '@/lib/types';
import { StarRating } from '../common/StarRating';
import toast from 'react-hot-toast';
import { useData } from '@/context/DataContext';
import ReactMarkdown from 'react-markdown';
import ConsultationModal from '../common/ConsultationModal';
import { format, parseISO } from 'date-fns';

interface Props {
  student: Student;
  onClose: () => void;
  tags: { id: number, tag: string }[];
  consultations: Consultation[];
  initialTab?: 'info' | 'projects' | 'consultations';
}

export default function StudentDetailPanel({ 
  student: initialStudent, onClose, tags: initialTags, consultations: initialConsultations, initialTab = 'info'
}: Props) {
  const { 
    projects, students, teams, teamMembers, consultations: allConsultations, projectLogs,
    addConsultation, updateConsultation, deleteConsultation 
  } = useData();

  const [currentStudentId] = useState(initialStudent.id);
  const student = useMemo(() => students.find(s => s.id === currentStudentId) || initialStudent, [students, currentStudentId, initialStudent]);

  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'consultations'>(initialTab);
  const [showConsModal, setShowConsModal] = useState(false);
  const [editingCons, setEditingCons] = useState<Consultation | null>(null);

  // Merged Timeline (Team Logs + Individual Logs)
  const studentTimeline = useMemo(() => {
    const individual = allConsultations
      .filter(c => Number(c.student_id) === Number(currentStudentId))
      .map(c => ({ ...c, isTeam: false, date: c.consulted_at }));
    const myTeamIds = teamMembers.filter(tm => Number(tm.student_id) === Number(currentStudentId)).map(tm => tm.team_id);
    const teamInLogs = projectLogs.filter(pl => myTeamIds.includes(pl.team_id)).map(pl => {
      const t = teams.find(team => team.id === pl.team_id);
      return { 
        ...pl, isTeam: true, date: pl.log_date, student_id: currentStudentId, consulted_at: pl.log_date,
        type: pl.type || '회의록', team_name: t?.team_name || '팀'
      };
    });
    return [...individual, ...teamInLogs].sort((a, b) => b.date.localeCompare(a.date));
  }, [allConsultations, projectLogs, teamMembers, currentStudentId, teams]);

  const calculateGPA = () => {
    if (student.project_scores.length === 0) return '0.00';
    const total = student.project_scores.reduce((acc, s) => acc + Number(s.team_score || s.average_score || 0), 0);
    return (total / student.project_scores.length).toFixed(2);
  };

  const handleConsSubmit = async (data: Partial<Consultation>) => {
    try {
      if (editingCons) await updateConsultation(editingCons.id, data);
      else await addConsultation({ ...data, student_id: student.id } as any);
      setShowConsModal(false);
    } catch (error) {}
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = parseISO(dateStr.replace(' ', 'T'));
      return format(d, 'MM-dd HH:mm');
    } catch {
      return dateStr.slice(5, 16);
    }
  };

  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        
        <div className="detail-panel-header" style={{ position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={24} /></button>
          <div className="detail-avatar">{student.name[0]}</div>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>{student.name}</h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{student.cohort?.name} · {student.email}</div>
          </div>
        </div>

        {/* Tab Buttons - CSS Compatible */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          {[
            { id: 'info', label: '정보', icon: User },
            { id: 'projects', label: '성취도', icon: Award },
            { id: 'consultations', label: '상담/활동', icon: MessageSquare }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ flex: 1, padding: '16px 0', border: 'none', background: 'none', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="detail-panel-body">
           {activeTab === 'info' && (
             <>
                <section className="detail-section">
                   <div className="detail-section-title">기본 정보</div>
                   <div className="card" style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 12 }}>
                      <div className="detail-row"><span className="detail-label">휴대전화</span><span className="detail-value">{student.phone || '-'}</span></div>
                      <div className="detail-row"><span className="detail-label">입과일</span><span className="detail-value">{student.joined_at || '-'}</span></div>
                      <div className="detail-row"><span className="detail-label">상태</span><span className={`badge badge-${student.status}`}>{student.status}</span></div>
                   </div>
                </section>
                <section className="detail-section">
                   <div className="detail-section-title">메모</div>
                   <div className="card" style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 12, fontSize: 13 }}>
                      <ReactMarkdown className="markdown-body">{student.note || '기록된 메모가 없습니다.'}</ReactMarkdown>
                   </div>
                </section>
             </>
           )}

           {activeTab === 'projects' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div className="detail-section-title">학업 성취도</div>
                   <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent)' }}>GPA {calculateGPA()}</div>
                </div>
                {student.project_scores.map(score => {
                   const proj = projects.find(p => p.id === score.project_id);
                   return (
                     <div key={`ps-${score.id}`} className="card" style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                           <span style={{ fontSize: 14, fontWeight: 700 }}>{proj?.name}</span>
                           <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent)' }}>{(Number(score.team_score || score.average_score || 0)).toFixed(1)}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                           {proj?.score_categories.map(cat => (
                             <div key={`cat-${cat.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cat.label}</span>
                                <StarRating value={Number(score.category_scores?.[cat.id] || 0)} readonly size={11} />
                             </div>
                           ))}
                        </div>
                     </div>
                   );
                })}
             </div>
           )}

           {activeTab === 'consultations' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <button className="btn btn-primary" style={{ height: 40, gap: 8 }} onClick={() => { setEditingCons(null); setShowConsModal(true); }}>
                   <Plus size={16} /> 기록 추가하기
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   {studentTimeline.map((c: any) => (
                     <div key={`hist-${c.isTeam ? 't' : 's'}-${c.id}`} className="consult-item" style={{ borderLeft: `4px solid ${c.isTeam ? 'var(--accent)' : '#94a3b8'}` }}>
                        <div className="consult-meta">
                           <span className="badge">{c.type}</span>
                           <span>{formatShortDate(c.date)}</span>
                           <span style={{ fontWeight: 700 }}>{c.isTeam ? `${c.team_name} (팀 활동)` : '개인 상담'}</span>
                           {!c.isTeam && (
                             <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                               <button onClick={() => { setEditingCons(c); setShowConsModal(true); }} style={{ padding: 2, background: 'none', border: 'none', color: 'var(--text-muted)' }}><Edit3 size={12} /></button>
                               <button onClick={() => deleteConsultation(c.id)} style={{ padding: 2, background: 'none', border: 'none', color: 'var(--red)', opacity: 0.6 }}><Trash2 size={12} /></button>
                             </div>
                           )}
                        </div>
                        <div className="consult-content markdown-body"><ReactMarkdown>{c.content}</ReactMarkdown></div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>

      <ConsultationModal isOpen={showConsModal} onClose={() => setShowConsModal(false)} onSave={handleConsSubmit} editingCons={editingCons} student={student} />
    </div>
  );
}
