'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, Users, BookOpen, Clock, ChevronRight, 
  Save, Trash2, UserPlus, Star, Search, 
  Check, Plus, Link as LinkIcon, MessageSquare, 
  Edit3, Calendar, Minus, StickyNote
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
    addProjectCategory, deleteProjectCategory
  } = useData();
  
  const project = projects.find(p => p.id === team.project_id);
  const members = teamMembers.filter(m => m.team_id === team.id);
  
  const [activeTab, setActiveTab] = useState<'info' | 'eval' | 'logs'>('info');
  const [progress, setProgress] = useState(team.progress_pct);
  const [projectLink, setProjectLink] = useState(team.project_link || '');
  const [teamMemo, setTeamMemo] = useState(team.memo || '');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  
  const [newCatLabel, setNewCatLabel] = useState('');
  
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<Consultation | null>(null);
  const [logForm, setLogForm] = useState({
    type: '학습점검' as ConsultationType,
    date: new Date().toISOString().split('T')[0],
    content: '',
    student_id: 0
  });

  const [categoryScores, setCategoryScores] = useState<Record<string, number>>(() => {
    if (members.length > 0) {
      const student = students.find(s => s.id === members[0].student_id);
      const score = student?.project_scores.find(ps => ps.project_id === team.project_id);
      return score?.category_scores || {};
    }
    return {};
  });

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

  const handleSaveScores = () => {
    if (members.length === 0) return toast.error('평가할 팀원이 없습니다');
    members.forEach(m => {
      updateProjectScore(m.student_id, team.project_id, categoryScores, overallScore);
    });
    toast.success('팀 및 개인별 점수가 일괄 반영되었습니다');
  };

  const handleAddCategory = () => {
    if (!newCatLabel.trim() || !project) return;
    addProjectCategory(project.id, newCatLabel.trim());
    setNewCatLabel('');
    toast.success('평가 항목이 추가되었습니다');
  };

  const handleLogSubmit = async () => {
    if (!logForm.content.trim() || logForm.student_id === 0) return toast.error('내용과 수강생을 선택하세요');
    
    if (editingLog) {
      updateConsultation(editingLog.id, {
        content: logForm.content,
        consulted_at: logForm.date,
        type: logForm.type,
        student_id: logForm.student_id
      });
      toast.success('로그가 수정되었습니다');
    } else {
      if (logForm.student_id === -1) {
        // All members bulk insert
        for (const m of members) {
          await addConsultation({
            student_id: m.student_id,
            project_id: team.project_id,
            content: logForm.content,
            consulted_at: logForm.date,
            type: logForm.type
          });
        }
        toast.success(`팀원 전체(${members.length}명)에게 로그가 기록되었습니다`);
      } else {
        await addConsultation({
          student_id: logForm.student_id,
          project_id: team.project_id,
          content: logForm.content,
          consulted_at: logForm.date,
          type: logForm.type
        });
        toast.success('활동 로그가 추가되었습니다');
      }
    }
    setShowLogModal(false);
  };

  const teamConsultations = useMemo(() => {
    const memberIds = members.map(m => m.student_id);
    return consultations.filter(c => memberIds.includes(c.student_id) && c.project_id === team.project_id)
      .sort((a, b) => b.consulted_at.localeCompare(a.consulted_at));
  }, [consultations, members, team.project_id]);

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
                    <span>진척도</span>
                    <strong className="accent-text">{progress}%</strong>
                  </div>
                  <input type="range" className="prog-slider" value={progress} onChange={e => setProgress(Number(e.target.value))} onMouseUp={() => onProgressUpdate(team.id, progress)} />
                  <div className="prog-foot">
                    <span className={`badge ${project ? getStageColorClass(team.stage, project.stages) : ''}`}>{team.stage}</span>
                    <span className="update-time">마감일: {project?.id === 1 ? '완료' : 'D-12'}</span>
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
                    rows={6} 
                    placeholder="프로젝트 관련 특이사항이나 아이디어를 기록하세요... (Markdown 지원)" 
                    value={teamMemo} 
                    onChange={e => setTeamMemo(e.target.value)}
                    style={{ border: 'none', background: 'transparent', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveInfo} style={{ gap: 6 }}>
                      <Save size={14} /> 메모 저장
                    </button>
                  </div>
                </div>
                {teamMemo && (
                  <div className="memo-preview markdown-body" style={{ padding: '0 8px', fontSize: 13, borderLeft: '3px solid var(--accent-light)' }}>
                    <ReactMarkdown>{teamMemo}</ReactMarkdown>
                  </div>
                )}
              </section>

              <section className="p-section">
                <div className="s-between">
                  <h4 className="s-title"><Users size={16} /> 팀 구성원 ({members.length})</h4>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowMemberSelector(true)}><UserPlus size={14} /> 추가</button>
                </div>

                {showMemberSelector && (
                  <div className="selector-overlay card">
                    <div className="search-wrap">
                      <Search size={14} className="s-icon" />
                      <input className="form-input" placeholder="이름 검색..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} autoFocus />
                      <button className="btn-close-mini" onClick={() => setShowMemberSelector(false)}><X size={14} /></button>
                    </div>
                    <div className="m-list-scroll">
                       {students.filter(s => !members.some(m => m.student_id === s.id) && s.name.includes(memberSearch)).slice(0, 5).map(s => (
                         <div key={s.id} className="m-item-choice" onClick={() => { addTeamMember(team.id, s.id); setShowMemberSelector(false); toast.success('추가되었습니다'); }}>
                           {s.name} <Plus size={14} />
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                <div className="member-grid">
                  {members.map(m => {
                    const s = students.find(std => std.id === m.student_id);
                    if (!s) return null;
                    return (
                      <div key={m.id} className="m-row" onClick={() => onMemberClick(m.student_id)}>
                        <div className="m-avatar">{s.name[0]}</div>
                        <div className="m-info">
                          <span className="m-name">{s.name}</span>
                          <span className="m-role">{m.role || '팀원'}</span>
                        </div>
                        <button className="m-del" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(confirm('팀원을 제외하시겠습니까?')) removeTeamMember(m.id); }}><X size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'eval' && (
            <div className="tab-stack">
              <div className="score-summary-card">
                 <div className="total-title">팀 종합 점수 (자동 계산)</div>
                 <div className="total-hero">
                    <StarRating value={overallScore} readonly size={36} />
                    <span className="total-num">{overallScore.toFixed(1)}</span>
                 </div>
                 <p className="total-hint">아래 세부 항목의 평균값이 총점이 됩니다.</p>
              </div>

              <div className="cats-management">
                 <div className="s-between">
                    <h4 className="s-title">평가 세부 항목</h4>
                    <div className="add-cat-form">
                       <input className="form-input-mini" placeholder="새 항목..." value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                       <button className="btn btn-primary btn-icon" onClick={handleAddCategory}><Plus size={14} /></button>
                    </div>
                 </div>

                 <div className="cats-list-entry">
                    {project?.score_categories.map(cat => (
                      <div key={cat.id} className="cat-entry-row">
                        <div className="cat-meta">
                           <span className="cat-label">{cat.label}</span>
                           <button className="btn-del-cat" onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteProjectCategory(project.id, cat.id); }}><Minus size={12} /></button>
                        </div>
                        <StarRating value={categoryScores[cat.id] || 0} onChange={v => setCategoryScores(p => ({ ...p, [cat.id]: v }))} size={20} />
                      </div>
                    ))}
                 </div>

                 <button className="btn btn-primary btn-full" onClick={handleSaveScores} style={{ marginTop: 24, height: 48 }}>
                    <Save size={16} /> 평가 점수 최종 저장
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="tab-stack">
                <div className="s-between">
                  <h4 className="s-title">활동 기록 / 피드백</h4>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditingLog(null); setLogForm({ type: '학습점검', date: new Date().toISOString().split('T')[0], content: '', student_id: 0 }); setShowLogModal(true); }}>
                    <Plus size={14} /> 로그 추가
                  </button>
               </div>

               <div className="logs-timeline">
                  {teamConsultations.map(c => {
                    const student = students.find(s => s.id === c.student_id);
                    return (
                      <div key={c.id} className="log-card">
                         <div className="log-head">
                            <div className="log-meta">
                               <span className="log-date">{c.consulted_at}</span>
                               <span className="log-author">{student?.name}</span>
                            </div>
                            <div className="log-actions">
                               <button className="act-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingLog(c); setLogForm({ type: c.type, date: c.consulted_at, content: c.content, student_id: c.student_id }); setShowLogModal(true); }}><Edit3 size={12} /></button>
                               <button className="act-btn danger" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(confirm('이 활동 기록을 삭제하시겠습니까?')) deleteConsultation(c.id); }}><Trash2 size={12} /></button>
                            </div>
                         </div>
                         <div className="log-body markdown-body">
                            <ReactMarkdown>{c.content}</ReactMarkdown>
                         </div>
                      </div>
                    );
                  })}
                  {teamConsultations.length === 0 && <div className="empty-logs">기록된 활동 로그가 없습니다.</div>}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="modal-sub-overlay" onClick={() => setShowLogModal(false)}>
           <div className="modal-sub card" onClick={e => e.stopPropagation()}>
              <div className="modal-sub-header">
                 <h3>{editingLog ? '로그 수정' : '활동 로그 추가'}</h3>
                 <button className="btn btn-ghost" onClick={() => setShowLogModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-sub-body">
                 <div className="f-field">
                    <label>대상 팀원</label>
                    <select className="form-select" value={logForm.student_id} onChange={e => setLogForm(f => ({ ...f, student_id: Number(e.target.value) }))}>
                       <option value={0}>기록 대상자 선택...</option>
                       <option value={-1}>팀원 전체 (일괄 기록)</option>
                       {members.map(m => {
                         const student = students.find(s => s.id === m.student_id);
                         return <option key={m.id} value={m.student_id}>{student?.name}</option>;
                       })}
                    </select>
                 </div>
                 <div className="f-field">
                    <label>내용</label>
                    <textarea className="form-input" rows={4} value={logForm.content} onChange={e => setLogForm(f => ({ ...f, content: e.target.value }))} placeholder="회의 내용이나 피드백을 기록하세요..." />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="f-field">
                       <label>날짜</label>
                       <input type="date" className="form-input" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="f-field">
                       <label>유형</label>
                       <select className="form-select" value={logForm.type} onChange={e => setLogForm(f => ({ ...f, type: e.target.value as ConsultationType }))}>
                          <option value="학습점검">개발로그</option>
                          <option value="개인상담">피드백</option>
                          <option value="기타">회의록</option>
                       </select>
                    </div>
                 </div>
              </div>
              <div className="modal-sub-footer">
                 <button className="btn btn-secondary" onClick={() => setShowLogModal(false)}>취소</button>
                 <button className="btn btn-primary" onClick={handleLogSubmit}>{editingLog ? '수정' : '추가'}</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; justify-content: flex-end; animation: fadeIn 0.2s; }
        .side-panel { width: 500px; height: 100%; background: var(--bg-surface); box-shadow: -15px 0 40px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .panel-header { padding: 28px 24px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; }
        .header-left { display: flex; gap: 16px; align-items: center; }
        .icon-badge { width: 46px; height: 46px; background: var(--accent-light); color: var(--accent); border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .panel-title { font-size: 22px; font-weight: 950; margin: 0 0 4px; color: var(--text-primary); }
        .panel-subtitle { font-size: 13px; color: var(--text-muted); font-weight: 600; }
        .btn-close-large { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 8px; transition: background 0.2s; }
        .btn-close-large:hover { background: var(--bg-elevated); }
        .panel-tabs { display: flex; width: 100%; border-bottom: 1px solid var(--border); background: var(--bg-elevated); }
        .p-tab { flex: 1; padding: 16px 0; border: none; background: none; font-size: 13px; font-weight: 800; color: var(--text-muted); border-bottom: 3px solid transparent; transition: all 0.2s; cursor: pointer; }
        .p-tab.active { color: var(--accent); border-bottom-color: var(--accent); background: var(--bg-surface); }
        .panel-main-scroll { flex: 1; overflow-y: auto; padding: 24px; background: var(--bg-base); }
        .tab-stack { display: flex; flex-direction: column; gap: 28px; }
        .p-section { display: flex; flex-direction: column; gap: 14px; }
        .s-title { font-size: 12px; font-weight: 800; color: var(--text-muted); display: flex; align-items: center; gap: 8px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .s-between { display: flex; justify-content: space-between; align-items: center; }
        .status-card { padding: 24px; background: var(--bg-surface); border-radius: 18px; border: 1.5px solid var(--border); }
        .prog-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
        .prog-head span { font-size: 14px; font-weight: 700; }
        .accent-text { font-size: 26px; font-weight: 900; color: var(--accent); line-height: 1; }
        .prog-slider { width: 100%; height: 6px; background: var(--border); border-radius: 3px; appearance: none; outline: none; margin-bottom: 12px; }
        .prog-slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 3px solid var(--bg-surface); }
        .prog-foot { display: flex; justify-content: space-between; align-items: center; }
        .update-time { font-size: 11px; color: var(--text-muted); font-weight: 600; }
        .card-flat { padding: 16px; background: var(--bg-surface); border-radius: 12px; border: 1.5px solid var(--border); }
        .f-label { display: block; font-size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 8px; }
        .input-with-action { display: flex; gap: 8px; }
        .btn-icon { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; border-radius: 8px; }
        .selector-overlay { padding: 12px; border-color: var(--accent); position: absolute; left: 24px; width: 400px; z-index: 10; margin-top: -8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .search-wrap { position: relative; margin-bottom: 8px; }
        .s-icon { position: absolute; left: 10px; top: 12px; color: var(--text-muted); }
        .search-wrap .form-input { padding-left: 32px; height: 38px; font-size: 13px; }
        .m-list-scroll { display: flex; flex-direction: column; gap: 2px; max-height: 160px; overflow-y: auto; }
        .m-item-choice { padding: 8px; font-size: 13px; font-weight: 700; display: flex; justify-content: space-between; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
        .m-item-choice:hover { background: var(--accent); color: white; }
        .member-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .m-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; position: relative; transition: all 0.2s; }
        .m-row:hover { border-color: var(--accent); }
        .m-avatar { width: 32px; height: 32px; background: var(--accent); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; }
        .m-info { display: flex; flex-direction: column; }
        .m-name { font-size: 13px; font-weight: 800; }
        .m-role { font-size: 10px; color: var(--text-muted); font-weight: 700; }
        .m-del { position: absolute; top: 6px; right: 6px; background: none; border: none; color: var(--text-muted); opacity: 0; cursor: pointer; transition: opacity 0.2s; }
        .m-row:hover .m-del { opacity: 1; }
        /* Eval & Logic */
        .score-summary-card { padding: 24px; background: var(--accent); color: white; border-radius: 18px; }
        .total-title { font-size: 12px; font-weight: 800; opacity: 0.8; margin-bottom: 12px; }
        .total-hero { display: flex; align-items: center; gap: 20px; color: white; }
        .total-num { font-size: 38px; font-weight: 900; line-height: 1; margin-top: -4px; }
        .total-hint { font-size: 11px; opacity: 0.8; margin-top: 14px; font-weight: 600; }
        .add-cat-form { display: flex; gap: 4px; height: 36px; }
        .form-input-mini { width: 110px; font-size: 11px; border: 1.5px solid var(--border); border-radius: 8px; padding: 0 8px; background: var(--bg-surface); }
        .cats-list-entry { background: var(--bg-surface); border-radius: 16px; border: 1.5px solid var(--border); padding: 4px 0; margin-top: 8px; }
        .cat-entry-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border); }
        .cat-entry-row:last-child { border-bottom: none; }
        .cat-meta { display: flex; align-items: center; gap: 8px; }
        .cat-label { font-size: 14px; font-weight: 800; }
        .btn-del-cat { width: 22px; height: 22px; border-radius: 50%; border: none; background: rgba(239,68,68,0.1); color: var(--red); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; }
        .btn-full { width: 100%; border-radius: 12px; font-size: 14px; font-weight: 900; gap: 10px; }
        /* Logs */
        .logs-timeline { display: flex; flex-direction: column; gap: 16px; }
        .log-card { padding: 16px; background: var(--bg-surface); border-radius: 14px; border: 1.5px solid var(--border); }
        .log-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .log-meta { display: flex; gap: 10px; font-size: 11px; font-weight: 700; }
        .log-date { color: var(--text-muted); }
        .log-author { color: var(--accent); border-radius: 4px; background: var(--accent-light); padding: 1px 6px; }
        .log-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
        .log-card:hover .log-actions { opacity: 1; }
        .act-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; }
        .act-btn:hover { background: var(--bg-elevated); color: var(--accent); }
        .act-btn.danger:hover { color: var(--red); }
        .log-body { font-size: 13px; line-height: 1.6; color: var(--text-primary); }
        .empty-logs { text-align: center; padding: 40px 0; font-size: 12px; color: var(--text-muted); font-weight: 600; opacity: 0.6; }
        .modal-sub-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s; }
        .modal-sub { background: var(--bg-surface); border-radius: 20px; overflow: hidden; width: 100%; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .modal-sub-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .modal-sub-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .modal-sub-footer { padding: 16px 20px; background: var(--bg-elevated); display: flex; justify-content: flex-end; gap: 10px; }
        .f-field label { display: block; font-size: 12px; font-weight: 800; color: var(--text-muted); margin-bottom: 8px; }
        
        .markdown-body p { margin-bottom: 12px; line-height: 1.6; }
        .markdown-body ul { padding-left: 20px; margin-bottom: 12px; }
        .markdown-body li { margin-bottom: 6px; }
        .memo-preview { margin-top: 12px; background: #fffcf0; padding: 12px; border-radius: 8px; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}} />
    </div>
  );
}
