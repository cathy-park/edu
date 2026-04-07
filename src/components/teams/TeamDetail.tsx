'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Users, Clock, Save, Trash2, UserPlus, Crown, Award, MessageSquare, Edit3, Plus, UserCheck
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
    students, projects, teamMembers, addTeamMember, removeTeamMember,
    updateTeam, consultations, addConsultation, updateConsultation, deleteConsultation,
    updateTeamMemberRole,
    projectLogs, addProjectLog, updateProjectLog, deleteProjectLog, updateTeamProjectScore
  } = useData();

  const project = projects.find(p => p.id === team.project_id);
  const members = teamMembers.filter(m => m.team_id === team.id);
  
  const [activeTab, setActiveTab] = useState<'info' | 'eval' | 'logs'>('info');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  
  const [logForm, setLogForm] = useState({
    type: '회의록',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    content: '',
    student_id: -1
  });

  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});

  // Fix 1: Independent Star Rating Binding - Use cat.id as key
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

  useEffect(() => {
    if (Number(logForm.student_id) === -1) {
      setLogForm(prev => ({ ...prev, type: '회의록' }));
    } else {
      setLogForm(prev => ({ ...prev, type: '개인상담' }));
    }
  }, [logForm.student_id]);

  // Fix 1-b: Compute average score in real-time
  const overallScore = useMemo(() => {
    if (!project?.score_categories || project.score_categories.length === 0) return 0;
    const total = project.score_categories.reduce((acc, cat) => acc + Number(categoryScores[cat.id] || 0), 0);
    const avg = total / project.score_categories.length;
    return Math.round(avg * 10) / 10;
  }, [categoryScores, project]);

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

    try {
      if (editingLog) {
        if (editingLog.isTeam) {
          await updateProjectLog(editingLog.id, { content: logForm.content, log_date: logForm.date, type: logForm.type as any });
        } else {
          await updateConsultation(editingLog.id, { content: logForm.content, consulted_at: combinedDateTime, type: logForm.type as any, student_id: logForm.student_id });
        }
        toast.success('기록이 수정되었습니다');
      } else {
        if (Number(logForm.student_id) === -1) {
          await addProjectLog({ team_id: team.id, log_date: logForm.date, type: logForm.type as any, content: logForm.content, title: logForm.type });
          toast.success('팀 활동 로그가 추가되었습니다');
        } else {
          await addConsultation({ student_id: Number(logForm.student_id), project_id: team.project_id, content: logForm.content, consulted_at: combinedDateTime, type: logForm.type as any });
          toast.success('개인 로그가 추가되었습니다');
        }
      }
      setShowLogModal(false);
    } catch (err) { console.error(err); }
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

  // Fix 2: Date Format YYYY-MM-DD HH:mm
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = parseISO(dateStr.replace(' ', 'T'));
      return format(d, 'yyyy-MM-dd HH:mm');
    } catch {
      return dateStr.slice(0, 16).replace('T', ' ');
    }
  };

  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        
        <div className="detail-panel-header" style={{ position: 'relative', borderBottom: 'none', paddingBottom: 10 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={24} /></button>
          <div className="detail-avatar">{team.team_name[0]}</div>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>{team.team_name}</h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{project?.name}</div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          {[
            { id: 'info', label: '공동 작업', icon: Users },
            { id: 'eval', label: '성과 평가', icon: Award },
            { id: 'logs', label: '활동 피드', icon: MessageSquare }
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
                   <div className="detail-section-title">프로젝트 실시간 현황</div>
                   <div className="card" style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                         <span style={{ fontSize: 13, fontWeight: 600 }}>전체 진행률</span>
                         <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{team.progress_pct}%</span>
                      </div>
                      <div className="progress-bg"><div className="progress-fill" style={{ width: `${team.progress_pct}%`, background: 'var(--accent)' }} /></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                         <span className={`badge ${project ? getStageColorClass(team.stage, project.stages) : ''}`}>{team.stage}</span>
                         <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>마감 기한: {project?.end_date || '-'}</span>
                      </div>
                   </div>
                </section>

                <section className="detail-section">
                   <div className="detail-section-title">팀 플레이어 ({members.length})</div>
                   <div className="card" style={{ padding: 0, background: 'var(--bg-elevated)', borderRadius: 12, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <tbody>
                            {members.map(member => {
                              const s = students.find(x => x.id === member.student_id);
                              const isLeader = member.student_id === team.leader_id;
                              return s ? (
                                <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                   <td style={{ padding: '12px 16px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                         <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                                         {isLeader && <Crown size={12} color="var(--yellow)" fill="var(--yellow)" />}
                                         {!isLeader && <button onClick={() => handleSetLeader(s.id)} style={{ padding: 0, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="팀장 지정"><Crown size={12} /></button>}
                                      </div>
                                   </td>
                                   <td style={{ padding: '12px 16px' }}>
                                      <input className="form-input" style={{ height: 28, fontSize: 12, padding: '0 8px', border: 'none', background: 'transparent' }} value={member.role || ''} onChange={e => updateTeamMemberRole(member.id, e.target.value)} placeholder="역할 부여..." />
                                   </td>
                                   <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                                      <button onClick={() => removeTeamMember(member.id)} style={{ color: 'var(--red)', opacity: 0.5, border: 'none', background: 'none' }}><Trash2 size={13} /></button>
                                   </td>
                                </tr>
                              ) : null;
                            })}
                         </tbody>
                      </table>
                      <button onClick={() => setShowMemberSelector(true)} style={{ width: '100%', padding: '12px', border: 'none', background: 'var(--bg-hover)', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>+ 새로운 팀원 초대</button>
                   </div>
                </section>
             </>
           )}

           {activeTab === 'eval' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--accent)', color: 'white', padding: 24, borderRadius: 16, textAlign: 'center' }}>
                   <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 4 }}>팀 종합 성휘도 (실시간 평균)</div>
                   <div style={{ fontSize: 42, fontWeight: 900 }}>{overallScore.toFixed(1)}</div>
                </div>
                <div className="card" style={{ padding: '8px 16px', background: 'var(--bg-elevated)', borderRadius: 16 }}>
                   {project?.score_categories.map((cat, idx) => (
                     <div key={`star-block-${cat.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: idx === project.score_categories.length - 1 ? 'none' : '1px solid var(--border)' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.label}</span>
                        <StarRating 
                           key={`star-cat-${team.id}-${cat.id}-${categoryScores[cat.id] || 0}`}
                           value={categoryScores[cat.id] || 0} 
                           onChange={v => setCategoryScores(prev => ({ ...prev, [cat.id]: v }))} 
                           size={18} 
                        />
                     </div>
                   ))}
                   <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, height: 44, borderRadius: 12 }} onClick={handleSaveScores}>
                      <Save size={16} /> 프로젝트 성과 저장
                   </button>
                </div>
             </div>
           )}

           {activeTab === 'logs' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <button className="btn btn-primary" style={{ height: 40, gap: 8 }} onClick={() => { setEditingLog(null); setShowLogModal(true); }}>
                   <Plus size={16} /> 활동 일지 작성
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   {teamTimeline.map(c => (
                     <div key={`log-feed-${c.isTeam ? 't' : 's'}-${c.id}`} className="consult-item" style={{ borderLeft: `4px solid ${c.isTeam ? 'var(--accent)' : '#94a3b8'}` }}>
                        <div className="consult-meta">
                           <span className="badge">{c.type}</span>
                           <span>{formatShortDate(c.date)}</span>
                           <span style={{ fontWeight: 700 }}>{c.isTeam ? `👥 ${team.team_name}` : `👤 ${students.find(s=>s.id===Number(c.student_id))?.name || '개인'}`}</span>
                           <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                              <button onClick={() => { setEditingLog(c); setLogForm({ type: c.type, date: c.date.split('T')[0], time: c.date.includes('T') ? c.date.split('T')[1].slice(0, 5) : '00:00', content: c.content, student_id: c.student_id }); setShowLogModal(true); }} style={{ padding: 2, background: 'none', border: 'none', color: 'var(--text-muted)' }}><Edit3 size={12} /></button>
                              <button onClick={() => { if(confirm('삭제하시겠습니까?')) { if (c.isTeam) deleteProjectLog(c.id); else deleteConsultation(c.id); } }} style={{ padding: 2, background: 'none', border: 'none', color: 'var(--red)', opacity: 0.6 }}><Trash2 size={12} /></button>
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
           <div className="modal card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3 className="modal-title">{editingLog ? '기록 수정' : '활동 로그 추가'}</h3></div>
              <div className="modal-body">
                 <div className="form-field">
                    <label className="form-label">대상</label>
                    <select className="form-select" value={logForm.student_id} onChange={e => setLogForm(f => ({ ...f, student_id: Number(e.target.value) }))}>
                       <option value={-1}>팀 전체</option>
                       {members.map(m => {
                         const s = students.find(std => std.id === m.student_id);
                         return s ? <option key={`opt-${m.id}`} value={s.id}>{s.name} (개인)</option> : null;
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
                       {Number(logForm.student_id) === -1 ? (
                         <>
                           <option value="회의록">회의록</option>
                           <option value="멘토피드백">멘토피드백</option>
                           <option value="진행보고">진행보고</option>
                         </>
                       ) : (
                         <>
                           <option value="개인상담">개인상담</option>
                           <option value="학습점검">학습점검</option>
                           <option value="전화상담">전화상담</option>
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
