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

  const studentConsultations = useMemo(() => 
    allConsultations.filter(c => c.student_id === currentStudentId),
    [allConsultations, currentStudentId]
  );

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
    const total = student.project_scores.reduce((acc, s) => acc + s.average_score, 0);
    return (total / student.project_scores.length).toFixed(2);
  };

  const gpaNum = parseFloat(calculateGPA());
  const gpaColor = gpaNum >= 4 ? 'var(--green)' : gpaNum >= 3 ? 'var(--accent)' : 'var(--yellow)';

  const calculatedAttendance = useMemo(() => {
    /**
     * 출석률 계산 로직 (시뮬레이션):
     * 1. 입과일로부터 소요된 주차(week)를 계산하여 주당 약 0.4%씩 자연 감소하도록 설정.
     * 2. 수강생 ID 기반의 고정 난수를 더해 학생별로 고유한(안정적인) 수치가 나오도록 함.
     * 3. 최소 하한선을 75%로 설정하여 극단적인 수치가 나오지 않게 관리.
     * 4. 관리자 전용 대시보드에서만 계산되어 표시되며, 실제 출석 시스템과 연동 전 대체 지표로 활용.
     */
    const joinDate = new Date(student.joined_at || '2025-01-01');
    const today = new Date();
    const diffWeeks = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const stableRandom = (student.id % 20) * 0.1;
    const rate = Math.max(75, 100 - (diffWeeks * 0.4) - stableRandom);
    return Math.floor(rate);
  }, [student]);

  const handleOpenConsModal = (c?: Consultation) => {
    setEditingCons(c || null);
    setShowConsModal(true);
  };

  const handleConsSubmit = (data: Partial<Consultation>) => {
    if (editingCons) {
      updateConsultation(editingCons.id, data);
      toast.success('상담 이력이 수정되었습니다');
    } else {
      addConsultation({ ...data, student_id: student.id } as any);
      toast.success('상담 이력이 등록되었습니다');
    }
    setShowConsModal(false);
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

  const handleNoteDelete = (id: number) => {
    if (!confirm('이 메모를 삭제하시겠습니까?')) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('메모가 삭제되었습니다');
  };

  const filteredConsultations = useMemo(() => {
    return (studentConsultations || []).filter((c: Consultation) => 
      consFilter === '전체' || c.type === consFilter
    ).sort((a, b) => b.consulted_at.localeCompare(a.consulted_at));
  }, [studentConsultations, consFilter]);

  const attColor = calculatedAttendance >= 90 ? 'var(--green)' : calculatedAttendance >= 80 ? 'var(--accent)' : 'var(--yellow)';

  const getProjectTeamMembers = (projectId: number) => {
    const teams = useData().teams;
    const studentTeamMember = teamMembers.find(tm => tm.student_id === student.id && teams.find(t => t.id === tm.team_id)?.project_id === projectId);
    if (!studentTeamMember) return [];
    
    return teamMembers
      .filter(tm => tm.team_id === studentTeamMember.team_id && tm.student_id !== student.id)
      .map(tm => students.find(s => s.id === tm.student_id))
      .filter(Boolean) as Student[];
  };

  return (
    <div className="premium-panel-overlay" onClick={onClose}>
      <div className="premium-panel" onClick={e => e.stopPropagation()}>
        
        {/* ── Header ── */}
        <div className="premium-header">
           <div className="header-bg-blob" />
           <div className="header-top">
              <button className="p-close-btn" onClick={onClose}><X size={22} /></button>
              <div className="p-gpa-badge" style={{ borderColor: gpaColor }}>
                 <span className="p-gpa-label">성취도</span>
                 <span className="p-gpa-val" style={{ color: gpaColor }}>{calculateGPA()}</span>
              </div>
           </div>

           <div className="p-profile-area">
              <div className="p-avatar-hex">
                 <div className="p-avatar-inner">{student.name[0]}</div>
              </div>
              <div className="p-profile-info">
                 <div className="p-name-row">
                    <h2 className="p-name">{student.name}</h2>
                    <span className={`p-status-badge p-status-${student.status}`}>{student.status}</span>
                 </div>
                 <div className="p-meta-chips">
                    <span className="p-meta-chip">{student.cohort?.name}</span>
                    <span className="p-meta-chip">{student.age}세</span>
                    <span className="p-meta-chip">{student.email}</span>
                 </div>
              </div>
           </div>

           <div className="p-tag-row">
              {studentTags.map(t => <span key={t.id} className="p-tag-item">#{t.tag.replace('#','')}</span>)}
           </div>
        </div>

        {/* ── Tabs ── */}
        <div className="p-tab-nav">
           {[
             { id: 'info', label: '기본 정보', icon: User },
             { id: 'projects', label: '성적/프로젝트', icon: Award },
             { id: 'consultations', label: '상담 이력', icon: MessageSquare }
           ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`p-tab-item ${activeTab === tab.id ? 'active' : ''}`}>
                <tab.icon size={16} />
                <span>{tab.label}</span>
             </button>
           ))}
        </div>

        {/* ── Content ── */}
        <div className="p-panel-body">
           
           {activeTab === 'info' && (
             <div className="p-content-fade">
                <div className="p-card">
                   <div className="p-card-header">
                      <BookOpen size={16} /> <span>상세 인사 정보</span>
                   </div>
                   <div className="p-info-grid">
                      <div className="p-info-item"><span className="p-l">휴대전화</span><span className="p-v">{student.phone || '-'}</span></div>
                      <div className="p-info-item"><span className="p-l">연락처</span><span className="p-v">{student.email || '-'}</span></div>
                      <div className="p-info-item"><span className="p-l">입과일</span><span className="p-v">{student.joined_at || '-'}</span></div>
                      <div className="p-info-item full">
                         <span className="p-l">출석률 (시뮬레이션)</span>
                         <div className="p-gauge-wrap">
                            <div className="p-gauge-track"><div className="p-gauge-fill" style={{ width: `${calculatedAttendance}%`, background: attColor }} /></div>
                            <span className="p-gauge-val" style={{ color: attColor }}>{calculatedAttendance}%</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-card">
                   <div className="p-card-header">
                      <StickyNote size={16} /> <span>특이사항 메모</span>
                      <button className="p-add-note" onClick={() => openNoteModal()}><Plus size={14} /></button>
                   </div>
                   {notes.length === 0 ? (
                     <div className="p-empty-notes">기록된 특이사항이 없습니다.</div>
                   ) : (
                     <div className="p-notes-list">
                        {notes.map(n => (
                          <div key={n.id} className="p-note-item">
                             <div className="p-note-txt markdown-body">
                                <ReactMarkdown>{n.text}</ReactMarkdown>
                             </div>
                             <div className="p-note-foot">
                                <span>{n.createdAt}</span>
                                <div className="p-note-acts">
                                   <button onClick={() => openNoteModal(n)}><Edit3 size={12} /></button>
                                   <button className="danger" onClick={() => handleNoteDelete(n.id)}><Trash2 size={12} /></button>
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
             </div>
           )}

            {activeTab === 'projects' && (
             <div className="p-content-fade">
                <div className="p-section-h">
                   <h3 className="p-sec-title">프로젝트 성취도</h3>
                   <span className="p-count">
                      {student.project_scores.filter(s => projects.some(p => p.id === s.project_id)).length}
                   </span>
                </div>
                <div className="p-projects-grid">
                   {student.project_scores
                     .filter(s => projects.some(p => p.id === s.project_id))
                     .map(s => {
                     const project = projects.find(p => p.id === s.project_id);
                     const participants = getProjectTeamMembers(s.project_id);
                     const displayName = project?.name || '제목 없는 프로젝트';
                     
                     return (
                       <div key={s.id} className="p-project-card" onClick={() => window.location.href = `/teams?project=${s.project_id}&student=${student.id}`}>
                          <div className="p-pj-head">
                             <div>
                                <div className="p-pj-name">{displayName} <ExternalLink size={12} /></div>
                                <div className="p-pj-date">{s.created_at.split('T')[0]}</div>
                             </div>
                             <div className="p-pj-score">{s.average_score.toFixed(1)}</div>
                          </div>
                          
                          <div className="p-pj-cats">
                             {project?.score_categories.slice(0, 4).map(cat => (
                               <div key={cat.id} className="p-pj-cat">
                                  <span>{cat.label}</span>
                                  <div className="p-pj-stars"><StarRating value={s.category_scores[cat.id] || 0} readonly size={10} /></div>
                               </div>
                             ))}
                          </div>

                          <div className="p-pj-foot">
                             <div className="p-participants">
                                {participants.map(p => (
                                  <button key={p.id} className="p-part-chip" onClick={(e) => { e.stopPropagation(); setCurrentStudentId(p.id); }}>
                                     {p.name}
                                  </button>
                                ))}
                             </div>
                             <div className="p-final-score">
                                <span className="p-f-l">최종</span>
                                <span className="p-f-v">{s.team_score.toFixed(1)}</span>
                             </div>
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
           )}

           {activeTab === 'consultations' && (
             <div className="p-content-fade">
                <div className="p-section-h" style={{ marginBottom: 20 }}>
                   <div className="p-filter-row">
                      {['전체', '개인상담', '진로상담', '학습점검'].map(type => (
                        <button key={type} onClick={() => setConsFilter(type as any)} className={`p-filter-btn ${consFilter === type ? 'active' : ''}`}>{type}</button>
                      ))}
                   </div>
                   <button className="p-add-cons" onClick={() => handleOpenConsModal()}><Plus size={16} /> 등록</button>
                </div>
                
                <div className="p-timeline">
                   {filteredConsultations.map(c => (
                     <div key={c.id} className="p-time-item">
                        <div className="p-time-line" />
                        <div className="p-time-dot" />
                        <div className="p-time-card">
                           <div className="p-time-head">
                              <span className="p-time-type">{c.type}</span>
                              <span className="p-time-date">{c.consulted_at}</span>
                              <div className="p-time-acts">
                                 <button onClick={() => handleOpenConsModal(c)}><Edit3 size={13} /></button>
                                 <button className="danger" onClick={() => deleteConsultation(c.id)}><Trash2 size={13} /></button>
                              </div>
                           </div>
                           <div className="p-time-content markdown-body">
                              <ReactMarkdown>{c.content}</ReactMarkdown>
                           </div>
                           {c.follow_up && (
                             <div className="p-time-follow markdown-body">
                                <strong>Action Item:</strong>
                                <ReactMarkdown>{c.follow_up}</ReactMarkdown>
                             </div>
                           )}
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>

      <ConsultationModal 
        isOpen={showConsModal}
        onClose={() => setShowConsModal(false)}
        onSave={handleConsSubmit}
        editingCons={editingCons}
        student={student}
      />

      {showNoteModal && (
        <div className="p-modal-overlay" onClick={() => setShowNoteModal(false)}>
           <div className="p-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="p-modal-header"><h3>특이사항 메모</h3></div>
              <div className="p-modal-body">
                 <textarea className="p-input" rows={5} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="메모를 입력하세요..." />
              </div>
              <div className="p-modal-footer">
                 <button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>취소</button>
                 <button className="btn btn-primary" onClick={handleNoteSave}>저장</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .premium-panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1000; display: flex; justify-content: flex-end; animation: pFade 0.3s; backdrop-filter: blur(4px); }
        .premium-panel { width: 560px; height: 100%; background: var(--bg-surface); display: flex; flex-direction: column; animation: pSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative; box-shadow: -20px 0 60px rgba(0,0,0,0.3); border-left: 1px solid var(--border); }
        
        .premium-header { padding: 40px 32px 24px; position: relative; overflow: hidden; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
        .header-bg-blob { position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%); z-index: 0; }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; position: relative; z-index: 1; }
        .p-close-btn { background: var(--bg-elevated); border: none; width: 40px; height: 40px; border-radius: 12px; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .p-close-btn:hover { background: var(--bg-hover); color: var(--text-primary); transform: rotate(90deg); }
        .p-gpa-badge { border: 2.5px solid var(--accent); padding: 6px 14px; border-radius: 14px; display: flex; flex-direction: column; align-items: flex-end; background: var(--bg-surface); box-shadow: 0 4px 12px var(--accent-glow); }
        .p-gpa-label { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .p-gpa-val { font-size: 28px; font-weight: 950; line-height: 1; margin-top: 2px; font-variant-numeric: tabular-nums; }
        
        .p-profile-area { display: flex; align-items: center; gap: 24px; position: relative; z-index: 1; }
        .p-avatar-hex { width: 72px; height: 72px; background: linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%); border-radius: 22px; display: flex; align-items: center; justify-content: center; transform: rotate(10deg); box-shadow: 8px 8px 16px var(--accent-glow); }
        .p-avatar-inner { transform: rotate(-10deg); font-size: 32px; font-weight: 950; color: #ffffff; }
        .p-name-row { display: flex; align-items: center; gap: 12px; }
        .p-name { font-size: 28px; font-weight: 950; color: var(--text-primary); margin: 0; letter-spacing: -0.5px; }
        .p-status-badge { font-size: 11px; font-weight: 900; padding: 4px 10px; border-radius: 8px; border: 1.5px solid var(--border); }
        .p-status-수강중 { border-color: var(--green); color: var(--green); background: var(--green-light); }
        .p-status-수료 { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
        .p-status-탈퇴, .p-status-중도포기 { border-color: var(--red); color: var(--red); background: var(--red-light); }
        .p-meta-chips { display: flex; gap: 10px; margin-top: 8px; }
        .p-meta-chip { font-size: 12px; color: var(--text-secondary); font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .p-meta-chip:not(:last-child)::after { content: "•"; margin-left: 6px; opacity: 0.5; }
        .p-tag-row { display: flex; gap: 8px; margin-top: 24px; flex-wrap: wrap; }
        .p-tag-item { font-size: 11px; font-weight: 800; color: var(--accent); background: var(--accent-light); padding: 4px 10px; border-radius: 8px; }

        .p-tab-nav { display: flex; padding: 0 32px; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
        .p-tab-item { padding: 20px 16px; border: none; background: none; font-size: 13.5px; font-weight: 800; color: #94a3b8; cursor: pointer; transition: all 0.2s; position: relative; display: flex; align-items: center; gap: 8px; }
        .p-tab-item.active { color: var(--accent); }
        .p-tab-item.active::after { content: ""; position: absolute; bottom: -1px; left: 0; right: 0; height: 3px; background: var(--accent); border-radius: 3px; }
        
        .p-panel-body { flex: 1; overflow-y: auto; padding: 32px; background: var(--bg-base); }
        .p-card { background: var(--bg-surface); border-radius: 24px; padding: 24px; border: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 24px; }
        .p-card-header { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 900; color: var(--text-primary); margin-bottom: 20px; }
        .p-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .p-info-item { display: flex; flex-direction: column; gap: 6px; }
        .p-info-item.full { grid-column: span 2; margin-top: 10px; }
        .p-l { font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .p-v { font-size: 14px; font-weight: 700; color: var(--text-primary); }
        .p-gauge-wrap { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
        .p-gauge-track { flex: 1; height: 10px; background: var(--bg-elevated); border-radius: 5px; overflow: hidden; }
        .p-gauge-fill { height: 100%; border-radius: 5px; transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .p-gauge-val { font-size: 15px; font-weight: 950; min-width: 45px; text-align: right; }

        .p-section-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .p-sec-title { font-size: 18px; font-weight: 950; color: var(--text-primary); margin: 0; }
        .p-count { background: var(--accent-light); color: var(--accent); font-size: 12px; font-weight: 900; padding: 2px 10px; border-radius: 10px; }
        .p-projects-grid { display: grid; gap: 20px; }
        .p-project-card { background: var(--bg-surface); border-radius: 24px; border: 1.5px solid var(--border); padding: 24px; transition: all 0.3s; cursor: pointer; }
        .p-project-card:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 12px 30px var(--accent-glow); }
        .p-pj-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .p-pj-name { font-size: 16px; font-weight: 900; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
        .p-pj-date { font-size: 11px; color: var(--text-muted); font-weight: 600; }
        .p-pj-score { width: 44px; height: 44px; background: var(--bg-elevated); border: 1.5px solid var(--accent); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 950; color: var(--accent); }
        .p-pj-cats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; background: var(--bg-base); border-radius: 16px; margin-bottom: 20px; }
        .p-pj-cat { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; color: var(--text-secondary); }
        .p-pj-foot { display: flex; justify-content: space-between; align-items: center; }
        .p-participants { display: flex; gap: 6px; }
        .p-part-chip { padding: 4px 10px; background: var(--bg-elevated); border-radius: 8px; font-size: 11px; font-weight: 800; color: var(--text-secondary); cursor: pointer; border: none; transition: all 0.2s; }
        .p-part-chip:hover { background: var(--accent); color: #ffffff; }
        .p-final-score { text-align: right; }
        .p-f-l { font-size: 9px; font-weight: 900; color: var(--text-muted); text-transform: uppercase; display: block; }
        .p-f-v { font-size: 18px; font-weight: 950; color: var(--text-primary); }

        .p-timeline { display: flex; flex-direction: column; }
        .p-time-item { position: relative; padding-left: 32px; padding-bottom: 32px; }
        .p-time-item:last-child { padding-bottom: 0; }
        .p-time-line { position: absolute; left: 6px; top: 12px; bottom: 0; width: 2px; background: var(--border); }
        .p-time-item:last-child .p-time-line { display: none; }
        .p-time-dot { position: absolute; left: 0; top: 6px; width: 14px; height: 14px; border-radius: 50%; background: var(--bg-surface); border: 3.5px solid var(--accent); z-index: 1; }
        .p-time-card { background: var(--bg-surface); border-radius: 20px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .p-time-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .p-time-type { font-size: 11px; font-weight: 900; padding: 4px 10px; background: var(--accent-light); color: var(--accent); border-radius: 8px; }
        .p-time-date { font-size: 11px; color: var(--text-muted); font-weight: 700; flex: 1; }
        .p-time-acts { display: flex; gap: 4px; }
        .p-time-acts button { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 6px; transition: all 0.2s; }
        .p-time-acts button:hover { background: var(--bg-elevated); color: var(--accent); }
        .p-time-acts button.danger:hover { color: var(--red); }
        .p-time-content { font-size: 14px; color: var(--text-primary); line-height: 1.65; }
        .p-time-follow { margin-top: 16px; padding: 14px; background: var(--yellow-light); border-left: 4px solid var(--yellow); border-radius: 0 12px 12px 0; font-size: 13.5px; color: var(--text-primary); }
        .p-add-cons { background: var(--accent); color: #ffffff; border: none; padding: 6px 14px; border-radius: 10px; font-size: 13px; font-weight: 900; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s; }
        .p-add-cons:hover { transform: scale(1.05); box-shadow: 0 6px 20px var(--accent-glow); }
        .p-filter-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .p-filter-btn { padding: 6px 14px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-elevated); color: var(--text-secondary); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .p-filter-btn:hover { border-color: var(--accent); color: var(--accent); }
        .p-filter-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }

        .p-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .p-modal { background: var(--bg-surface); border-radius: 32px; width: 90%; max-width: 500px; box-shadow: 0 40px 100px rgba(0,0,0,0.4); overflow: hidden; animation: pModalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid var(--border); }
        .p-modal-header { padding: 32px 32px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .p-modal-header h3 { margin: 0; font-size: 18px; font-weight: 950; color: var(--text-primary); }
        .p-modal-body { padding: 32px; display: flex; flex-direction: column; gap: 20px; }
        .p-modal-footer { padding: 24px 32px; background: var(--bg-elevated); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; }
        .p-field { display: flex; flex-direction: column; gap: 8px; }
        .p-field label { font-size: 11px; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
        .p-select, .p-input { width: 100%; padding: 12px 16px; border: 2px solid var(--border); background: var(--bg-elevated); border-radius: 14px; font-size: 14px; font-weight: 700; color: var(--text-primary); outline: none; transition: border-color 0.2s; }
        .p-select:focus, .p-input:focus { border-color: var(--accent); }
        
        .markdown-body { color: var(--text-primary); }
        .markdown-body p { margin-bottom: 12px; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 12px; }
        .markdown-body li { margin-bottom: 6px; }
        .markdown-body strong { font-weight: 700; color: var(--text-primary); }
        .markdown-body code { background: var(--bg-elevated); padding: 2px 5px; border-radius: 4px; font-size: 85%; }
        
        .p-empty-notes { grid-column: span 2; padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; font-weight: 600; opacity: 0.7; }
        .p-note-item { background: var(--bg-surface); padding: 16px; border-radius: 16px; border: 1px solid var(--border); margin-bottom: 12px; }
        .p-note-txt { font-size: 14px; color: var(--text-primary); line-height: 1.6; }
        .p-note-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-muted); font-weight: 700; }
        .p-note-acts { display: flex; gap: 6px; }
        .p-note-acts button { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 4px; transition: all 0.2s; }
        .p-note-acts button:hover { background: var(--bg-elevated); color: var(--accent); }
        .p-note-acts button.danger:hover { color: var(--red); }

        @keyframes pFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes pModalIn { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
      `}} />
    </div>
  );
}
