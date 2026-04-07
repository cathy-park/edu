'use client';

export type StudentStatus = '수강중' | '수료' | '중도포기' | '탈퇴';
export type ProjectStage = string;
export type ConsultationType = '개인상담' | '진로상담' | '학습점검' | '기타' | '전체';
export type LogType = '회의록' | '멘토피드백' | '진행보고';
export type ScheduleCategory = '수업' | '평가' | '팀활동' | '행사' | '기타';
export type TodoCategory = '개인업무' | '수강생관리' | '기타';
export type TodoPriority = '높음' | '보통' | '낮음';

export interface Cohort {
  id: number;
  name: string;
  start_date: string;
  end_date?: string;
  student_count: number;
}

export interface ProjectScore {
  id: number;
  student_id: number;
  project_id: number;
  project_name?: string;
  category_scores: Record<string, number>; // e.g., { "planning": 4.5, "dev": 3.5 }
  team_score: number; // Overall project grade (Star rating)
  average_score: number;
  feedback?: string;
  created_at: string;
}

export interface Student {
  id: number;
  cohort_id: number;
  cohort?: Cohort;
  name: string;
  age: number;
  phone: string;
  email: string;
  status: StudentStatus;
  joined_at: string;
  project_scores: ProjectScore[]; // Multiple scores per project
  attendance_rate: number;
  gpa: number; // Aggregate average of scores
  created_at: string;
  note?: string;
  planning_score?: number;
  dev_score?: number;
  design_score?: number;
  comm_score?: number;
}

export interface StudentTag {
  id: number;
  student_id: number;
  tag: string;
  created_at: string;
}

export interface Consultation {
  id: number;
  student_id: number;
  consulted_at: string;
  type: ConsultationType;
  content: string;
  follow_up?: string;
  created_at: string;
}

export interface Project {
  id: number;
  cohort_id: number;
  name: string;
  description?: string;
  stage: ProjectStage;
  stages: string[];
  score_categories: { id: string, label: string }[]; // Dynamic categories (Add/Delete possible)
}

export interface Team {
  id: number;
  project_id: number; // Linked to project instead of cohort
  project?: Project;
  team_name: string;
  stage: ProjectStage;
  progress_pct: number;
  leader_id?: number;
  leader?: Student;
  is_individual?: boolean;
  created_at: string;
  updated_at?: string;
  project_link?: string;
  memo?: string;
}

export interface TeamMember {
  id: number;
  team_id: number;
  student_id: number;
  student?: Student;
  role?: string;
  joined_at: string;
}

export interface WorkTask {
  id: number;
  title: string;
  gpts_link?: string;
  prompts: string[];
  created_at: string;
}

export interface ProjectLog {
  id: number;
  team_id: number;
  log_date: string;
  type: LogType;
  title?: string;
  content: string;
  progress_pct?: number;
  author?: string;
  created_at: string;
}

export interface Schedule {
  id: number;
  title: string;
  start_date: string;
  end_date?: string;
  is_dday: boolean;
  category: ScheduleCategory;
  cohort_id?: number;
  color?: string;
  created_at: string;
}

export interface Todo {
  id: number;
  title: string;
  category: TodoCategory;
  related_student_id?: number;
  related_student?: Student;
  due_date?: string;
  is_done: boolean;
  priority: TodoPriority;
  created_at: string;
}
