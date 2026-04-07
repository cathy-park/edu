'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Users, BookOpen, Clock, ChevronRight, 
  Save, Trash2, UserPlus, Star, Search, 
  Check, Plus, Link as LinkIcon, MessageSquare, 
  Edit3, Calendar, Minus, StickyNote, Crown
} from 'lucide-react';
import { Team, Student, Project, TeamMember, Consultation, ConsultationType } from '@/lib/types';
import { StarRating } from '@/components/common/StarRating';
import { useData } from '@/context/DataContext';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { getStageColorClass } from '@/lib/utils';
import { format } from 'date-fns';

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

  useEffect(() => {
    // Initial category scores from project if needed, but usually we fetch from team grade
    // For simplicity, we start fresh or from existing context
     setCategoryScores({});
  }, [team.id]);

  const overallScore = useMemo(() => {
    const cats = Object.values(categoryScores);
    if (cats.length === 0) return 0;
    const avg = cats.reduce((a, b) => a + b, 0) / cats.length;
    return Math.round(avg * 2) / 2;
  }, [categoryScores]);

  const handleSaveInfo = () => {
    updateTeam(team.id, { project_link: projectLink, memo: teamMemo });
    toast.success('팀 정보가 저장되었습니다');
  };

  const handleSaveScores = async () => {
    await updateTeamProjectScore(team.id, team.project_id, categoryScores, overallScore);
    toast.success('팀 성취도가 저장되었습니다');
  };

  const handleLogSubmit = async () => {
    if (!logForm.content.trim()) return toast.error('내용을 입력하세요');
    const combinedDateTime = `${logForm.date}T${logForm.time}:00`;

    try {
      if (editingLog) {
        if (editingLog.isTeam) {
          await updateProjectLog(editingLog.id, {
            content: logForm.content,
            log_date: logForm.date,
            type: logForm.type as any,
          });
        } else {
          await updateConsultation(editingLog.id, {
            content: logForm.content,
            consulted_at: combinedDateTime,
            type: logForm.type as any,
            student_id: logForm.student_id
          });
        }
        toast.success('기록이 수정되었습니다');
      } else {
        if (logForm.student_id === -1) {
          await addProjectLog({
            team_id: team.id,
            log_date: logForm.date,
            type: logForm.type as any,
            content: logForm.content,
            title: logForm.type
          });
          toast.success('팀 활동 로그가 추가되었습니다');
        } else {
          await addConsultation({
            student_id: logForm.student_id,
            project_id: team.project_id,
            content: logForm.content,
            consulted_at: combinedDateTime,
            type: logForm.type as any
          });
          toast.success('개인 로그가 추가되었습니다');
        }
      }
    } catch (err) { console.error(err); }
    setShowLogModal(false);
  };

  const teamTimeline = useMemo(() => {
    const memberIds = members.map(m => m.student_id);
    const individualLogs = consultations
      .filter(c => memberIds.includes(c.student_id) && c.project_id === team.project_id)
      .map(c => ({ ...c, isTeam: false, date: c.consulted_at }));
    const teamLogs = projectLogs
      .filter(pl => pl.team_id === team.id)
      .map(pl => ({ ...pl, isTeam: true, date: pl.log_date, student_id: -1 }));
    return [...individualLogs, ...teamLogs].sort((a, b) => b.date.localeCompare(a.date));
  }, [consultations, projectLogs, members, team.id, team.project_id]);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return format(d, 'MM-dd HH:mm');
  };

  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
        
        <div className="detail-panel-header" style={{ position: 'relative', padding: '32px 24px 24px' }}>
          <button 
             className="action-btn" 
             onClick={onClose} 
             style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, color: 'var(--text-primary)', background: 'var(--bg-hover)' }}>
             <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="detail-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>{team.team_name[0]}</div>
            <div>
              <h2 className="page-title" style={{ margin: 0, fontSize: 22 }}>{team.team_name}</h2>
              <div className="page-subtitle" style={{ fontSize: 13 }}>{project?.name}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
           {[
             { id: 'info', label: '팀 정보', icon: Users },
             { id: 'eval', label: '성과 평가', icon: Award },
             { id: 'logs', label: '활동 로그', icon: MessageSquare }
           ].map(tab => (
             <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                style={{ 
                  flex: 1, padding: '16px 0', border: 'none', background: 'none', 
                  fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, 
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: `2.5px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all 0.2s'
                }}>
                {tab.label}
             </button>
           ))}
        </div>

        <div className="detail-panel-body" style={{ background: 'var(--bg-base)', padding: 24 }}>
           {activeTab === 'info' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <section className="detail-section">
                   <div className="detail-section-title"><Clock size={14} /> 진행 상황</div>
                   <div className="card" style={{ padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                         <span style={{ fontSize: 13, fontWeight: 700 }}>진척도</span>
                         <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{team.progress_pct}%</span>
                      </div>
                      <div className="progress-bg"><div className="progress-fill" style={{ width: `${team.progress_pct}%`, background: 'var(--accent)' }} /></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                         <span className={`badge ${project ? getStageColorClass(team.stage, project.stages) : ''}`}>{team.stage}</span>
                         <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>마감: {project?.end_date || '미정'}</span>
                      </div>
                   </div>
                </section>

                <section className="detail-section">
                   <div className="detail-section-title"><Users size={14} /> 팀원 ({members.length})</div>
                   <div className="card" style={{ padding: 0 }}>
                      <table style={{ width: '100%' }}>
                         <tbody>
                            {members.map(member => {
                              const s = students.find(x => x.id === member.student_id);
                              return s ? (
                                <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                   <td style={{ padding: '12px 16px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                                         {s.name} {member.student_id === team.leader_id && <Crown size={12} color="var(--yellow)" />}
                                      </div>
                                   </td>
                                   <td style={{ padding: '12px 16px' }}>
                                      <input className="form-input" style={{ height: 30, fontSize: 12 }} value={member.role || ''} onChange={e => updateTeamMemberRole(member.id, e.target.value)} placeholder="역할..." />
                                   </td>
                                   <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                                      <button onClick={() => removeTeamMember(member.id)} style={{ color: 'var(--text-muted)' }}><Trash2 size={13} /></button>
                                   </td>
                                </tr>
                              ) : null;
                            })}
                         </tbody>
                      </table>
                      <button className="add-todo-btn" style={{ padding: '12px 16px', justifyContent: 'center' }} onClick={() => setShowMemberSelector(true)}>
                         <Plus size={14} /> 팀원 추가
                      </button>
                   </div>
                </section>
             </div>
           )}

           {activeTab === 'eval' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card" style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: 24, textAlign: 'center' }}>
                   <div style={{ opacity: 0.9, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>팀 종합 성취도</div>
                   <div style={{ fontSize: 48, fontWeight: 900 }}>{overallScore.toFixed(1)}</div>
                </div>
                <div className="card">
                   {project?.score_categories.map(cat => (
                     <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{cat.label}</span>
                        <StarRating 
                           key={`team-${cat.id}-${categoryScores[cat.id] || 0}`}
                           value={categoryScores[cat.id] || 0} 
                           onChange={v => setCategoryScores(prev => ({ ...prev, [cat.id]: v }))} 
                           size={20} 
                        />
                     </div>
                   ))}
                   <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, height: 48 }} onClick={handleSaveScores}>
                      <Save size={16} /> 팀 점수 저장
                   </button>
                </div>
             </div>
           )}

           {activeTab === 'logs' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <button className="btn btn-primary" style={{ width: '100%', gap: 6 }} onClick={() => { 
                   setEditingLog(null); 
                   setLogForm({ 
                     type: '회의록', date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'), 
                     content: '', student_id: -1 
                   }); 
                   setShowLogModal(true); 
                }}>
                   <Plus size={15} /> 활동 로그 추가
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                   {teamTimeline.map(c => (
                     <div key={`${c.isTeam ? 't' : 's'}-${c.id}`} className="consult-item" style={{ borderLeft: c.isTeam ? '4px solid var(--accent)' : 'none' }}>
                        <div className="consult-meta">
                           <span className="badge">{c.type}</span>
                           <span>{formatShortDate(c.date)}</span>
                           <span>{c.isTeam ? '👥 팀' : '👤 개인'}</span>
                           <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                              <button onClick={() => { 
                                setEditingLog(c); 
                                setLogForm({ type: c.type, date: c.date.split('T')[0], time: c.date.includes('T') ? c.date.split('T')[1].slice(0, 5) : '00:00', content: c.content, student_id: c.student_id }); 
                                setShowLogModal(true); 
                              }}><Edit3 size={12} /></button>
                              <button onClick={() => { if(confirm('삭제하시겠습니까?')) { if (c.isTeam) deleteProjectLog(c.id); else deleteConsultation(c.id); } }} style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
                           </div>
                        </div>
                        <div className="consult-content markdown-body"><ReactMarkdown>{c.content}</ReactMarkdown></div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>

      {showMemberSelector && (
        <div className="modal-overlay" onClick={() => setShowMemberSelector(false)}>
          <div className="modal card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">팀원 추가</h3></div>
            <div className="modal-body">
              <input className="form-input" placeholder="이름으로 검색..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} autoFocus />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
                {students.filter(s => s.name.includes(memberSearch) && !members.some(m => m.student_id === s.id)).map(s => (
                  <div key={s.id} onClick={() => { addTeamMember(team.id, s.id); setShowMemberSelector(false); }} 
                    style={{ padding: 12, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span><Plus size={14} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
           <div className="modal card" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3 className="modal-title">{editingLog ? '기록 수정' : '활동 로그 추가'}</h3></div>
              <div className="modal-body">
                 <div className="form-field">
                    <label className="form-label">기록 대상</label>
                    <select className="form-select" value={logForm.student_id} onChange={e => setLogForm(f => ({ ...f, student_id: Number(e.target.value) }))}>
                       <option value={-1}>팀 전체</option>
                       {members.map(m => {
                         const s = students.find(std => std.id === m.student_id);
                         return s ? <option key={m.id} value={s.id}>{s.name} (개인)</option> : null;
                       })}
                    </select>
                 </div>
                 <div className="form-field">
                    <label className="form-label">내용</label>
                    <textarea className="form-input" rows={6} value={logForm.content} onChange={e => setLogForm(f => ({ ...f, content: e.target.value }))} />
                 </div>
                 <div className="form-row">
                    <div className="form-field">
                       <label className="form-label">날짜</label>
                       <input type="date" className="form-input" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="form-field">
                       <label className="form-label">시간</label>
                       <input type="time" className="form-input" value={logForm.time} onChange={e => setLogForm(f => ({ ...f, time: e.target.value }))} />
                    </div>
                 </div>
                 <div className="form-field">
                    <label className="form-label">유형</label>
                    <select className="form-select" value={logForm.type} onChange={e => setLogForm(f => ({ ...f, type: e.target.value as any }))}>
                       {logForm.student_id === -1 ? (
                         <>
                           <option value="회의록">회의록</option>
                           <option value="멘토피드백">멘토피드백</option>
                           <option value="진행보고">진행보고</option>
                         </>
                       ) : (
                         <>
                           <option value="학습점검">개발로그</option>
                           <option value="개인상담">피드백</option>
                           <option value="기타">기타</option>
                         </>
                       )}
                    </select>
                 </div>
              </div>
              <div className="modal-footer">
                 <button className="btn btn-secondary" onClick={() => setShowLogModal(false)}>취소</button>
                 <button className="btn btn-primary" onClick={handleLogSubmit}>저장</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
