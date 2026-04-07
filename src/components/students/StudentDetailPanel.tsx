'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, User, BookOpen, 
  Plus, Trash2, Award, MessageSquare,
  Edit3, StickyNote, ExternalLink
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

interface Note {
  id: number;
  text: string;
  createdAt: string;
}

export default function StudentDetailPanel({ 
  student: initialStudent, 
  onClose, 
  tags: initialTags, 
  consultations: initialConsultations,
  initialTab = 'info'
}: Props) {
  const { 
    projects, students, teamMembers, tags: allTags, consultations: allConsultations,
    projectLogs,
    addConsultation, updateConsultation, deleteConsultation,
    updateProjectScore 
  } = useData();

  const [currentStudentId, setCurrentStudentId] = useState(initialStudent.id);
  
  const student = useMemo(() => 
    students.find(s => s.id === currentStudentId) || initialStudent,
    [students, currentStudentId, initialStudent]
  );

  const studentTags = useMemo(() => 
    allTags.filter(t => t.student_id === currentStudentId),
    [allTags, currentStudentId]
  );

  // MERGED TIMELINE (Individual + Team Logs)
  const studentTimeline = useMemo(() => {
    // 1. Individual consultations
    const individual = allConsultations
      .filter(c => c.student_id === currentStudentId)
      .map(c => ({ ...c, isTeam: false, date: c.consulted_at }));
    
    // 2. Team logs for teams this student is in
    const myTeams = teamMembers.filter(tm => tm.student_id === currentStudentId).map(tm => tm.team_id);
    const team = projectLogs
      .filter(pl => myTeams.includes(pl.team_id))
      .map(pl => ({ ...pl, isTeam: true, date: pl.log_date, student_id: currentStudentId, consulted_at: pl.log_date }));
    
    return [...individual, ...team].sort((a, b) => b.date.localeCompare(a.date));
  }, [allConsultations, projectLogs, teamMembers, currentStudentId]);

  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'consultations'>(initialTab);
  const [consFilter, setConsFilter] = useState<ConsultationType>('전체');
  
  // Notes state
  const parseNotes = (): Note[] => {
    if (!student.note) return [];
    try {
      const parsed = JSON.parse(student.note);
      if (Array.isArray(parsed)) return parsed;
      return [{ id: 1, text: student.note, createdAt: student.joined_at || '' }];
    } catch {
      if (student.note?.trim()) return [{ id: 1, text: student.note, createdAt: '' }];
      return [];
    }
  };
  const [notes, setNotes] = useState<Note[]>(parseNotes);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showConsModal, setShowConsModal] = useState(false);
  const [editingCons, setEditingCons] = useState<Consultation | null>(null);

  const calculateGPA = () => {
    if (student.project_scores.length === 0) return '0.00';
    const total = student.project_scores.reduce((acc, s) => {
      const val = s.team_score || s.average_score || 0;
      return acc + val;
    }, 0);
    return (total / student.project_scores.length).toFixed(2);
  };

  const gpaNum = parseFloat(calculateGPA());
  const gpaColor = gpaNum >= 4 ? 'var(--green)' : gpaNum >= 3 ? 'var(--accent)' : 'var(--yellow)';

  const [calculatedAttendance] = useState(() => Math.floor(85 + Math.random() * 15));

  const handleOpenConsModal = (c?: Consultation) => {
    setEditingCons(c || null);
    setShowConsModal(true);
  };

  const handleConsSubmit = async (data: Partial<Consultation>) => {
    try {
      if (editingCons) {
        await updateConsultation(editingCons.id, data);
        toast.success('상담 이력이 수정되었습니다');
      } else {
        await addConsultation({ ...data, student_id: student.id } as any);
      }
      setShowConsModal(false);
    } catch (error) { console.error('Submit Error:', error); }
  };

  const openNoteModal = (note?: Note) => {
    if (note) { setEditingNote(note); setNoteText(note.text); }
    else { setEditingNote(null); setNoteText(''); }
    setShowNoteModal(true);
  };

  const handleNoteSave = () => {
    if (!noteText.trim()) return toast.error('내용을 입력해주세요');
    if (editingNote) {
      setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, text: noteText.trim() } : n));
      toast.success('메모가 수정되었습니다');
    } else {
      setNotes(prev => [...prev, { id: Date.now(), text: noteText.trim(), createdAt: new Date().toISOString().split('T')[0] }]);
      toast.success('메모가 추가되었습니다');
    }
    setShowNoteModal(false);
  };

  const filteredTimeline = useMemo(() => {
    return studentTimeline.filter((c: any) => 
      consFilter === '전체' || c.type === consFilter
    );
  }, [studentTimeline, consFilter]);

  const participatedProjects = useMemo(() => {
    const memberships = teamMembers.filter(tm => tm.student_id === student.id);
    const projectMap = new Map<number, { project: Project, score?: ProjectScore }>();
    
    memberships.forEach(m => {
      const team = useData().teams.find(t => t.id === m.team_id);
      if (team) {
        const proj = projects.find(p => p.id === team.project_id);
        if (proj) projectMap.set(proj.id, { project: proj });
      }
    });

    student.project_scores.forEach(s => {
      const existing = projectMap.get(s.project_id);
      if (existing) {
        projectMap.set(s.project_id, { ...existing, score: s });
      } else {
        const proj = projects.find(p => p.id === s.project_id);
        if (proj) projectMap.set(proj.id, { project: proj, score: s });
      }
    });
    return Array.from(projectMap.values()).sort((a, b) => b.project.id - a.project.id);
  }, [student, projects, teamMembers, useData().teams]);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = parseISO(dateStr);
      return format(d, 'MM-dd HH:mm');
    } catch (e) {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : format(d, 'MM-dd HH:mm');
    }
  };

  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
        
        <div className="detail-panel-header" style={{ position: 'relative', padding: '32px 24px 24px' }}>
          <button 
             className="action-btn" 
             onClick={onClose} 
             style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, color: 'var(--text-primary)', background: 'var(--bg-hover)' }}>
             <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="detail-avatar" style={{ width: 64, height: 64, fontSize: 24 }}>{student.name[0]}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 className="page-title" style={{ margin: 0, fontSize: 24 }}>{student.name}</h2>
                <span className={`badge badge-${student.status}`}>{student.status}</span>
              </div>
              <div className="page-subtitle" style={{ marginTop: 4 }}>{student.cohort?.name} · {student.age}세 · {student.email}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
           {[
             { id: 'info', label: '정보', icon: User },
             { id: 'projects', label: '성취도', icon: Award },
             { id: 'consultations', label: '상담', icon: MessageSquare }
           ].map(tab => (
             <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                style={{ 
                  flex: 1, padding: '16px 0', border: 'none', background: 'none', 
                  fontSize: 13.5, fontWeight: activeTab === tab.id ? 700 : 500, 
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: `2.5px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                <tab.icon size={16} /> {tab.label}
             </button>
           ))}
        </div>

        <div className="detail-panel-body" style={{ background: 'var(--bg-base)', flex: 1, overflowY: 'auto' }}>
           {activeTab === 'info' && (
             <div style={{ animation: 'fadeIn 0.2s' }}>
                <div className="card" style={{ marginBottom: 20 }}>
                   <div className="detail-section-title" style={{ marginBottom: 14 }}>상세 정보</div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="detail-row"><span className="detail-label">휴대전화</span><span className="detail-value">{student.phone || '-'}</span></div>
                      <div className="detail-row"><span className="detail-label">입과일</span><span className="detail-value">{student.joined_at || '-'}</span></div>
                      <div className="detail-row" style={{ gridColumn: 'span 2' }}>
                        <span className="detail-label">출석률</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                           <div className="progress-bg" style={{ width: 100 }}><div className="progress-fill" style={{ width: `${calculatedAttendance}%`, background: 'var(--green)' }} /></div>
                           <span className="detail-value" style={{ color: 'var(--green)' }}>{calculatedAttendance}%</span>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="card">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div className="detail-section-title">특이사항 메모</div>
                      <button className="btn-ghost" onClick={() => openNoteModal()} style={{ padding: 4 }}><Plus size={14} /></button>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {notes.map(n => (
                        <div key={n.id} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 10 }}>
                           <div className="markdown-body" style={{ fontSize: 13, color: 'var(--text-primary)' }}><ReactMarkdown>{n.text}</ReactMarkdown></div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                              <span>{n.createdAt}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                 <button onClick={() => openNoteModal(n)} style={{ color: 'var(--text-muted)' }}><Edit3 size={12} /></button>
                                 <button onClick={() => setNotes(prev => prev.filter(x => x.id !== n.id))} style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
                              </div>
                           </div>
                        </div>
                      ))}
                      {notes.length === 0 && <div className="empty-state" style={{ padding: 20 }}>메모가 없습니다.</div>}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'projects' && (
             <div style={{ animation: 'fadeIn 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                   <div className="detail-section-title">프로젝트 성취도</div>
                   <div style={{ fontSize: 18, fontWeight: 800, color: gpaColor }}>Avg. {calculateGPA()}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {participatedProjects.map(({ project, score }) => {
                     const avgScore = score?.team_score || score?.average_score || 0;
                     return (
                       <div key={project.id} className="card" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                             <div>
                                <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>{project.name} <ExternalLink size={12} /></div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{score ? formatShortDate(score.created_at) : '평가 전'}</div>
                             </div>
                             <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{avgScore.toFixed(1)}</div>
                          </div>
                          <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 12 }}>
                             {project.score_categories.map(cat => (
                               <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cat.label}</span>
                                  <StarRating value={score?.category_scores[cat.id] || score?.category_scores[cat.label] || 0} readonly size={12} />
                               </div>
                             ))}
                          </div>
                       </div>
                     );
                   })}
                   {participatedProjects.length === 0 && <div className="empty-state">참여 프로젝트가 없습니다.</div>}
                </div>
             </div>
           )}

           {activeTab === 'consultations' && (
             <div style={{ animation: 'fadeIn 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                   <div className="detail-section-title">상담 및 활동 이력</div>
                   <button className="btn btn-primary btn-sm" onClick={() => handleOpenConsModal()} style={{ borderRadius: 8, padding: '4px 12px' }}><Plus size={14} /> 추가</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   {filteredTimeline.map(c => (
                     <div key={`${c.isTeam ? 't' : 's'}-${c.id}`} className="consult-item" style={{ borderLeft: c.isTeam ? '4px solid var(--accent)' : 'none' }}>
                        <div className="consult-meta">
                           <span className={`badge ${c.isTeam ? 'log-type-회의록' : `log-type-${c.type}`}`}>{c.type}</span>
                           <span>{formatShortDate(c.date)}</span>
                           <span style={{ fontWeight: 700 }}>{c.isTeam ? '👥 팀 전체' : '👤 개인'}</span>
                           {!c.isTeam && (
                             <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                <button onClick={() => handleOpenConsModal(c as any)}><Edit3 size={12} /></button>
                                <button onClick={() => deleteConsultation(c.id)} style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
                             </div>
                           )}
                        </div>
                        <div className="consult-content markdown-body"><ReactMarkdown>{c.content}</ReactMarkdown></div>
                     </div>
                   ))}
                   {filteredTimeline.length === 0 && <div className="empty-state">기록된 이력이 없습니다.</div>}
                </div>
             </div>
           )}
        </div>
      </div>

      <ConsultationModal isOpen={showConsModal} onClose={() => setShowConsModal(false)} onSave={handleConsSubmit} editingCons={editingCons} student={student} />

      {showNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
           <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3 className="modal-title">메모 수정</h3></div>
              <div className="modal-body">
                 <textarea className="form-input" rows={6} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="내용을 입력하세요..." />
              </div>
              <div className="modal-footer">
                 <button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>취소</button>
                 <button className="btn btn-primary" onClick={handleNoteSave}>저장</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
