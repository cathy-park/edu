'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, Project, Team, Consultation, ProjectScore, TeamMember, StudentTag } from '@/lib/types';
import { mockStudents, mockProjects, mockTeams, mockConsultations, mockTags, mockTeamMembers } from '@/lib/mockData';
import toast from 'react-hot-toast';

interface DataContextType {
  students: Student[];
  projects: Project[];
  teams: Team[];
  consultations: Consultation[];
  tags: StudentTag[];
  teamMembers: TeamMember[];
  stages: string[];
  
  // Student CRUD
  addStudent: (s: Omit<Student, 'id' | 'created_at'>) => number;
  updateStudent: (id: number, data: Partial<Student>) => void;
  deleteStudent: (id: number) => void;
  
  // Tag CRUD
  updateStudentTags: (studentId: number, tags: string[]) => void;
  
  // Team CRUD
  addTeam: (team: Omit<Team, 'id' | 'created_at'>) => void;
  updateTeam: (id: number, data: Partial<Team>) => void;
  deleteTeam: (id: number) => void;
  
  // Member CRUD
  addTeamMember: (teamId: number, studentId: number, role?: string) => void;
  removeTeamMember: (memberId: number) => void;

  // Project Score & Category
  updateProjectScore: (studentId: number, projectId: number, categoryScores: Record<string, number>, teamScore: number) => void;
  
  // Consultation CRUD
  addConsultation: (consultation: Omit<Consultation, 'id' | 'created_at'>) => void;
  updateConsultation: (id: number, data: Partial<Consultation>) => void;
  deleteConsultation: (id: number) => void;

  updateTeamProgress: (teamId: number, progress: number) => void;
  updateTeamScore: (teamId: number, score: number) => void;
  addProjectCategory: (projectId: number, label: string) => void;
  deleteProjectCategory: (projectId: number, categoryId: string) => void;
  deleteProject: (id: number) => void;
  updateProject: (id: number, data: Partial<Pick<Project, 'name' | 'description' | 'stages'>>) => void;
  addProject: (p: Omit<Project, 'id' | 'score_categories'>) => number;
  
  // Stages (Badges) CRUD
  addStage: (stage: string) => void;
  removeStage: (stage: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [consultations, setConsultations] = useState<Consultation[]>(mockConsultations);
  const [tags, setTags] = useState<StudentTag[]>(mockTags);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [stages, setStages] = useState<string[]>(['기획', '디자인', '개발', '검증', '완료']);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('appData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.projects) setProjects(parsed.projects);
        if (parsed.teams) setTeams(parsed.teams);
        if (parsed.consultations) setConsultations(parsed.consultations);
        if (parsed.tags) setTags(parsed.tags);
        if (parsed.teamMembers) setTeamMembers(parsed.teamMembers);
        if (parsed.stages) setStages(parsed.stages);
      } catch (e) {
        console.error('Failed to load saved data', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('appData', JSON.stringify({ students, projects, teams, consultations, tags, teamMembers, stages }));
  }, [students, projects, teams, consultations, tags, teamMembers, stages]);

  // Student CRUD
  const addStudent = (s: Omit<Student, 'id' | 'created_at'>) => {
    const newId = Date.now();
    const newStudent: Student = { ...s, id: newId, created_at: new Date().toISOString() };
    setStudents(prev => [newStudent, ...prev]);
    return newId;
  };
  const updateStudent = (id: number, data: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };
  const deleteStudent = (id: number) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  // Tag CRUD
  const updateStudentTags = (studentId: number, tagStrings: string[]) => {
    const newTags: StudentTag[] = tagStrings.map((t, idx) => ({
      id: Date.now() + idx,
      student_id: studentId,
      tag: t,
      created_at: new Date().toISOString()
    }));
    setTags(prev => [
      ...prev.filter(t => t.student_id !== studentId),
      ...newTags
    ]);
  };

  // Team CRUD
  const addTeam = (t: Omit<Team, 'id' | 'created_at'>) => {
    const newTeam: Team = { ...t, id: Date.now(), created_at: new Date().toISOString() };
    setTeams(prev => [newTeam, ...prev]);
  };
  const updateTeam = (id: number, data: Partial<Team>) => {
    setTeams(prev => prev.map(t => {
      if (t.id === id) {
        const newData = { ...t, ...data };
        
        // Auto-calculate progress if stage changed
        if (data.stage) {
          const project = projects.find(p => p.id === t.project_id);
          if (project && project.stages && project.stages.length > 0) {
            const stageIndex = project.stages.indexOf(data.stage);
            if (stageIndex >= 0) {
              newData.progress_pct = Math.round(((stageIndex + 1) / project.stages.length) * 100);
            }
          }
        }
        
        return newData;
      }
      return t;
    }));
  };
  const deleteTeam = (id: number) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    setTeamMembers(prev => prev.filter(tm => tm.team_id !== id));
  };

  // Member CRUD
  const addTeamMember = (teamId: number, studentId: number, role?: string) => {
    const newMember: TeamMember = {
      id: Date.now(),
      team_id: teamId,
      student_id: studentId,
      role,
      joined_at: new Date().toISOString().split('T')[0]
    };
    setTeamMembers(prev => [...prev, newMember]);
  };
  const removeTeamMember = (id: number) => {
    setTeamMembers(prev => prev.filter(tm => tm.id !== id));
  };

  const updateProjectScore = (studentId: number, projectId: number, categoryScores: Record<string, number>, teamScore: number) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const existingScoreIndex = s.project_scores.findIndex(ps => ps.project_id === projectId);
        let newScores = [...s.project_scores];
        
        const catsCount = Object.keys(categoryScores).length;
        const catAvg = catsCount > 0 ? Object.values(categoryScores).reduce((a, b) => a + b, 0) / catsCount : 0;
        const average_score = catAvg;

        const newScore: ProjectScore = {
          id: existingScoreIndex >= 0 ? s.project_scores[existingScoreIndex].id : Date.now(),
          student_id: studentId,
          project_id: projectId,
          category_scores: categoryScores,
          team_score: teamScore,
          average_score,
          created_at: new Date().toISOString()
        };

        if (existingScoreIndex >= 0) {
          newScores[existingScoreIndex] = newScore;
        } else {
          newScores.push(newScore);
        }

        const totalAvg = newScores.reduce((a, b) => a + b.average_score, 0) / newScores.length;
        return { ...s, project_scores: newScores, gpa: totalAvg };
      }
      return s;
    }));
  };

  // Consultation CRUD
  const addConsultation = (c: Omit<Consultation, 'id' | 'created_at'>) => {
    const newC: Consultation = { ...c, id: Date.now(), created_at: new Date().toISOString() };
    setConsultations(prev => [newC, ...prev]);
  };
  const updateConsultation = (id: number, data: Partial<Consultation>) => {
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };
  const deleteConsultation = (id: number) => {
    setConsultations(prev => prev.filter(c => c.id !== id));
  };

  const updateTeamProgress = (teamId: number, progress: number) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, progress_pct: progress } : t));
  };

  const updateTeamScore = (teamId: number, score: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const members = teamMembers.filter(m => m.team_id === teamId);
    members.forEach(m => {
      const student = students.find(s => s.id === m.student_id);
      const scoreObj = student?.project_scores.find(ps => ps.project_id === team.project_id);
      updateProjectScore(m.student_id, team.project_id, scoreObj?.category_scores || {}, score);
    });
  };

  const addProjectCategory = (projectId: number, label: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newId = label.toLowerCase().replace(/\s+/g, '_');
        if (p.score_categories.some(c => c.id === newId)) {
          toast.error('이미 존재하는 항목명입니다');
          return p;
        }
        return { ...p, score_categories: [...p.score_categories, { id: newId, label }] };
      }
      return p;
    }));
  };

  const deleteProjectCategory = (projectId: number, categoryId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        if (p.score_categories.length <= 1) {
          toast.error('최소 1개의 평가 항목은 있어야 합니다');
          return p;
        }
        return { ...p, score_categories: p.score_categories.filter(c => c.id !== categoryId) };
      }
      return p;
    }));
  };

  const deleteProject = (id: number) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setTeams(prev => prev.filter(t => t.project_id !== id));
  };

  const updateProject = (id: number, data: Partial<Pick<Project, 'name' | 'description' | 'stages'>>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const addProject = (p: Omit<Project, 'id' | 'score_categories'>) => {
    const newId = Date.now();
    const newProject: Project = {
      ...p,
      id: newId,
      stages: p.stages || ['기획', '디자인', '개발', '검증', '완료'],
      score_categories: [
        { id: 'planning', label: '기획' },
        { id: 'development', label: '개발' },
        { id: 'design', label: '디자인' },
        { id: 'communication', label: '소통' }
      ]
    };
    setProjects(prev => [...prev, newProject]);
    return newId;
  };

  const addStage = (stage: string) => {
    if (stages.includes(stage)) return;
    setStages(prev => [...prev, stage]);
  };

  const removeStage = (stage: string) => {
    setStages(prev => prev.filter(s => s !== stage));
  };

  return (
    <DataContext.Provider value={{ 
      students, projects, teams, consultations, tags, teamMembers, stages,
      addStudent, updateStudent, deleteStudent, updateStudentTags,
      addTeam, updateTeam, deleteTeam, addTeamMember, removeTeamMember,
      updateProjectScore, addConsultation, updateConsultation, deleteConsultation, 
      updateTeamProgress, updateTeamScore,
      addProjectCategory, deleteProjectCategory, deleteProject, updateProject, addProject,
      addStage, removeStage
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
