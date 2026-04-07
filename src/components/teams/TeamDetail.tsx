'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Users, BookOpen, Clock, ChevronRight, 
  Save, Trash2, UserPlus, Star, Search, 
  Check, Plus, Link as LinkIcon, MessageSquare, 
  Edit3, Calendar, Minus, StickyNote, Crown, Award, UserCheck
} from 'lucide-react';
import { Team, Student, Project, TeamMember, Consultation, ConsultationType } from '@/lib/types';
import { StarRating } from '@/components/common/StarRating';
import { useData } from '@/context/DataContext';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { getStageColorClass } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface Props {
  team: Team;
  onClose: () => void;
  onProgressUpdate: (id: number, val: number) => void;
  onMemberClick: (sid: number) => void;
}

export default function TeamDetail({ team, onClose, onProgressUpdate, onMemberClick }: Props) {
  const { 
    students, projects, updateProjectScore, 
    teamMembers, addTeamMember, removeTeamMember,
    updateTeam, consultations, addConsultation, updateConsultation, deleteConsultation,
    updateTeamMemberRole,
    projectLogs, addProjectLog, updateProjectLog, deleteProjectLog, updateTeamProjectScore
  } = useData();

  console.log("TeamDetail [v8.12] Rendered");
  
  const project = projects.find(p => p.id === team.project_id);
  const members = teamMembers.filter(m => m.team_id === team.id);
  
  const [activeTab, setActiveTab] = useState<'info' | 'eval' | 'logs'>('info');
  const [projectLink, setProjectLink] = useState(team.project_link || '');
  const [teamMemo, setTeamMemo] = useState(team.memo || '');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  
  const [logForm, setLogForm] = useState({
    type: '회의록',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    content: '',
    student_id: -1 // Default to Team-wide
  });

  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});

  // Reset type when student_id changes to prevent enum errors
  useEffect(() => {
    if (Number(logForm.student_id) === -1) {
      setLogForm(prev => ({ ...prev, type: '회의록' }));
    } else {
      setLogForm(prev => ({ ...prev, type: '개인상담' }));
    }
  }, [logForm.student_id]);

  useEffect(() => {
    if (members.length > 0) {
      const firstMember = students.find(s => s.id === members[0].student_id);
      if (firstMember) {
        const existingScore = firstMember.project_scores.find(ps => ps.project_id === team.project_id);
        if (existingScore) {
          setCategoryScores(existingScore.category_scores || {});
          return;
        }
      }
    }
    setCategoryScores({});
  }, [team.id, team.project_id, members.length]);

  const overallScore = useMemo(() => {
    const cats = Object.values(categoryScores);
    if (cats.length === 0) return 0;
    const total = cats.reduce((a, b) => a + Number(b || 0), 0);
    const avg = total / cats.length;
    return Math.round(avg * 10) / 10;
  }, [categoryScores]);

  const handleSaveScores = async () => {
    await updateTeamProjectScore(team.id, team.project_id, categoryScores, overallScore);
    toast.success('팀 성취도가 저장되었습니다');
  };

  const handleSetLeader = (studentId: number) => {
    updateTeam(team.id, { leader_id: studentId });
    toast.success('팀장이 변경되었습니다');
  };

  const handleLogSubmit = async () => {
    if (!logForm.content.trim()) return toast.error('내용을 입력하세요');
    const combinedDateTime = `${logForm.date}T${logForm.time}:00`;

    // Map common names to DB Enums to be safe
    let finalType = logForm.type;
    if (Number(logForm.student_id) !== -1) {
      if (finalType === '회의록') finalType = '기타'; // Prevention
    }

    try {
      if (editingLog) {
        if (editingLog.isTeam) {
          await updateProjectLog(editingLog.id, { content: logForm.content, log_date: logForm.date, type: finalType as any });
        } else {
          await updateConsultation(editingLog.id, { content: logForm.content, consulted_at: combinedDateTime, type: finalType as any, student_id: logForm.student_id });
        }
        toast.success('기록이 수정되었습니다');
      } else {
        if (Number(logForm.student_id) === -1) {
          await addProjectLog({ team_id: team.id, log_date: logForm.date, type: finalType as any, content: logForm.content, title: finalType });
          toast.success('팀 활동 로그가 추가되었습니다');
        } else {
          await addConsultation({ student_id: Number(logForm.student_id), project_id: team.project_id, content: logForm.content, consulted_at: combinedDateTime, type: finalType as any });
          toast.success('개인 로그가 추가되었습니다');
        }
      }
      setShowLogModal(false);
    } catch (err) { 
      console.error("Log Submission Error:", err);
    }
  };

  const teamTimeline = useMemo(() => {
    const memberIds = members.map(m => m.student_id);
    const individualLogs = consultations
      .filter(c => memberIds.includes(Number(c.student_id)) && c.project_id === team.project_id)
      .map(c => ({ ...c, isTeam: false, date: c.consulted_at }));
    const teamLogs = projectLogs
      .filter(pl => pl.team_id === team.id)
      .map(pl => ({ ...pl, isTeam: true, date: pl.log_date, student_id: -1 }));
    return [...individualLogs, ...teamLogs].sort((a, b) => b.date.localeCompare(a.date));
  }, [consultations, projectLogs, members, team.id, team.project_id]);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = parseISO(dateStr.replace(' ', 'T'));
      return format(d, 'MM-dd HH:mm');
    } catch (e) {
      return dateStr.slice(5, 16);
    }
  };

  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()} style={{ width: 520, borderRadius: '0 0 0 24px' }}>
        
        <div className="detail-panel-header" style={{ padding: '32px 32px 24px' }}>
          <button className="close-btn" onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, background: 'var(--bg-hover)', borderRadius: 12, border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="detail-avatar" style={{ width: 56, height: 56, fontSize: 24, background: 'var(--accent)', color: 'white', fontWeight: 800 }}>{team.team_name[0]}</div>
            <div>
              <h2 className="page-title" style={{ margin: 0, fontSize: 26, letterSpacing: '-0.02em' }}>{team.team_name} <small style={{ fontSize: 10, opacity: 0.4 }}>v8.12</small></h2>
              <div className="page-subtitle" style={{ fontSize: 14, fontWeight: 500, opacity: 0.6 }}>{project?.name}</div>
            </div>
          </div>
        </div>

        <div className="detail-panel-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', padding: '0 32px' }}>
           {[
             { id: 'info', label: '공동 작업', icon: Users },
             { id: 'eval', label: '성과 평가', icon: Award },
             { id: 'logs', label: '활동 피드', icon: MessageSquare }
           ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '20px 0', marginRight: 32, border: 'none', background: 'none', fontSize: 14, fontWeight: activeTab === tab.id ? 800 : 500, color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `3px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                <tab.icon size={16} /> {tab.label}
             </button>
           ))}
        </div>

        <div className="detail-panel-body" style={{ background: 'var(--bg-base)', padding: 32, overflowY: 'auto', flex: 1 }}>
           {activeTab === 'info' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <section>
                   <div className="detail-section-title" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} /> 프로젝트 진척</div>
                   <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 20, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                         <span style={{ fontSize: 14, fontWeight: 700 }}>진행률</span>
                         <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 18 }}>{team.progress_pct}%</span>
                      </div>
                      <div className="progress-bg" style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4 }}><div className="progress-fill" style={{ width: `${team.progress_pct}%`, background: 'var(--accent)', height: '100%', borderRadius: 4 }} /></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                         <span className={`badge ${project ? getStageColorClass(team.stage, project.stages) : ''}`} style={{ padding: '6px 12px', fontSize: 12 }}>{team.stage}</span>
                         <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>D-Day {project?.end_date || '-'}</span>
                      </div>
                   </div>
                </section>

                <section>
                   <div className="detail-section-title" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> 팀 구성원 ({members.length})</div>
                   <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead style={{ background: 'var(--bg-hover)' }}>
                            <tr>
                               <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>수강생</th>
                               <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>역할</th>
                               <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>팀장</th>
                               <th style={{ padding: '14px 20px' }}></th>
                            </tr>
                         </thead>
                         <tbody>
                            {members.map(member => {
                              const s = students.find(x => x.id === member.student_id);
                              const isLeader = member.student_id === team.leader_id;
                              return s ? (
                                <tr key={`member-row-${member.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                   <td style={{ padding: '16px 20px' }}>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
                                   </td>
                                   <td style={{ padding: '16px 20px' }}>
                                      <input className="form-input" style={{ height: 32, fontSize: 13, background: 'transparent', border: 'none', padding: 0 }} value={member.role || ''} onChange={e => updateTeamMemberRole(member.id, e.target.value)} placeholder="역할 설정..." />
                                   </td>
                                   <td style={{ textAlign: 'center', padding: '16px 20px' }}>
                                      <button 
                                         onClick={() => handleSetLeader(s.id)} 
                                         className={`leader-toggle ${isLeader ? 'active' : ''}`}
                                         style={{ 
                                            background: isLeader ? 'var(--yellow)' : 'transparent',
                                            border: `1.5px solid ${isLeader ? 'var(--yellow)' : 'var(--border)'}`,
                                            color: isLeader ? 'white' : 'var(--text-muted)',
                                            width: 32, height: 32, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                         }}
                                      >
                                         <Crown size={16} fill={isLeader ? 'white' : 'none'} />
                                      </button>
                                   </td>
                                   <td style={{ textAlign: 'right', padding: '16px 20px' }}>
                                      <button onClick={() => removeTeamMember(member.id)} style={{ color: 'var(--red)', opacity: 0.4 }}><Trash2 size={16} /></button>
                                   </td>
                                </tr>
                              ) : null;
                            })}
                         </tbody>
                      </table>
                      <button className="add-todo-btn" style={{ padding: '16px', width: '100%', border: 'none', background: 'var(--bg-hover)', color: 'var(--accent)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => setShowMemberSelector(true)}>
                         <UserPlus size={16} /> 팀원 추가하기
                      </button>
                   </div>
                </section>
             </div>
           )}

           {activeTab === 'eval' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', padding: '32px 24px', borderRadius: 24, textAlign: 'center', boxShadow: '0 10px 25px -10px rgba(99, 102, 241, 0.5)' }}>
                   <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 8, letterSpacing: '0.05em' }}>TEAM PERFORMANCE SCORE (v8.12)</div>
                   <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>{overallScore.toFixed(1)}</div>
                </div>
                <div className="card" style={{ padding: '8px 24px' }}>
                   {project?.score_categories.map((cat, idx) => (
                     <div key={`cat-v2-${cat.id || idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: idx === project.score_categories.length - 1 ? 'none' : '1px solid var(--border)' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>{cat.label}</span>
                        <StarRating 
                           key={`team-star-v12-${team.id}-${cat.id}-${categoryScores[cat.id] || 0}`}
                           value={categoryScores[cat.id] || 0} 
                           onChange={v => setCategoryScores(prev => ({ ...prev, [cat.id]: v }))} 
                           size={22} 
                        />
                     </div>
                   ))}
                   <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, height: 52, borderRadius: 16, fontSize: 15, fontWeight: 800, background: 'var(--accent)', color: 'white' }} onClick={handleSaveScores}>
                      <Save size={18} /> 점수 업데이트
                   </button>
                </div>
             </div>
           )}

           {activeTab === 'logs' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <button className="btn btn-primary" style={{ height: 48, borderRadius: 16, gap: 10, background: 'var(--accent)', color: 'white', fontWeight: 800 }} onClick={() => { setEditingLog(null); setShowLogModal(true); }}>
                   <Plus size={18} /> 활동 피드 작성
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {teamTimeline.map(c => (
                     <div key={`feed-${c.isTeam ? 't' : 's'}-${c.id}`} style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 20, border: '1px solid var(--border)', borderLeft: `5px solid ${c.isTeam ? 'var(--accent)' : '#94a3b8'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'flex-start' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', fontWeight: 800 }}>{c.type}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{formatShortDate(c.date)}</span>
                           </div>
                           <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => { setEditingLog(c); setLogForm({ type: c.type, date: c.date.split('T')[0], time: c.date.includes('T') ? c.date.split('T')[1].slice(0, 5) : '00:00', content: c.content, student_id: c.student_id }); setShowLogModal(true); }} style={{ padding: 6, color: 'var(--text-muted)' }}><Edit3 size={14} /></button>
                              <button onClick={() => { if(confirm('삭제하시겠습니까?')) { if (c.isTeam) deleteProjectLog(c.id); else deleteConsultation(c.id); } }} style={{ padding: 6, color: 'var(--red)', opacity: 0.5 }}><Trash2 size={14} /></button>
                           </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                           {c.isTeam ? <Users size={14} /> : <UserCheck size={14} />}
                           {c.isTeam ? '팀 전체' : students.find(s=>s.id===Number(c.student_id))?.name}
                        </div>
                        <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.6 }}><ReactMarkdown>{c.content}</ReactMarkdown></div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>

      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
           <div className="modal card" style={{ maxWidth: 460, padding: 32, borderRadius: 24 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ marginBottom: 24 }}><h3 className="modal-title" style={{ fontSize: 20, fontWeight: 800 }}>{editingLog ? '기록 수정' : '새로운 활동 기록'}</h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div className="form-field">
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, display: 'block' }}>대상 선택</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                       <button onClick={() => setLogForm(f => ({ ...f, student_id: -1 }))} style={{ padding: '10px 16px', borderRadius: 12, border: `2px solid ${Number(logForm.student_id) === -1 ? 'var(--accent)' : 'var(--border)'}`, background: Number(logForm.student_id) === -1 ? 'var(--accent)' : 'transparent', color: Number(logForm.student_id) === -1 ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, transition: 'all 0.2s' }}>팀 전체</button>
                       {members.map(m => {
                         const s = students.find(std => std.id === m.student_id);
                         if (!s) return null;
                         const active = Number(logForm.student_id) === s.id;
                         return <button key={`sel-${s.id}`} onClick={() => setLogForm(f => ({ ...f, student_id: s.id }))} style={{ padding: '10px 16px', borderRadius: 12, border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent)' : 'transparent', color: active ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, transition: 'all 0.2s' }}>{s.name}</button>;
                       })}
                    </div>
                 </div>
                 <div className="form-field">
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, display: 'block' }}>내용 작성</label>
                    <textarea className="form-input" rows={6} value={logForm.content} onChange={e => setLogForm(f => ({ ...f, content: e.target.value }))} style={{ borderRadius: 16, padding: 16 }} placeholder="오늘의 활동 내용을 상세히 적어주세요..." />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-field">
                       <label className="form-label" style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, display: 'block' }}>날짜</label>
                       <input type="date" className="form-input" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} style={{ borderRadius: 12 }} />
                    </div>
                    <div className="form-field">
                       <label className="form-label" style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, display: 'block' }}>시간</label>
                       <input type="time" className="form-input" value={logForm.time} onChange={e => setLogForm(f => ({ ...f, time: e.target.value }))} style={{ borderRadius: 12 }} />
                    </div>
                 </div>
                 <div className="form-field">
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, display: 'block' }}>로그 유형</label>
                    <select className="form-select" value={logForm.type} onChange={e => setLogForm(f => ({ ...f, type: e.target.value as any }))} style={{ borderRadius: 12, padding: '0 12px' }}>
                       {Number(logForm.student_id) === -1 ? (
                         <>
                           <option value="회의록">👥 회의록</option>
                           <option value="멘토피드백">💡 멘토 피드백</option>
                           <option value="진행보고">📋 진행 보고</option>
                         </>
                       ) : (
                         <>
                           <option value="개인상담">💬 개인 피드백</option>
                           <option value="학습점검">✍️ 개발 로그</option>
                           <option value="전화상담">📞 개별 연락</option>
                           <option value="기타">🔗 기타</option>
                         </>
                       )}
                    </select>
                 </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 32, gap: 12 }}>
                 <button className="btn btn-secondary" onClick={() => setShowLogModal(false)} style={{ flex: 1, height: 48, borderRadius: 14 }}>취소</button>
                 <button className="btn btn-primary" onClick={handleLogSubmit} style={{ flex: 2, height: 48, borderRadius: 14, background: 'var(--accent)', color: 'white', fontWeight: 800 }}>활동 저장하기</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
