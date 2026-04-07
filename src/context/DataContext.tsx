'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isSameDay } from 'date-fns';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Student, Project, Team, Consultation, ProjectScore, 
  TeamMember, StudentTag, WorkTask, Todo, Schedule 
} from '@/lib/types';
import toast from 'react-hot-toast';

interface DataContextType {
  students: Student[];
  projects: Project[];
  teams: Team[];
  consultations: Consultation[];
  tags: StudentTag[];
  teamMembers: TeamMember[];
  workTasks: WorkTask[];
  todos: Todo[];
  schedules: Schedule[];
  projectLogs: any[];
  stages: string[];
  isLoading: boolean;
  
  // Student CRUD
  addStudent: (s: Omit<Student, 'id' | 'created_at' | 'project_scores'>) => Promise<number | undefined>;
  updateStudent: (id: number, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: number) => Promise<void>;
  
  // Tag CRUD
  updateStudentTags: (studentId: number, tags: string[]) => Promise<void>;
  
  // Team CRUD
  addTeam: (team: Omit<Team, 'id' | 'created_at'>) => Promise<void>;
  updateTeam: (id: number, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: number) => Promise<void>;
  
  // Member CRUD
  addTeamMember: (teamId: number, studentId: number, role?: string) => Promise<void>;
  updateTeamMemberRole: (memberId: number, role: string) => Promise<void>;
  removeTeamMember: (memberId: number) => Promise<void>;

  // Project Score
  updateProjectScore: (studentId: number, projectId: number, categoryScores: Record<string, number>, teamScore: number) => Promise<void>;
  
  // Consultation CRUD
  addConsultation: (consultation: Omit<Consultation, 'id' | 'created_at'>) => Promise<void>;
  updateConsultation: (id: number, data: Partial<Consultation>) => Promise<void>;
  deleteConsultation: (id: number) => Promise<void>;

  updateTeamProjectScore: (teamId: number, projectId: number, categoryScores: Record<string, number>, teamScore: number) => Promise<void>;
  updateTeamProgress: (teamId: number, progress: number) => Promise<void>;
  updateTeamScore: (teamId: number, score: number) => Promise<void>;
  addProjectCategory: (projectId: number, label: string) => Promise<void>;
  deleteProjectCategory: (projectId: number, categoryId: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  updateProject: (id: number, data: Partial<Project>) => Promise<void>;
  addProject: (p: Omit<Project, 'id'>) => Promise<number | undefined>;
  
  // Project Log CRUD
  addProjectLog: (log: any) => Promise<void>;
  updateProjectLog: (id: number, data: any) => Promise<void>;
  deleteProjectLog: (id: number) => Promise<void>;
  
  // Stages (Badges) CRUD
  addStage: (stage: string) => void;
  removeStage: (stage: string) => void;

  // WorkTask CRUD
  addWorkTask: (task: Omit<WorkTask, 'id' | 'created_at'>) => Promise<void>;
  updateWorkTask: (id: number, data: Partial<WorkTask>) => Promise<void>;
  deleteWorkTask: (id: number) => Promise<void>;

  // Schedule CRUD
  addSchedule: (schedule: Omit<Schedule, 'id' | 'created_at'>) => Promise<void>;
  updateSchedule: (id: number, data: Partial<Schedule>) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;

  // Todo CRUD
  addTodo: (todo: Omit<Todo, 'id' | 'created_at' | 'is_done'>) => Promise<void>;
  updateTodo: (id: number, data: Partial<Todo>) => Promise<void>;
  toggleTodo: (id: number, isDone: boolean) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  
  getEventsForDay: (date: Date) => (Schedule | { id: number; title: string; start_date: string; category: any; is_dday: boolean })[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [tags, setTags] = useState<StudentTag[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [projectLogs, setProjectLogs] = useState<any[]>([]);
  const [stages, setStages] = useState<string[]>(['기획', '디자인', '개발', '검증', '완료']);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data from Supabase
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Simple connectivity check
      const { error: connError } = await supabase.from('students').select('id').limit(1);
      if (connError) {
        console.error('Supabase connectivity check failed:', connError.message);
        toast.error(`데이터베이스 연결 오류: ${connError.message}`);
      } else {
        console.log('Supabase connected successfully');
      }

      const [
        { data: studentsData, error: sErr },
        { data: projectsData, error: pErr },
        { data: teamsData, error: tErr },
        { data: consultsData, error: cErr },
        { data: tagsData, error: tgErr },
        { data: membersData, error: mErr },
        { data: workTasksData, error: wErr },
        { data: todosData, error: tdErr },
        { data: schedulesData, error: scErr },
        { data: projectLogsData, error: plErr }
      ] = await Promise.all([
        supabase.from('students').select('*, cohorts(*), grades(*)').order('id', { ascending: false }),
        supabase.from('projects').select('*').order('id', { ascending: false }),
        supabase.from('teams').select('*, projects(*)').order('id', { ascending: false }),
        supabase.from('consultations').select('*').order('id', { ascending: false }),
        supabase.from('student_tags').select('*'),
        supabase.from('team_members').select('*, students(*)'),
        supabase.from('work_tasks').select('*').order('id', { ascending: false }),
        supabase.from('todos').select('*').order('id', { ascending: false }),
        supabase.from('schedules').select('*').order('id', { ascending: false }),
        supabase.from('project_logs').select('*').order('id', { ascending: false })
      ]);

      // Log any fetch errors
      [sErr, pErr, tErr, cErr, tgErr, mErr, wErr, tdErr, scErr, plErr].forEach(err => {
        if (err) console.error('Fetch error detail:', err.message);
      });

      if (studentsData) {
        const mappedStudents = studentsData.map((s: any) => {
          const scores = s.grades || [];
          const totalAvg = scores.length > 0 
            ? scores.reduce((acc: number, cur: any) => {
                const sVal = Number(cur.team_score || cur.average_score || 0);
                return acc + sVal;
              }, 0) / scores.length 
            : 0;

          return {
            ...s,
            cohort: s.cohorts, // Map plural DB name to singular App property
            project_scores: scores,
            gpa: totalAvg
          };
        });
        setStudents(mappedStudents);
      }
      if (projectsData) setProjects(projectsData);
      if (teamsData) setTeams(teamsData);
      if (consultsData) setConsultations(consultsData);
      if (tagsData) setTags(tagsData);
      if (membersData) setTeamMembers(membersData);
      if (workTasksData) setWorkTasks(workTasksData);
      if (todosData) setTodos(todosData);
      if (schedulesData) setSchedules(schedulesData);
      if (projectLogsData) setProjectLogs(projectLogsData);

    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('데이터를 불러오지 못했습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase 연동 설정이 되어 있지 않습니다. Vercel 환경 변수를 확인해주세요.', { duration: 10000 });
    }
    fetchData();
  }, [fetchData]);

  // Persistence of stages in localStorage (it's a UI preference/config)
  useEffect(() => {
    const saved = localStorage.getItem('appStages');
    if (saved) setStages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('appStages', JSON.stringify(stages));
  }, [stages]);

  // --- CRUD FUNCTIONS (Updated with better error handling) ---

  const addStudent = async (s: Omit<Student, 'id' | 'created_at' | 'project_scores'>) => {
    const cohortId = (s.cohort_id === undefined || isNaN(Number(s.cohort_id))) ? null : Number(s.cohort_id);

    const insertData = {
      name: s.name,
      age: s.age,
      phone: s.phone,
      email: s.email,
      cohort_id: cohortId,
      status: s.status,
      profile_image_url: s.profile_image_url,
      joined_at: s.joined_at,
      gpa: s.gpa || 0,
      attendance_rate: s.attendance_rate || 0,
      experience: s.experience,
      experience_detail: s.experience_detail,
      note: s.note
    };

    const { data, error } = await supabase
      .from('students')
      .insert([insertData])
      .select('*, cohorts(*), grades(*)')
      .single();

    if (error) {
      console.error('Insert student error:', error.message, error.details);
      toast.error(`학생 추가 실패: ${error.message} (${error.hint || '권한/데이터 확인'})`);
      return undefined;
    } else if (!data) {
      toast.error('학생이 추가되었으나 데이터를 받지 못했습니다. (RLS 확인 필요)');
      return undefined;
    } else {
      const newStudent = { 
        ...data, 
        cohort: data.cohorts,
        project_scores: data.grades || [] 
      };
      setStudents(prev => [newStudent, ...prev]);
      toast.success('수강생이 추가되었습니다');
      return data.id;
    }
  };

  const updateStudent = async (id: number, data: Partial<Student>) => {
    // Clean data for Supabase update
    const updateData: any = {};
    const allowedKeys = ['name', 'age', 'phone', 'email', 'cohort_id', 'status', 'profile_image_url', 'joined_at', 'gpa', 'attendance_rate', 'experience', 'experience_detail', 'note'];
    
    Object.keys(data).forEach(key => {
      if (allowedKeys.includes(key)) {
        updateData[key] = (data as any)[key];
      }
    });

    const { error } = await supabase.from('students').update(updateData).eq('id', id);

    if (error) {
      console.error('Update student error:', error);
      toast.error('정보 수정에 실패했습니다');
    } else {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    }
  };

  const deleteStudent = async (id: number) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      toast.error('삭제에 실패했습니다');
    } else {
      setStudents(prev => prev.filter(s => s.id !== id));
      toast.success('삭제되었습니다');
    }
  };

  const updateStudentTags = async (studentId: number, tagStrings: string[]) => {
    const { error: delError } = await supabase.from('student_tags').delete().eq('student_id', studentId);
    if (delError) { toast.error('태그 수정에 실패했습니다'); return; }

    if (tagStrings.length > 0) {
      const newTags = tagStrings.map(t => ({ student_id: studentId, tag: t }));
      const { data, error: insError } = await supabase.from('student_tags').insert(newTags).select();
      if (insError) {
        toast.error('태그 저장에 실패했습니다');
      } else {
        setTags(prev => [...prev.filter(t => t.student_id !== studentId), ...(data || [])]);
      }
    } else {
      setTags(prev => prev.filter(t => t.student_id !== studentId));
    }
  };

  const addTeam = async (t: Omit<Team, 'id' | 'created_at'>) => {
    const insertData = {
      project_id: t.project_id,
      team_name: t.team_name,
      stage: t.stage,
      progress_pct: t.progress_pct,
      leader_id: t.leader_id,
      memo: t.memo,
      project_link: t.project_link,
      is_individual: t.is_individual ?? false
    };
    
    const { data, error } = await supabase.from('teams').insert([insertData]).select().single();
    if (error) {
      console.error('Insert team error:', error.message, error.details);
      toast.error(`팀 생성 실패: ${error.message} (${error.hint || '데이터 확인'})`);
    } else if (!data) {
      toast.error('팀이 생성되었으나 데이터를 받지 못했습니다. (RLS 확인 필요)');
    } else {
      // Re-fetch or manually construct team with project info if needed
      // For now, just add to state
      setTeams(prev => [data, ...prev]);
      toast.success('팀이 생성되었습니다');
    }
  };

  const updateTeam = async (id: number, data: Partial<Team>) => {
    let updateData = { ...data };
    
    // Auto-calculate progress if stage is changed
    if (data.stage) {
      const currentTeam = teams.find(t => t.id === id);
      const projectId = data.project_id || currentTeam?.project_id;
      const project = projects.find(p => p.id === projectId);
      
      if (project && project.stages && project.stages.length > 0) {
        const stageIndex = project.stages.indexOf(data.stage);
        if (stageIndex !== -1) {
          updateData.progress_pct = Math.round(((stageIndex + 1) / project.stages.length) * 100);
        }
      }
    }

    const { error } = await supabase.from('teams').update(updateData).eq('id', id);
    if (error) {
      console.error('Update team error:', error);
      toast.error('팀 정보 수정 실패');
    } else {
      setTeams(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    }
  };

  const deleteTeam = async (id: number) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) {
      toast.error('팀 삭제 실패');
    } else {
      setTeams(prev => prev.filter(t => t.id !== id));
      setTeamMembers(prev => prev.filter(tm => tm.team_id !== id));
    }
  };

  const addTeamMember = async (teamId: number, studentId: number, role?: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .insert([{ team_id: teamId, student_id: studentId, role }])
      .select('*, students(*)')
      .single();
    if (error) {
      toast.error('팀원 추가 실패');
    } else if (data) {
      setTeamMembers(prev => [...prev, data]);
    }
  };

  const removeTeamMember = async (id: number) => {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) {
      toast.error('팀원 제거 실패');
    } else {
      setTeamMembers(prev => prev.filter(tm => tm.id !== id));
    }
  };

  const updateTeamMemberRole = async (id: number, role: string) => {
    const { error } = await supabase.from('team_members').update({ role }).eq('id', id);
    if (error) {
      console.error('Update member role error:', error);
      toast.error('역할 수정 실패');
    } else {
      setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
    }
  };

  const updateProjectScore = async (studentId: number, projectId: number, categoryScores: Record<string, number>, teamScore: number) => {
    const catsCount = Object.keys(categoryScores).length;
    const average_score = catsCount > 0 ? Object.values(categoryScores).reduce((a, b) => a + b, 0) / catsCount : 0;

    const upsertData = {
      student_id: studentId,
      project_id: projectId,
      category_scores: categoryScores,
      team_score: teamScore,
      average_score
    };

    const { data, error } = await supabase.from('grades').upsert(upsertData, { onConflict: 'student_id, project_id' }).select().single();
    if (error) {
       toast.error('성적 저장 실패');
    } else if (data) {
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          const existingScoreIndex = s.project_scores.findIndex(ps => ps.project_id === projectId);
          let newScores = [...s.project_scores];
          if (existingScoreIndex >= 0) newScores[existingScoreIndex] = data;
          else newScores.push(data);
          
          const totalAvg = newScores.length > 0 ? newScores.reduce((a, b) => a + b.average_score, 0) / newScores.length : 0;
          return { ...s, project_scores: newScores, gpa: totalAvg };
        }
        return s;
      }));
    }
  };

  const addConsultation = async (c: Omit<Consultation, 'id' | 'created_at'>) => {
    try {
      if (!c.student_id || c.student_id <= 0) {
        throw new Error('올바른 수강생을 선택해주세요.');
      }

      const payload = {
        student_id: Number(c.student_id),
        project_id: c.project_id ? Number(c.project_id) : null,
        consulted_at: c.consulted_at && c.consulted_at.includes('T') 
          ? c.consulted_at.split('.')[0] // Remove milliseconds if any
          : new Date(c.consulted_at || Date.now()).toISOString().split('.')[0],
        type: c.type || '기타',
        content: c.content || '',
        follow_up: c.follow_up || ''
      };

      console.log('Inserting consultation with payload:', payload);

      const { data, error } = await supabase
        .from('consultations')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase Consultation Insert Error:', error.code, error.message, error.details);
        if (error.code === 'PGRST204') {
          toast.error('데이터베이스 스키마 불일치 오류(project_id 컬럼 없음). 제공된 SQL을 실행해 주세요.');
        }
        throw error;
      }
      
      setConsultations(prev => [data, ...prev]);
    } catch (error: any) {
      console.error('Failed to add consultation:', error);
      toast.error(`로그 저장 오류: ${error.message || '알 수 없는 오류'}`);
      throw error; // Rethrow to let caller know
    }
  };

  const updateConsultation = async (id: number, data: Partial<Consultation>) => {
    const { error } = await supabase.from('consultations').update(data).eq('id', id);
    if (error) {
      toast.error('상담 수정 실패');
    } else {
      setConsultations(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    }
  };

  const deleteConsultation = async (id: number) => {
    const { error } = await supabase.from('consultations').delete().eq('id', id);
    if (error) {
      toast.error('상담 삭제 실패');
    } else {
      setConsultations(prev => prev.filter(c => c.id !== id));
    }
  };

  const updateTeamProgress = async (teamId: number, progress: number) => {
    const { error } = await supabase.from('teams').update({ progress_pct: progress }).eq('id', teamId);
    if (!error) setTeams(prev => prev.map(t => t.id === teamId ? { ...t, progress_pct: progress } : t));
  };

  const updateTeamProjectScore = async (teamId: number, projectId: number, categoryScores: Record<string, number>, teamScore: number) => {
    // Bulk update for all members of the team
    const members = teamMembers.filter(m => m.team_id === teamId);
    
    // Average score calculation
    const cats = Object.values(categoryScores);
    const avg = cats.length > 0 ? cats.reduce((a, b) => a + b, 0) / cats.length : 0;
    const finalAvg = Math.round(avg * 2) / 2;

    try {
      const updatePromises = members.map(m => 
        updateProjectScore(m.student_id, projectId, categoryScores, teamScore)
      );
      await Promise.all(updatePromises);
      toast.success('팀 전체 성적이 일괄 업데이트되었습니다.');
    } catch (err) {
      console.error('Team score update error:', err);
      toast.error('팀 성적 업데이트 중 실채했습니다');
    }
  };

  const updateTeamScore = async (teamId: number, score: number) => {
    // Legacy support or simplified variant
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    await updateTeamProjectScore(teamId, team.project_id, {}, score);
  };

  const addProjectLog = async (log: any) => {
    const { data, error } = await supabase.from('project_logs').insert([log]).select().single();
    if (error) {
      console.error('Project log error:', error);
      toast.error('로그 저장에 실패했습니다');
    } else {
      setProjectLogs(prev => [data, ...prev]);
    }
  };

  const updateProjectLog = async (id: number, data: any) => {
    const { error } = await supabase.from('project_logs').update(data).eq('id', id);
    if (error) {
      toast.error('로그 수정 실패');
    } else {
      setProjectLogs(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    }
  };

  const deleteProjectLog = async (id: number) => {
    const { error } = await supabase.from('project_logs').delete().eq('id', id);
    if (error) {
      toast.error('로그 삭제 실패');
    } else {
      setProjectLogs(prev => prev.filter(l => l.id !== id));
      toast.success('로그가 삭제되었습니다');
    }
  };

  const addProjectCategory = async (projectId: number, label: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const newId = label.toLowerCase().replace(/\s+/g, '_');
    if (project.score_categories.some(c => c.id === newId)) {
      toast.error('이미 존재하는 항목명입니다');
      return;
    }
    const newCategories = [...project.score_categories, { id: newId, label }];
    const { error } = await supabase.from('projects').update({ score_categories: newCategories }).eq('id', projectId);
    if (!error) setProjects(prev => prev.map(p => p.id === projectId ? { ...p, score_categories: newCategories } : p));
  };

  const deleteProjectCategory = async (projectId: number, categoryId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    if (project.score_categories.length <= 1) {
      toast.error('최소 1개의 평가 항목은 있어야 합니다');
      return;
    }
    const newCategories = project.score_categories.filter(c => c.id !== categoryId);
    const { error } = await supabase.from('projects').update({ score_categories: newCategories }).eq('id', projectId);
    if (!error) setProjects(prev => prev.map(p => p.id === projectId ? { ...p, score_categories: newCategories } : p));
  };

  const deleteProject = async (id: number) => {
    const project = projects.find(p => p.id === id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setTeams(prev => prev.filter(t => t.project_id !== id));
      
      // Auto-remove calendar event
      if (project) {
        const schedule = schedules.find(s => s.title === `[프로젝트] ${project.name}`);
        if (schedule) await deleteSchedule(schedule.id);
      }
      toast.success('프로젝트가 삭제되었습니다.');
    }
  };

  const addProject = async (p: Omit<Project, 'id' | 'created_at'>): Promise<number | undefined> => {
    const { data: projData, error: projError } = await supabase.from('projects').insert([p]).select().single();
    if (projError) {
      console.error('Add project error:', projError);
      toast.error('프로젝트 추가 실패');
      return undefined;
    }
    
    setProjects(prev => [projData, ...prev]);
    
    if (p.start_date && p.end_date) {
      await addSchedule({
        title: `[프로젝트] ${p.name}`,
        start_date: p.start_date,
        end_date: p.end_date,
        is_dday: false,
        category: '팀활동',
        cohort_id: p.cohort_id,
        color: '#6366f1'
      });
    }
    return projData.id;
  };

  const sanitizePayload = <T extends Record<string, any>>(obj: T): T => {
    const sanitized: any = { ...obj };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === '') sanitized[key] = null;
    });
    return sanitized as T;
  };

  const updateProject = async (id: number, p: Partial<Project>) => {
    const oldProject = projects.find(proj => proj.id === id);
    const sanitized = sanitizePayload(p);
    
    const { id: _, created_at: __, ...updateFields } = sanitized as any;

    // Normalize date strings for PostgreSQL 'date' type (ensure YYYY-MM-DD)
    if (updateFields.start_date) {
      updateFields.start_date = new Date(updateFields.start_date).toISOString().split('T')[0];
    }
    if (updateFields.end_date) {
      updateFields.end_date = new Date(updateFields.end_date).toISOString().split('T')[0];
    }

    console.log('Updating project with fields:', updateFields);

    const { data: updateData, error: updateError } = await supabase
      .from('projects')
      .update(updateFields)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (updateError) {
      console.error('Update project error:', updateError.code, updateError.message, updateError.details);
      if (updateError.code === 'PGRST204') {
        toast.error('데이터베이스 스키마 불일치 오류(start_date/end_date 컬럼 없음). 제공된 SQL을 실행해 주세요.');
      } else {
        toast.error('프로젝트 수정 실패: ' + updateError.message);
      }
      return;
    }
    
    if (updateData) {
      setProjects(prev => prev.map(proj => proj.id === id ? updateData : proj));
    } else {
       console.warn('Update project returned no data, using optimistic update');
       setProjects(prev => prev.map(proj => proj.id === id ? { ...proj, ...updateFields } : proj));
    }

    // Synchronize Calendar
    if (oldProject && (p.start_date !== undefined || p.end_date !== undefined || p.name !== undefined)) {
      // Use more flexible lookup for the project schedule
      const schedule = schedules.find(s => 
        s.title === `[프로젝트] ${oldProject.name}` || 
        s.title.includes(oldProject.name) && s.title.includes('[프로젝트]')
      );
      
      const newTitle = p.name ? `[프로젝트] ${p.name}` : schedule?.title || `[프로젝트] ${oldProject.name}`;
      const newStart = p.start_date !== undefined ? (p.start_date || '') : (oldProject.start_date || '');
      const newEnd = p.end_date !== undefined ? (p.end_date || '') : (oldProject.end_date || '');

      const normalizedStart = newStart.split('T')[0];
      const normalizedEnd = newEnd.split('T')[0];

      if (schedule) {
        await updateSchedule(schedule.id, {
          title: newTitle,
          start_date: normalizedStart,
          end_date: normalizedEnd
        });
      } else if (normalizedStart && normalizedEnd) {
        await addSchedule({
          title: newTitle,
          start_date: normalizedStart,
          end_date: normalizedEnd,
          is_dday: false,
          category: '팀활동',
          cohort_id: oldProject.cohort_id,
          color: '#6366f1'
        });
      }
    }
    toast.success('프로젝트가 수정되었습니다.');
  };

  const addStage = (stage: string) => {
    if (stages.includes(stage)) return;
    setStages(prev => [...prev, stage]);
  };

  const removeStage = (stage: string) => {
    setStages(prev => prev.filter(s => s !== stage));
  };

  const getEventsForDay = (date: Date) => {
    const daySchedules = schedules.filter((s) => isSameDay(new Date(s.start_date), date));
    const dayTodos = todos.filter((t) => t.due_date && isSameDay(new Date(t.due_date), date));
    
    // Wrap todos as pseudo-schedules for UI display
    const todoEvents = dayTodos.map(t => ({
      id: -t.id, // Use negative ID for todos to avoid collisions with schedules
      title: `[할일] ${t.title}`,
      start_date: t.due_date!,
      category: 'todo' as any,
      is_dday: false
    }));
    
    return [...daySchedules, ...todoEvents];
  };

  const addWorkTask = async (task: Omit<WorkTask, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('work_tasks').insert([task]).select().single();
    if (error) {
      console.error('Work task insert error:', error.message, error.details);
      toast.error(`업무 추가 실패: ${error.message}`);
    } else if (!data) {
      console.error('Work task insert returned no data');
      toast.error('업무 저장에 실패했습니다.');
    } else {
      setWorkTasks(prev => [data, ...prev]);
      toast.success('업무가 추가되었습니다.');
    }
  };

  const updateWorkTask = async (id: number, data: Partial<WorkTask>) => {
    const { error } = await supabase.from('work_tasks').update(data).eq('id', id);
    if (error) {
      toast.error('업무 수정 실패');
    } else {
      setWorkTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    }
  };

  const deleteWorkTask = async (id: number) => {
    const { error } = await supabase.from('work_tasks').delete().eq('id', id);
    if (error) {
      toast.error('업무 삭제 실패');
    } else {
      setWorkTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  // Schedule CRUD
  const addSchedule = async (s: Omit<Schedule, 'id' | 'created_at'>) => {
    // Sanitize dates: convert "" to null to avoid DB errors
    const startDate = s.start_date || null;
    const endDate = s.end_date || null;
    
    if (!startDate) {
      toast.error('시작 날짜는 필수입니다.');
      return;
    }

    const { data, error } = await supabase.from('schedules').insert([{
      ...s,
      start_date: startDate,
      end_date: endDate
    }]).select().single();
    
    if (error) {
      console.error('Schedule insert error:', error.message, error.details);
      toast.error(`일정 추가 실패: ${error.message}`);
    } else if (!data) {
      console.error('Schedule insert returned no data');
      toast.error('일정 저장에 실패했습니다.');
    } else {
      setSchedules(prev => [...prev, data]);
      toast.success('일정이 추가되었습니다.');
    }
  };

  const updateSchedule = async (id: number, data: Partial<Schedule>) => {
    const { error } = await supabase.from('schedules').update(data).eq('id', id);
    if (error) {
      toast.error('일정 수정 실패');
    } else {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    }
  };

  const deleteSchedule = async (id: number) => {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) {
      toast.error('일정 삭제 실패');
    } else {
      setSchedules(prev => prev.filter(s => s.id !== id));
    }
  };

  // Todo CRUD
  const addTodo = async (todo: Omit<Todo, 'id' | 'created_at' | 'is_done'>) => {
    const { data, error } = await supabase.from('todos').insert([{ ...todo, is_done: false }]).select().single();
    if (error) {
      console.error('Todo insert error:', error.message, error.details);
      toast.error(`할 일 추가 실패: ${error.message}`);
    } else if (!data) {
      console.error('Todo insert returned no data');
      toast.error('할 일 저장에 실패했습니다.');
    } else {
      setTodos(prev => [data, ...prev]);
      toast.success('할 일이 추가되었습니다.');
    }
  };

  const updateTodo = async (id: number, data: Partial<Todo>) => {
    const { error } = await supabase.from('todos').update(data).eq('id', id);
    if (error) {
      toast.error('할 일 수정 실패');
    } else {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    }
  };

  const toggleTodo = async (id: number, isDone: boolean) => {
    const { error } = await supabase.from('todos').update({ is_done: isDone }).eq('id', id);
    if (error) {
      toast.error('상태 변경 실패');
    } else {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, is_done: isDone } : t));
    }
  };

  const deleteTodo = async (id: number) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      toast.error('할 일 삭제 실패');
    } else {
      setTodos(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <DataContext.Provider value={{ 
      students, projects, teams, consultations, tags, teamMembers, workTasks, todos, schedules, projectLogs, stages, isLoading,
      addStudent, updateStudent, deleteStudent, updateStudentTags,
      addTeam, updateTeam, deleteTeam, addTeamMember, updateTeamMemberRole, removeTeamMember,
      updateProjectScore, updateTeamProjectScore, addConsultation, updateConsultation, deleteConsultation, 
      updateTeamProgress, updateTeamScore,
      addProjectCategory, deleteProjectCategory, deleteProject, updateProject, addProject,
      addProjectLog, updateProjectLog, deleteProjectLog,
      addStage, removeStage,
      addWorkTask, updateWorkTask, deleteWorkTask,
      addSchedule, updateSchedule, deleteSchedule,
      addTodo, updateTodo, toggleTodo, deleteTodo,
      getEventsForDay
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
