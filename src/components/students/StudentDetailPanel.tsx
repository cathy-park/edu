'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, User, BookOpen, 
  Plus, Trash2, Award, MessageSquare,
  Edit3, StickyNote, ExternalLink, Users, Bookmark
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
    projects, students, teams, teamMembers, tags: allTags, consultations: allConsultations,
    projectLogs,
    addConsultation, updateConsultation, deleteConsultation,
    updateProjectScore 
  } = useData();

  const [currentStudentId, setCurrentStudentId] = useState(initialStudent.id);
  
  const student = useMemo(() => 
    students.find(s => s.id === currentStudentId) || initialStudent,
    [students, currentStudentId, initialStudent]
  );

  console.log("StudentDetailPanel [v8.12] for Student ID:", currentStudentId);

  // MERGED TIMELINE (Individual + Team Logs)
  const studentTimeline = useMemo(() => {
    // 1. Individual consultations
    const individual = allConsultations
      .filter(c => Number(c.student_id) === Number(currentStudentId))
      .map(c => ({ ...c, isTeam: false, date: c.consulted_at }));
    
    // 2. Team logs for teams this student is in
    const myTeamIds = teamMembers
      .filter(tm => Number(tm.student_id) === Number(currentStudentId))
      .map(tm => tm.team_id);
      
    const teamsInLogs = projectLogs
      .filter(pl => myTeamIds.includes(pl.team_id))
      .map(pl => {
         const t = teams.find(team => team.id === pl.team_id);
         return { 
           ...pl, 
           isTeam: true, 
           date: pl.log_date, 
           student_id: currentStudentId, 
           consulted_at: pl.log_date,
           type: pl.type || '회의록',
           team_name: t?.team_name || '팀'
         };
      });
    
    return [...individual, ...teamsInLogs].sort((a, b) => b.date.localeCompare(a.date));
  }, [allConsultations, projectLogs, teamMembers, currentStudentId, teams]);

  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'consultations'>(initialTab);
  const [consFilter, setConsFilter] = useState<ConsultationType>('전체');
  
  // Notes state
  const [notes, setNotes] = useState<Note[]>(() => {
    if (!student.note) return [];
    try {
      const parsed = JSON.parse(student.note);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return student.note?.trim() ? [{ id: 1, text: student.note, createdAt: '' }] : [];
  });
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showConsModal, setShowConsModal] = useState(false);
  const [editingCons, setEditingCons] = useState<Consultation | null>(null);

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
      <div className="detail-panel" onClick={e => e.stopPropagation()} style={{ width: 500, borderRadius: '0 0 0 24px' }}>
        
        <div className="detail-panel-header" style={{ padding: '32px 32px 24px' }}>
          <button className="close-btn" onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, background: 'var(--bg-hover)', borderRadius: 12, border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="detail-avatar" style={{ width: 56, height: 56, fontSize: 24, background: 'var(--accent)', color: 'white', fontWeight: 800 }}>{student.name[0]}</div>
            <div>
              <h2 className="page-title" style={{ margin: 0, fontSize: 26 }}>{student.name} <small style={{ fontSize: 10, opacity: 0.4 }}>v8.12</small></h2>
              <div className="page-subtitle" style={{ fontSize: 14 }}>{student.cohort?.name} · {student.age}세</div>
            </div>
          </div>
        </div>

        <div className="detail-panel-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', padding: '0 32px' }}>
           {[
             { id: 'info', label: '학생 프로필', icon: User },
             { id: 'projects', label: '프로젝트 성과', icon: Award },
             { id: 'consultations', label: '상담 및 활동', icon: MessageSquare }
           ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '20px 0', marginRight: 32, border: 'none', background: 'none', fontSize: 14, fontWeight: activeTab === tab.id ? 800 : 500, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `3px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                <tab.icon size={16} /> {tab.label}
             </button>
           ))}
        </div>

        <div className="detail-panel-body" style={{ background: 'var(--bg-base)', padding: 32, overflowY: 'auto', flex: 1 }}>
           {activeTab === 'info' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="card" style={{ padding: 24, borderRadius: 20 }}>
                   <div className="detail-section-title" style={{ marginBottom: 16, fontSize: 13, fontWeight: 800 }}>연락처 및 상세</div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div className="detail-item"><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>PHONE</div><div style={{ fontWeight: 700 }}>{student.phone || '-'}</div></div>
                      <div className="detail-item"><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>JOINED</div><div style={{ fontWeight: 700 }}>{student.joined_at || '-'}</div></div>
                      <div className="detail-item" style={{ gridColumn: 'span 2' }}><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>EMAIL</div><div style={{ fontWeight: 700 }}>{student.email}</div></div>
                   </div>
                </div>
                <div className="card" style={{ padding: 24, borderRadius: 20 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div className="detail-section-title" style={{ fontSize: 13, fontWeight: 800 }}>관리자 메모</div>
                      <button className="btn-ghost" onClick={() => { setEditingNote(null); setNoteText(''); setShowNoteModal(true); }}><Plus size={14} /></button>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {notes.map(n => (
                        <div key={n.id} style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 16, fontSize: 13 }}>
                           <ReactMarkdown className="markdown-body">{n.text}</ReactMarkdown>
                           <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', opacity: 0.5, fontSize: 11 }}>
                              <span>{n.createdAt}</span>
                              <div style={{ display: 'flex', gap: 8 }}><button onClick={() => { setEditingNote(n); setNoteText(n.text); setShowNoteModal(true); }}><Edit3 size={11} /></button><button onClick={() => setNotes(p => p.filter(x=>x.id!==n.id))}><Trash2 size={11} /></button></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'projects' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div className="detail-section-title" style={{ fontSize: 14, fontWeight: 800 }}>학업 성취도</div>
                   <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)' }}>GPA {calculateGPA()}</div>
                </div>
                {student.project_scores.map(score => {
                   const proj = projects.find(p => p.id === score.project_id);
                   const avg = Number(score.team_score || score.average_score || 0);
                   return (
                     <div key={`score-${score.id}`} className="card" style={{ padding: 24, borderRadius: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                           <div><div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 2 }}>{proj?.cohort_id ? 'COHORT PROJECT' : 'LAB PROJECT'}</div><div style={{ fontSize: 18, fontWeight: 800 }}>{proj?.name}</div></div>
                           <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)' }}>{avg.toFixed(1)}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-hover)', padding: 16, borderRadius: 14 }}>
                           {proj?.score_categories.map(cat => (
                             <div key={`cat-${cat.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{cat.label}</span>
                                <StarRating value={Number(score.category_scores?.[cat.id] || 0)} readonly size={12} />
                             </div>
                           ))}
                        </div>
                     </div>
                   );
                })}
             </div>
           )}

           {activeTab === 'consultations' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <button className="btn btn-primary" style={{ height: 48, borderRadius: 16, gap: 10, background: 'var(--accent)', color: 'white', fontWeight: 800 }} onClick={() => { setEditingCons(null); setShowConsModal(true); }}>
                   <Plus size={18} /> 기록 추가하기
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {studentTimeline.map((c: any) => (
                     <div key={`hist-${c.isTeam ? 't' : 's'}-${c.id}`} style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 20, border: '1px solid var(--border)', borderLeft: `5px solid ${c.isTeam ? 'var(--accent)' : '#94a3b8'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'flex-start' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', fontWeight: 800 }}>{c.type}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{formatShortDate(c.date)}</span>
                           </div>
                           {!c.isTeam && (
                             <div style={{ display: 'flex', gap: 6 }}>
                               <button onClick={() => { setEditingCons(c); setShowConsModal(true); }} style={{ padding: 6, color: 'var(--text-muted)' }}><Edit3 size={14} /></button>
                               <button onClick={() => deleteConsultation(c.id)} style={{ padding: 6, color: 'var(--red)', opacity: 0.5 }}><Trash2 size={14} /></button>
                             </div>
                           )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                           {c.isTeam ? <Users size={14} /> : <Bookmark size={14} />}
                           {c.isTeam ? `${c.team_name} (팀 활동)` : '개인 상담'}
                        </div>
                        <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.6 }}><ReactMarkdown>{c.content}</ReactMarkdown></div>
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
