'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCohort } from '@/context/CohortContext';
import { useData } from '@/context/DataContext';
import { 
  Users, UserPlus, TrendingUp, Search, X, Edit3, Trash2, PlusCircle, Check, MessageSquare, Plus, Settings2, GripVertical
} from 'lucide-react';
import StudentDetailPanel from '@/components/students/StudentDetailPanel';
import TeamDetail from '@/components/teams/TeamDetail';
import { Team, Student, Project } from '@/lib/types';
import { getStageColorClass } from '@/lib/utils';
import toast from 'react-hot-toast';

function ProjectManagementContent() {
  const { selectedCohort } = useCohort();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isInitialSyncDone = React.useRef(false);
  const { 
    projects, teams, students, teamMembers, tags, consultations, stages: globalStages,
    updateTeamProgress, deleteTeam, addTeam, updateTeam, 
    addProject, deleteProject, updateProject, addConsultation,
    addProjectCategory, deleteProjectCategory
  } = useData();
  const { cohorts } = useCohort();
  
  const currentCohortId = useMemo(() => {
    if (selectedCohort === '전체') {
      return cohorts[0]?.id || 0;
    }
    return cohorts.find(c => c.name === selectedCohort)?.id || 0;
  }, [selectedCohort, cohorts]);

  const cohortProjects = useMemo(() => 
    projects.filter(p => selectedCohort === '전체' || p.cohort_id === currentCohortId),
    [selectedCohort, projects, currentCohortId]
  );

  const [selectedProjectId, setSelectedProjectId] = useState<number>(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  // Handle URL Params - Only once on mount to prevent accidental resets
  useEffect(() => {
    if (isInitialSyncDone.current) return;
    
    const projectIdParam = searchParams.get('project');
    const studentIdParam = searchParams.get('student');

    if (projectIdParam) {
      const pid = Number(projectIdParam);
      setSelectedProjectId(pid);
      
      if (studentIdParam) {
        const sid = Number(studentIdParam);
        const targetTeam = teams.find(t => 
          t.project_id === pid && 
          teamMembers.some(m => m.team_id === t.id && m.student_id === sid)
        );
        if (targetTeam) {
          setSelectedTeamId(targetTeam.id);
        }
      }
      isInitialSyncDone.current = true;
    }
  }, [searchParams, teams, teamMembers]);

  // Sync URL when project selection changes manually
  const handleProjectChange = (projectId: number) => {
    setSelectedProjectId(projectId);
    const params = new URLSearchParams(searchParams.toString());
    if (projectId === 0) {
      params.delete('project');
      params.delete('student');
    } else {
      params.set('project', projectId.toString());
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Modals
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({ 
    team_name: '', 
    project_id: selectedProjectId,
  });

  const [projectForm, setProjectForm] = useState<{
    name: string;
    description: string;
    cohort_id: number;
    start_date: string;
    end_date: string;
    stages: string[];
  }>({
    name: '',
    description: '',
    cohort_id: currentCohortId,
    start_date: '',
    end_date: '',
    stages: ['기획', '디자인', '개발', '검증', '완료']
  });

  // Sync projectForm cohort_id when selectedCohort changes
  useEffect(() => {
    if (!showProjectModal) {
      setProjectForm(prev => ({ ...prev, cohort_id: currentCohortId }));
    }
  }, [currentCohortId, showProjectModal]);
  
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newStageLabel, setNewStageLabel] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  const filteredTeams = useMemo(() => 
    teams.filter(t => (selectedProjectId === 0 || t.project_id === selectedProjectId) && !t.is_individual),
    [selectedProjectId, teams]
  );

  const [searchTerm, setSearchTerm] = useState('');

  const displayedTeams = useMemo(() => {
    return filteredTeams.filter(team => {
      const teamMemberEntities = teamMembers.filter(m => m.team_id === team.id);
      const memberNames = teamMemberEntities
        .map(m => students.find(s => s.id === m.student_id)?.name || '')
        .join(' ');
      
      return (
        team.team_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        memberNames.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [filteredTeams, teamMembers, students, searchTerm]);

  const handleOpenTeamModal = (t?: Team) => {
    if (t) {
      setEditingTeam(t);
      setTeamForm({ team_name: t.team_name, project_id: t.project_id });
    } else {
      setEditingTeam(null);
      setTeamForm({ team_name: '', project_id: selectedProjectId });
    }
    setShowTeamModal(true);
  };

  const handleOpenProjectModal = (p?: Project) => {
    if (p) {
      setEditingProject(p.id);
      setProjectForm({
        name: p.name,
        description: p.description || '',
        cohort_id: p.cohort_id,
        start_date: p.start_date || '',
        end_date: p.end_date || '',
        stages: p.stages
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        description: '',
        cohort_id: currentCohortId,
        start_date: '',
        end_date: '',
        stages: ['기획', '디자인', '개발', '검증', '완료']
      });
    }
    setShowProjectModal(true);
  };

  const handleSaveTeam = () => {
    if (!teamForm.team_name.trim()) return toast.error('팀 이름을 입력하세요');
    if (teamForm.project_id === 0) return toast.error('프로젝트를 선택하세요');

    if (editingTeam) {
      updateTeam(editingTeam.id, { ...teamForm, stage: editingTeam.stage });
      toast.success('팀 정보가 수정되었습니다');
    } else {
      addTeam({
        team_name: teamForm.team_name,
        project_id: teamForm.project_id,
        stage: '기획',
        progress_pct: 0,
        is_individual: false,
      });
      toast.success('새 팀이 생성되었습니다');
    }
    setShowTeamModal(false);
  };

  const handleSaveProject = () => {
    if (!projectForm.name.trim()) return toast.error('프로젝트 이름을 입력하세요');
    if (projectForm.stages.length === 0) return toast.error('최소 한 개의 진행 단계가 필요합니다');
    
    // Sync score categories with stages as requested
    const syncedCategories = projectForm.stages.map(s => ({
      id: s.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, ''),
      label: s
    }));

    if (editingProject) {
      updateProject(editingProject, { 
        name: projectForm.name, 
        description: projectForm.description,
        start_date: projectForm.start_date || undefined,
        end_date: projectForm.end_date || undefined,
        stages: projectForm.stages,
        score_categories: syncedCategories
      });
      toast.success('프로젝트가 수정되었습니다 (평가 항목 동기화됨)');
    } else {
      addProject({ 
        name: projectForm.name, 
        description: projectForm.description, 
        cohort_id: projectForm.cohort_id,
        start_date: projectForm.start_date || undefined,
        end_date: projectForm.end_date || undefined,
        stages: projectForm.stages,
        score_categories: syncedCategories
      });
      toast.success('새 프로젝트가 추가되었습니다 (평가 항목 동기화됨)');
    }
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleDeleteStage = (s: string) => {
    setProjectForm(prev => ({ ...prev, stages: prev.stages.filter(stage => stage !== s) }));
  };

  const handleAddStageToForm = () => {
    if (newStageLabel.trim() && !projectForm.stages.includes(newStageLabel.trim())) {
      setProjectForm(f => ({ ...f, stages: [...f.stages, newStageLabel.trim()] }));
      setNewStageLabel('');
    }
  };

  const handleStageDragStart = (index: number) => {
    setDraggedStageIndex(index);
  };

  const handleStageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStageIndex === null || draggedStageIndex === index) return;
    
    const newStages = [...projectForm.stages];
    const draggedItem = newStages[draggedStageIndex];
    newStages.splice(draggedStageIndex, 1);
    newStages.splice(index, 0, draggedItem);
    
    setDraggedStageIndex(index);
    setProjectForm(f => ({ ...f, stages: newStages }));
  };

  const handleStageDragEnd = () => {
    setDraggedStageIndex(null);
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, width: '100%' }}>
        <div>
          <h1 className="page-title">프로젝트 관리</h1>
          <p className="page-subtitle">수강생별 프로젝트 매칭 현황 및 팀 협업 성과 모니터링 ({selectedCohort})</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => handleOpenProjectModal()} style={{ gap: 8 }}>
            <PlusCircle size={18} /> 프로젝트 추가
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenTeamModal()} style={{ gap: 8 }}>
            <UserPlus size={18} /> 새 팀 구성
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp size={18} color="var(--accent)" />
          <label style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>대상 프로젝트:</label>
          <select 
            className="form-select" 
            style={{ flex: 1, height: 40, fontWeight: 700 }}
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(Number(e.target.value))}
          >
            <option value={0}>프로젝트 전체 보러가기...</option>
            {cohortProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProjectId !== 0 && (
            <>
              <button 
                className="action-btn" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenProjectModal(projects.find(p => p.id === selectedProjectId)); }}
                style={{ width: 36, height: 36, flexShrink: 0 }}
                title="프로젝트 수정"
              >
                <Edit3 size={16} />
              </button>
              <button 
                className="action-btn danger" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(confirm('프로젝트를 삭제하시겠습니까? 관련 팀 데이터도 함께 삭제됩니다.')) { deleteProject(selectedProjectId); setSelectedProjectId(0); }}}
                style={{ width: 36, height: 36, flexShrink: 0 }}
                title="프로젝트 삭제"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            className="form-input" 
            placeholder="수강생 이름으로 검색..." 
            style={{ border: 'none', background: 'transparent', height: 40, width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 24 }}>
        {displayedTeams.map((team) => {
          const members = teamMembers.filter(m => m.team_id === team.id);
          const currentMembers = members
            .map(m => students.find(s => s.id === m.student_id))
            .filter(Boolean) as Student[];

          const projectObj = projects.find(p => p.id === team.project_id);
          const avgScores: Record<string, number> = {};
          let teamOverall = 0;
          
          if (currentMembers.length > 0 && projectObj) {
            projectObj.score_categories.forEach(cat => {
              let sum = 0;
              currentMembers.forEach(s => {
                const ps = s.project_scores.find(score => score.project_id === team.project_id);
                sum += ps?.category_scores[cat.id] || 0;
              });
              avgScores[cat.id] = sum / currentMembers.length;
            });
            
            let overallSum = 0;
            currentMembers.forEach(s => {
               const ps = s.project_scores.find(score => score.project_id === team.project_id);
               overallSum += ps?.average_score || 0;
            });
            teamOverall = overallSum / currentMembers.length;
          }

          return (
            <div 
              key={team.id} 
              className="card team-card" 
              onClick={() => setSelectedTeamId(team.id)}
              style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>{team.team_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <select 
                      className={`badge ${projectObj ? getStageColorClass(team.stage, projectObj.stages) : ''}`} 
                      value={team.stage} 
                      onClick={e => e.stopPropagation()}
                      onChange={e => { 
                        e.stopPropagation(); 
                        const newStage = e.target.value;
                        const projectObj = projects.find(p => p.id === team.project_id);
                        let progress_pct = team.progress_pct;

                        if (projectObj && projectObj.stages.length > 0) {
                          const stageIndex = projectObj.stages.indexOf(newStage);
                          if (stageIndex !== -1) {
                            progress_pct = Math.round(((stageIndex + 1) / projectObj.stages.length) * 100);
                          }
                        }

                        updateTeam(team.id, { 
                          stage: newStage,
                          progress_pct
                        }); 
                      }}
                      style={{ border: 'none', cursor: 'pointer', padding: '0 4px', height: 20, fontSize: 10, borderRadius: 4 }}
                    >
                      {projectObj?.stages.map(s => <option key={s} value={s}>{s}</option>) || globalStages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>종합 평가</div>
                    <div style={{ fontWeight: 900, color: 'var(--accent)', fontSize: 20 }}>{teamOverall.toFixed(1)}</div>
                  </div>
                  <div className="card-actions" style={{ display: 'flex', gap: 4 }}>
                    <button className="action-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenTeamModal(team); }}><Edit3 size={14} /></button>
                    <button className="action-btn danger" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(confirm('팀을 삭제하시겠습니까?')) { deleteTeam(team.id); toast.success('팀이 삭제되었습니다'); } }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={13} /> 팀원 구성
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {currentMembers.map((s) => (
                        <div key={s.id} className="p-tag-item" title={s.name} onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); }} style={{ cursor: 'pointer' }}>
                          {s.name}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12 }}>세부 성과 (평균)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {projectObj?.score_categories.map(cat => (
                        <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                          <span style={{ fontWeight: 700 }}>{(avgScores[cat.id] || 0).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                    <span>프로젝트 진행률</span>
                    <span style={{ color: 'var(--accent)' }}>{team.progress_pct}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${team.progress_pct}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, height: 40 }}>상세 관리</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Modal (Add/Edit) */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal-content card" style={{ maxWidth: 500, padding: 30 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 24 }}>{editingProject ? '프로젝트 수정' : '새 프로젝트 생성'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="modal-label">프로젝트 이름</label>
                <input className="form-input" value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))} placeholder="예: 파이널 포트폴리오" />
              </div>
              <div>
                <label className="modal-label">설명</label>
                <textarea className="form-input" value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="프로젝트에 대한 간단한 설명..." />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="modal-label">시작 날짜</label>
                  <input type="date" className="form-input" value={projectForm.start_date} onChange={e => setProjectForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="modal-label">종료 날짜</label>
                  <input type="date" className="form-input" value={projectForm.end_date} onChange={e => setProjectForm(p => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                   <Settings2 size={16} /> 프로젝트 기본 설정
                </div>

                {/* Categories Display if editing... but since we want customization during creation, user can add categories too? 
                    For now let's focus on STAGES as requested. */}
                
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>진행 단계 관리 (Stages)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {projectForm.stages.map((s, index) => (
                      <span 
                        key={s} 
                        draggable
                        onDragStart={() => handleStageDragStart(index)}
                        onDragOver={(e) => handleStageDragOver(e, index)}
                        onDragEnd={handleStageDragEnd}
                        className={`badge ${getStageColorClass(s, projectForm.stages)}`} 
                        style={{ 
                          gap: 6, 
                          display: 'flex', 
                          alignItems: 'center', 
                          cursor: 'grab',
                          opacity: draggedStageIndex === index ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        <GripVertical size={10} style={{ opacity: 0.5 }} />
                        {s}
                        <X size={10} style={{ cursor: 'pointer' }} onClick={() => handleDeleteStage(s)} />
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      className="form-input" 
                      placeholder="새 단계 추가..." 
                      value={newStageLabel} 
                      onChange={e => setNewStageLabel(e.target.value)} 
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={() => setIsComposing(false)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (isComposing) return;
                          e.preventDefault();
                          handleAddStageToForm();
                        }
                      }} 
                      style={{ height: 32, fontSize: 12 }} 
                    />
                    <button className="btn btn-secondary" style={{ padding: '0 8px', height: 32 }} onClick={handleAddStageToForm}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>* 생성 시 설정한 단계가 팀 관리의 상태 배지로 사용됩니다.</p>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowProjectModal(false)}>취소</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveProject}>{editingProject ? '수정 완료' : '프로젝트 생성'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTeamModal && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="modal-content card" style={{ maxWidth: 650, width: '90%', padding: 40 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 30 }}>{editingTeam ? '팀 정보 수정' : '새로운 팀 구성'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="modal-label">팀 이름</label>
                  <input className="form-input" value={teamForm.team_name} onChange={e => setTeamForm(f => ({ ...f, team_name: e.target.value }))} placeholder="예: 시너지 브레인" style={{ height: 45 }} />
                </div>
                <div>
                  <label className="modal-label">대상 프로젝트</label>
                  <select className="form-select" value={teamForm.project_id} onChange={e => setTeamForm(f => ({ ...f, project_id: Number(e.target.value) }))} style={{ height: 45 }}>
                    <option value={0}>선택...</option>
                    {cohortProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: 20, borderRadius: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12 }}>안내 사항</div>
                <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <li>팀 생성 후 상세 관리에서 팀원을 추가할 수 있습니다.</li>
                  <li>프로젝트 진행 단계는 생성 초기 첫 단계로 설정됩니다.</li>
                  <li>팀별 종합 평가는 팀원 개별 성적의 평균으로 자동 집계됩니다.</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: 24 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 48 }} onClick={() => setShowTeamModal(false)}>취소</button>
              <button className="btn btn-primary" style={{ flex: 1, height: 48, gap: 10 }} onClick={handleSaveTeam}>
                <Check size={20} /> {editingTeam ? '수정 완료' : '팀 생성 완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTeamId && teams.find(t => t.id === selectedTeamId) && (
        <TeamDetail
          team={teams.find(t => t.id === selectedTeamId)!}
          onClose={() => setSelectedTeamId(null)}
          onProgressUpdate={updateTeamProgress}
          onMemberClick={(sid) => setSelectedStudent(students.find(s => s.id === sid) || null)}
        />
      )}

      {selectedStudent && (
        <StudentDetailPanel 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          tags={tags.filter(t => t.student_id === selectedStudent.id)} 
          consultations={consultations.filter(c => c.student_id === selectedStudent.id)} 
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .team-card { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .team-card:hover { transform: translateY(-6px); border-color: var(--accent) !important; box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important; }
        .modal-label { display: block; font-size: 13px; font-weight: 800; color: var(--text-muted); margin-bottom: 8px; }
      `}} />
    </div>
  );
}

export default function ProjectManagementPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectManagementContent />
    </Suspense>
  );
}
