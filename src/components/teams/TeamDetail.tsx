'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
    deleteProjectCategory
  } = useData();
  
  const project = projects.find(p => p.id === team.project_id);
  const members = teamMembers.filter(m => m.team_id === team.id);
  
  const [activeTab, setActiveTab] = useState<'info' | 'eval' | 'logs'>('info');
  const [progress, setProgress] = useState(team.progress_pct);
  const [projectLink, setProjectLink] = useState(team.project_link || '');
  const [teamMemo, setTeamMemo] = useState(team.memo || '');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<Consultation | null>(null);
  const [logForm, setLogForm] = useState({
    type: '학습점검' as ConsultationType,
    date: new Date().toISOString().split('T')[0],
    content: '',
    student_id: 0
  });

  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});

  // Initialize scores based on current project stages
  useEffect(() => {
    if (members.length > 0) {
      const student = students.find(s => s.id === members[0].student_id);
      const score = student?.project_scores.find(ps => ps.project_id === team.project_id);
      setCategoryScores(score?.category_scores || {});
    }
  }, [members.length, team.project_id, students]);

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

  const handleLogSubmit = async () => {
    if (!logForm.content.trim() || logForm.student_id === 0) return toast.error('내용과 수강생을 선택하세요');
    
    if (editingLog) {
      await updateConsultation(editingLog.id, {
        content: logForm.content,
        consulted_at: logForm.date,
        type: logForm.type,
        student_id: logForm.student_id
      });
      toast.success('로그가 수정되었습니다');
    } else {
      if (logForm.student_id === -1) {
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
                    <span>진척도 (자동계산)</span>
                    <strong className="accent-text">{team.progress_pct}%</strong>
                  </div>
                  <div className="prog-track-auto" style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', margin: '12px 0' }}>
                    <div style={{ height: '100%', width: `${team.progress_pct}%`, background: 'var(--accent)', transition: 'width 0.3s ease' }} />
                  </div>
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
                 <p className="total-hint">현재 프로젝트 단계에 따른 평균 점수입니다.</p>
              </div>

              <div className="cats-management">
                 <h4 className="s-title">평가 세부 항목 (진행 단계 동기화)</h4>
                 <div className="cats-list-entry" style={{ marginTop: 12 }}>
                    {(project?.stages || []).map((stage, idx) => {
                      const catId = stage.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
                      return (
                        <div key={catId} className="cat-entry-row">
                          <div className="cat-meta">
                            <span className="cat-label">{idx + 1}. {stage}</span>
                          </div>
                          <StarRating 
                            value={categoryScores[catId] || 0} 
                            onChange={v => setCategoryScores(prev => ({ ...prev, [catId]: v }))} 
                            size={20} 
                          />
                        </div>
                      );
                    })}
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
                             <button className="act-btn" onClick={() => { setEditingLog(c); setLogForm({ type: c.type, date: c.consulted_at, content: c.content, student_id: c.student_id }); setShowLogModal(true); }}><Edit3 size={12} /></button>
                             <button className="act-btn danger" onClick={() => { if(confirm('삭제하시겠습니까?')) deleteConsultation(c.id); }}><Trash2 size={12} /></button>
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

      {/* Member Selector Modal */}
      {showMemberSelector && (
        <div className="modal-sub-overlay" onClick={() => setShowMemberSelector(false)}>
          <div className="modal-sub card" onClick={e => e.stopPropagation()}>
            <div className="modal-sub-header">
              <h3 style={{ fontSize: '18px', fontWeight: 900 }}>팀원 추가</h3>
              <button className="btn btn-ghost" onClick={() => setShowMemberSelector(false)} style={{ position: 'absolute', top: '24px', right: '24px' }}><X size={20} /></button>
            </div>
            <div className="modal-sub-body">
              <div className="search-wrap">
                <Search size={14} className="s-icon" />
                <input 
                  className="form-input" 
                  placeholder="이름으로 검색..." 
                  value={memberSearch} 
                  onChange={e => setMemberSearch(e.target.value)} 
                  autoFocus 
                />
              </div>
              <div className="m-list-scroll">
                {students.filter(s => s.name.includes(memberSearch) && !members.some(m => m.student_id === s.id)).slice(0, 8).map(s => (
                  <div key={s.id} className="m-item-choice" onClick={() => { addTeamMember(team.id, s.id); setShowMemberSelector(false); toast.success(`${s.name} 팀원 추가완료`); }}>
                    <span>{s.name}</span>
                    <Plus size={14} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {showLogModal && (
        <div className="modal-sub-overlay" onClick={() => setShowLogModal(false)}>
           <div className="modal-sub card" onClick={e => e.stopPropagation()}>
              <div className="modal-sub-header">
                 <h3 style={{ fontSize: '18px', fontWeight: 900 }}>{editingLog ? '로그 수정' : '활동 로그 추가'}</h3>
                 <button className="btn btn-ghost" onClick={() => setShowLogModal(false)} style={{ position: 'absolute', top: '24px', right: '24px' }}><X size={20} /></button>
              </div>
              <div className="modal-sub-body">
                 <div className="f-field">
                    <label>대상 팀원</label>
                    <select className="form-select" value={logForm.student_id} onChange={e => setLogForm(f => ({ ...f, student_id: Number(e.target.value) }))}>
                       <option value={0}>기록 대상자 선택...</option>
                       <option value={-1}>팀원 전체 (일괄 기록)</option>
                       {members.map(m => {
                         const s = students.find(std => Number(std.id) === Number(m.student_id));
                         return s ? <option key={m.id} value={s.id}>{s.name}</option> : null;
                       })}
                    </select>
                 </div>
                 <div className="f-field">
                    <label>내용</label>
                    <textarea className="form-input" rows={4} value={logForm.content} onChange={e => setLogForm(f => ({ ...f, content: e.target.value }))} placeholder="내용기록..." />
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
        .panel-header { padding: 28px 24px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; position: relative; }
        .header-left { display: flex; gap: 16px; align-items: center; }
        .icon-badge { width: 46px; height: 46px; background: var(--accent-light); color: var(--accent); border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .panel-title { font-size: 22px; font-weight: 950; margin: 0 0 4px; color: var(--text-primary); }
        .panel-subtitle { font-size: 13px; color: var(--text-muted); font-weight: 600; }
        .btn-close-large { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 8px; transition: background 0.2s; }
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
        .accent-text { font-size: 26px; font-weight: 900; color: var(--accent); }
        .prog-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
        .card-flat { padding: 16px; background: var(--bg-surface); border-radius: 12px; border: 1.5px solid var(--border); }
        .f-label { display: block; font-size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 8px; }
        .input-with-action { display: flex; gap: 8px; }
        .selector-overlay { display: none; }
        .modal-sub-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s; }
        .modal-sub { background: var(--bg-surface); border-radius: 24px; width: 100%; max-width: 440px; box-shadow: 0 30px 60px rgba(0,0,0,0.3); position: relative; }
        .modal-sub-header { padding: 28px 24px 12px; }
        .modal-sub-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .modal-sub-footer { padding: 20px 24px; background: var(--bg-elevated); display: flex; justify-content: flex-end; gap: 10px; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; }
        .m-list-scroll { display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow-y: auto; margin-top: 12px; }
        .m-item-choice { padding: 12px; font-size: 14px; font-weight: 700; display: flex; justify-content: space-between; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: var(--bg-elevated); }
        .m-item-choice:hover { background: var(--accent); color: white; }
        .member-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .m-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-surface); border: 1.5px solid var(--border); border-radius: 14px; cursor: pointer; position: relative; }
        .m-avatar { width: 32px; height: 32px; background: var(--accent-light); color: var(--accent); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; }
        .m-name { font-size: 13px; font-weight: 800; }
        .score-summary-card { padding: 24px; background: var(--accent); color: white; border-radius: 20px; }
        .total-hero { display: flex; alignItems: center; gap: 16px; margin-top: 12px; }
        .total-num { font-size: 42px; font-weight: 900; }
        .cat-entry-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border); }
        .cat-entry-row:last-child { border-bottom: none; }
        .cat-label { font-size: 14px; font-weight: 700; }
        .log-card { padding: 20px; background: var(--bg-surface); border-radius: 16px; border: 1.5px solid var(--border); }
        .log-actions { display: flex; gap: 8px; }
        .act-btn { background: var(--bg-elevated); border: none; padding: 6px; border-radius: 6px; cursor: pointer; color: var(--text-muted); }
        .act-btn:hover { color: var(--accent); }
        .search-wrap { position: relative; }
        .s-icon { position: absolute; left: 12px; top: 12px; color: var(--text-muted); }
        .search-wrap .form-input { padding-left: 36px; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}} />
    </div>
  );
}
