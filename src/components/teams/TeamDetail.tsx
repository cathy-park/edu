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
    type: '학습점검',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    content: '',
    student_id: 0
  });

  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (activeStudent) {
      const score = activeStudent.project_scores.find(ps => ps.project_id === team.project_id);
      setCategoryScores(score?.category_scores || {});
    } else {
      // In a real app we might fetch team-wide score here
      setCategoryScores({}); 
    }
  }, [activeStudent?.id, team.project_id]);

  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});

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
    if (activeStudent) {
      await updateProjectScore(activeStudent.id, team.project_id, categoryScores, overallScore);
      toast.success(`${activeStudent.name}님의 성적이 저장되었습니다`);
    } else {
      await updateTeamProjectScore(team.id, team.project_id, categoryScores, overallScore);
    }
  };

  const handleLogSubmit = async () => {
    if (!logForm.content.trim() || logForm.student_id === 0) return toast.error('내용과 수강생을 선택하세요');
    
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
        toast.success('로그가 수정되었습니다');
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
    } catch (err) {
      console.error(err);
      return;
    }
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
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const HHmm = dateStr.includes('T') ? dateStr.split('T')[1].slice(0, 5) : '00:00';
      const MMDD = `${d.getMonth() + 1}-${d.getDate()}`;
      if (d.toDateString() === now.toDateString()) return HHmm;
      return `${MMDD} ${HHmm}`;
    } catch {
      return dateStr.split('T')[0];
    }
  };

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <div className="header-left">
            <div className="icon-badge"><Users size={20} /></div>
            <div className="title-area">
              <h2 className="panel-title">{team.team_name}</h2>
              <span className="panel-subtitle">{project?.name}</span>
            </div>
          </div>
          <button className="btn-close-large" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="panel-tabs">
          <button className={`p-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>팀 정보</button>
          <button className={`p-tab ${activeTab === 'eval' ? 'active' : ''}`} onClick={() => setActiveTab('eval')}>성과 평가</button>
          <button className={`p-tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>활동 로그</button>
        </div>

        <div className="panel-main-scroll">
          {activeTab === 'info' && (
            <div className="tab-stack">
              <section className="p-section">
                <h4 className="s-title"><Clock size={16} /> 프로젝트 진행상황</h4>
                <div className="status-card">
                  <div className="prog-head">
                    <span>진척도 (자동계산)</span>
                    <strong className="accent-text">{team.progress_pct}%</strong>
                  </div>
                  <div className="prog-track-auto" style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', margin: '12px 0' }}>
                    <div style={{ height: '100%', width: `${team.progress_pct}%`, background: 'var(--accent)', transition: 'width 0.3s ease' }} />
                  </div>
                  <div className="prog-foot">
                    <span className={`badge ${project ? getStageColorClass(team.stage, project.stages) : ''}`}>{team.stage}</span>
                    <span className="update-time">마감일: {project?.end_date || '미정'}</span>
                  </div>
                </div>
              </section>

              <section className="p-section">
                <h4 className="s-title"><LinkIcon size={16} /> 프로젝트 리소스</h4>
                <div className="card-flat">
                  <label className="f-label">저장소/데모 링크</label>
                  <div className="input-with-action">
                    <input className="form-input" placeholder="https://github.com/..." value={projectLink} onChange={e => setProjectLink(e.target.value)} />
                    <button className="btn btn-secondary btn-icon" onClick={handleSaveInfo}><Check size={18} /></button>
                  </div>
                </div>
              </section>

              <section className="p-section">
                <h4 className="s-title"><StickyNote size={16} /> 프로젝트 메모</h4>
                <div className="card-flat" style={{ padding: 12 }}>
                  <textarea 
                    className="form-input" 
                    rows={4} 
                    placeholder="프로젝트 관련 특이사항 기록..." 
                    value={teamMemo} 
                    onChange={e => setTeamMemo(e.target.value)}
                    style={{ border: 'none', background: 'transparent', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveInfo} style={{ gap: 6 }}>
                      <Save size={14} /> 저장
                    </button>
                  </div>
                </div>
              </section>

              <section className="p-section">
                <div className="s-between">
                  <h4 className="s-title"><Users size={16} /> 팀 구성원 ({members.length})</h4>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowMemberSelector(true)}><UserPlus size={14} /> 추가</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
                  <tbody>
                    {members.map(member => {
                      const student = students.find(s => s.id === member.student_id);
                      if (!student) return null;
                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {student.name}
                                {member.student_id === team.leader_id && <span style={{ marginLeft: 6, color: 'var(--yellow)' }}>👑</span>}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <input 
                              className="form-input" 
                              value={member.role || ''} 
                              onChange={(e) => updateTeamMemberRole(member.id, e.target.value)}
                              placeholder="역할 입력..."
                              style={{ height: 32, fontSize: 12, padding: '0 10px', background: 'transparent' }}
                            />
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary" onClick={() => updateTeam(team.id, { leader_id: member.student_id })} style={{ padding: '0 8px', height: 28, fontSize: 10, visibility: member.student_id === team.leader_id ? 'hidden' : 'visible' }}>👑 팀장</button>
                              <button onClick={() => removeTeamMember(member.id)} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0 }}><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {activeTab === 'eval' && (
            <div className="tab-stack">
              <div className="eval-student-picker" style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 8 }}>
                 <button className={`btn btn-sm ${!activeStudent ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveStudent(null)}>팀 전체</button>
                 {members.map(m => {
                    const s = students.find(std => std.id === m.student_id);
                    return s ? (
                      <button key={s.id} className={`btn btn-sm ${activeStudent?.id === s.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveStudent(s)}>{s.name}</button>
                    ) : null;
                 })}
              </div>
              <div className="score-summary-card" style={{ background: activeStudent ? 'var(--purple)' : 'var(--accent)', color: 'white' }}>
                 <div className="total-title" style={{ opacity: 0.9, fontSize: '12px', fontWeight: 800 }}>{activeStudent ? `${activeStudent.name}님 성취도` : '팀 종합 성취도'}</div>
                 <div className="total-hero" style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                    <StarRating value={overallScore} readonly size={36} />
                    <span className="total-num" style={{ fontSize: '42px', fontWeight: 900 }}>{overallScore.toFixed(1)}</span>
                 </div>
              </div>
              <div className="cats-management">
                 <h4 className="s-title">평가 세부 항목</h4>
                 <div className="cats-list-entry" style={{ marginTop: 12 }}>
                    {(project?.score_categories || []).map((cat) => (
                        <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{cat.label}</span>
                          <StarRating 
                             key={`${activeStudent?.id || 'team'}-${cat.id}-${categoryScores[cat.id] || 0}`}
                             value={categoryScores[cat.id] || 0} 
                             onChange={v => setCategoryScores(prev => ({ ...prev, [cat.id]: v }))} 
                             size={20} 
                          />
                        </div>
                    ))}
                    {(!project?.score_categories || project.score_categories.length === 0) && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>평가 항목이 정의되지 않았습니다.</div>}
                 </div>
                 <button className="btn btn-primary btn-full" onClick={handleSaveScores} style={{ marginTop: 24, height: 48, width: '100%' }}>
                    <Save size={16} /> {activeStudent ? `${activeStudent.name} 점수 저장` : '팀 점수 전체 저장'}
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="tab-stack">
              <div className="s-between">
                <h4 className="s-title">활동 기록 / 피드백</h4>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingLog(null); setLogForm({ type: '회의록', date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), content: '', student_id: -1 }); setShowLogModal(true); }}>
                  <Plus size={14} /> 로그 추가
                </button>
              </div>
              <div className="logs-timeline">
                {teamTimeline.map(c => {
                  const student = students.find(s => s.id === c.student_id);
                  return (
                    <div key={`${c.isTeam ? 't' : 's'}-${c.id}`} className={`log-card ${c.isTeam ? 'is-team' : ''}`}>
                       <div className="log-head">
                          <div className="log-meta">
                             <span className="log-date">{formatShortDate(c.date)}</span>
                             <span className="log-author">{c.isTeam ? '👥 팀 전체' : student?.name}</span>
                          </div>
                          <div className="log-actions">
                             <button className="act-btn" onClick={() => { setEditingLog(c); setLogForm({ type: c.type, date: c.date.split('T')[0], time: c.date.includes('T') ? c.date.split('T')[1].slice(0, 5) : '00:00', content: c.content, student_id: c.student_id }); setShowLogModal(true); }}><Edit3 size={12} /></button>
                             <button className="act-btn danger" onClick={() => { if(confirm('삭제하시겠습니까?')) { if (c.isTeam) deleteProjectLog(c.id); else deleteConsultation(c.id); } }}><Trash2 size={12} /></button>
                          </div>
                       </div>
                       <div className="log-body markdown-body"><ReactMarkdown>{c.content}</ReactMarkdown></div>
                    </div>
                  );
                })}
                {teamTimeline.length === 0 && <div className="empty-logs">기록된 활동 로그가 없습니다.</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showMemberSelector && (
        <div className="modal-sub-overlay" onClick={() => setShowMemberSelector(false)}>
          <div className="modal-sub card" onClick={e => e.stopPropagation()}>
            <div className="modal-sub-header"><h3>팀원 추가</h3></div>
            <div className="modal-sub-body">
              <input className="form-input" placeholder="이름으로 검색..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} autoFocus />
              <div className="m-list-scroll">
                {students.filter(s => s.name.includes(memberSearch) && !members.some(m => m.student_id === s.id)).map(s => (
                  <div key={s.id} className="m-item-choice" onClick={() => { addTeamMember(team.id, s.id); setShowMemberSelector(false); }}>
                    <span>{s.name}</span><Plus size={14} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogModal && (
        <div className="modal-sub-overlay" onClick={() => setShowLogModal(false)}>
           <div className="modal-sub card" onClick={e => e.stopPropagation()}>
              <div className="modal-sub-header"><h3>{editingLog ? '로그 수정' : '로그 추가'}</h3></div>
              <div className="modal-sub-body">
                 <div className="f-field">
                    <label>대상 팀원</label>
                    <select className="form-select" value={logForm.student_id} onChange={e => setLogForm(f => ({ ...f, student_id: Number(e.target.value) }))}>
                       <option value={0}>선택...</option>
                       <option value={-1}>팀원 전체</option>
                       {members.map(m => {
                         const s = students.find(std => std.id === m.student_id);
                         return s ? <option key={m.id} value={s.id}>{s.name}</option> : null;
                       })}
                    </select>
                 </div>
                 <div className="f-field">
                    <label>내용</label>
                    <textarea className="form-input" rows={4} value={logForm.content} onChange={e => setLogForm(f => ({ ...f, content: e.target.value }))} />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="f-field">
                       <label>날짜</label>
                       <input type="date" className="form-input" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="f-field">
                       <label>유형</label>
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
              </div>
              <div className="modal-sub-footer">
                 <button className="btn btn-secondary" onClick={() => setShowLogModal(false)}>취소</button>
                 <button className="btn btn-primary" onClick={handleLogSubmit}>저장</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; justify-content: flex-end; animation: fadeIn 0.2s; }
        .side-panel { width: 500px; height: 100%; background: var(--bg-surface); box-shadow: -15px 0 40px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .panel-header { padding: 28px 24px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; }
        .icon-badge { width: 46px; height: 46px; background: var(--accent-light); color: var(--accent); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .panel-tabs { display: flex; border-bottom: 1px solid var(--border); background: var(--bg-elevated); }
        .p-tab { flex: 1; padding: 16px 0; border: none; background: none; font-size: 13px; font-weight: 800; color: var(--text-muted); cursor: pointer; border-bottom: 3px solid transparent; }
        .p-tab.active { color: var(--accent); border-bottom-color: var(--accent); background: var(--bg-surface); }
        .panel-main-scroll { flex: 1; overflow-y: auto; padding: 24px; background: var(--bg-base); }
        .tab-stack { display: flex; flex-direction: column; gap: 28px; }
        .s-title { font-size: 12px; font-weight: 800; color: var(--text-muted); display: flex; align-items: center; gap: 8px; text-transform: uppercase; }
        .status-card { padding: 20px; background: var(--bg-surface); border-radius: 18px; border: 1.5px solid var(--border); }
        .prog-head { display: flex; justify-content: space-between; align-items: baseline; }
        .accent-text { font-size: 26px; font-weight: 900; color: var(--accent); }
        .card-flat { padding: 16px; background: var(--bg-surface); border-radius: 12px; border: 1.5px solid var(--border); }
        .modal-sub-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s; }
        .modal-sub { background: var(--bg-surface); border-radius: 24px; width: 440px; box-shadow: 0 30px 60px rgba(0,0,0,0.3); }
        .log-card { padding: 20px; background: var(--bg-surface); border-radius: 16px; border: 1.5px solid var(--border); margin-bottom: 16px; }
        .log-card.is-team { border-left: 4px solid var(--accent); background: var(--accent-light); }
        .total-hero { display: flex; alignItems: center; gap: 16px; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}} />
    </div>
  );
}
