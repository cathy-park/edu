import {
  Cohort, Student, StudentTag, Consultation,
  Project, Team, TeamMember, WorkTask, ProjectLog, Schedule, Todo, ProjectScore,
} from './types';
import { addDays, format } from 'date-fns';

const today = new Date();
const d = (n: number) => format(addDays(today, n), 'yyyy-MM-dd');

export const mockCohorts: Cohort[] = [
  { id: 1, name: '24기', start_date: '2024-03-04', end_date: '2024-08-30', student_count: 36 },
  { id: 2, name: '25기', start_date: '2025-03-03', end_date: '2025-08-29', student_count: 42 },
];

export const mockProjects: Project[] = [
  { 
    id: 1, cohort_id: 2, name: '기초 웹 개발 프로젝트', description: 'HTML/CSS/JS 기초 활용 프로젝트',
    stages: ['기획', '디자인', '개발', '검증', '완료'],
    score_categories: [
      { id: 'planning', label: '기획' },
      { id: 'design', label: '디자인' },
      { id: 'dev', label: '개발' },
      { id: 'comm', label: '소통' }
    ]
  },
  { 
    id: 2, cohort_id: 2, name: 'AI 챗봇 서비스 프로젝트', description: 'GPT API 연동 웹 서비스 개발',
    stages: ['기획', '디자인', '개발', '검증', '완료'],
    score_categories: [
      { id: 'planning', label: '기획' },
      { id: 'dev', label: '개발' },
      { id: 'comm', label: '소통' }
    ]
  },
  { 
    id: 3, cohort_id: 1, name: '기업 협업 최종 프로젝트',
    stages: ['기획', '디자인', '개발', '검증', '완료'],
    score_categories: [
      { id: 'dev', label: '개발' },
      { id: 'comm', label: '소통' }
    ]
  },
];

export const mockStudents: Student[] = [
  { 
    id: 1, name: '김민준', age: 24, phone: '010-1234-5678', email: 'minjun@example.com', 
    cohort_id: 2, cohort: mockCohorts[1], status: '수강중', joined_at: '2025-03-03', 
    attendance_rate: 85, created_at: '2025-03-03',
    project_scores: [
      { id: 1, student_id: 1, project_id: 1, category_scores: { planning: 4.5, design: 3.5, dev: 4.0, comm: 4.5 }, team_score: 4.5, average_score: 4.12, created_at: d(-30) },
      { id: 2, student_id: 1, project_id: 2, category_scores: { planning: 4.0, dev: 4.5, comm: 4.0 }, team_score: 4.0, average_score: 4.17, created_at: d(-5) },
    ],
    gpa: 4.15
  },
  { 
    id: 2, name: '이서연', age: 23, phone: '010-9876-5432', email: 'seoyeon@example.com', 
    cohort_id: 2, cohort: mockCohorts[1], status: '수강중', joined_at: '2025-03-03', 
    attendance_rate: 92, created_at: '2025-03-03',
    project_scores: [
      { id: 3, student_id: 2, project_id: 1, category_scores: { planning: 3.5, design: 5.0, dev: 3.0, comm: 4.5 }, team_score: 4.5, average_score: 4.0, created_at: d(-30) },
    ],
    gpa: 4.0
  },
  { id: 3, name: '박지훈', age: 25, phone: '010-5555-7777', email: 'jihoon@example.com', cohort_id: 1, cohort: mockCohorts[0], status: '수료', joined_at: '2024-03-04', attendance_rate: 78, created_at: '2024-03-04', project_scores: [], gpa: 3.8, },
  { id: 4, name: '최예린', age: 22, phone: '010-1111-2222', email: 'yerin@example.com', cohort_id: 2, cohort: mockCohorts[1], status: '수강중', joined_at: '2025-03-03', project_scores: [], gpa: 0, attendance_rate: 88, created_at: '2025-03-03' },
  { id: 5, name: '정천우', age: 26, phone: '010-3333-4444', email: 'chunwoo@example.com', cohort_id: 1, cohort: mockCohorts[0], status: '수료', joined_at: '2024-03-04', project_scores: [], gpa: 0, attendance_rate: 80, created_at: '2024-03-04' },
  { id: 6, name: '강다은', age: 24, phone: '010-8888-9999', email: 'daeun@example.com', cohort_id: 2, cohort: mockCohorts[1], status: '수강중', joined_at: '2025-03-03', project_scores: [], gpa: 0, attendance_rate: 82, created_at: '2025-03-03' },
  { id: 7, name: '유승민', age: 27, phone: '010-6666-3333', email: 'seungmin@example.com', cohort_id: 1, cohort: mockCohorts[0], status: '탈퇴', joined_at: '2024-03-04', project_scores: [], gpa: 0, attendance_rate: 75, created_at: '2024-03-04' },
];

export const mockTeams: Team[] = [
  { id: 1, project_id: 2, team_name: '팀 레드', stage: '개발', progress_pct: 65, leader_id: 1, created_at: '' },
  { id: 2, project_id: 2, team_name: '팀 블루', stage: '기획', progress_pct: 20, leader_id: 2, created_at: '' },
  { id: 3, project_id: 2, team_name: '팀 그린', stage: '디자인', progress_pct: 40, leader_id: 6, created_at: '' },
  { id: 4, project_id: 1, team_name: '김민준 개인제작', stage: '완료', progress_pct: 100, leader_id: 1, is_individual: true, created_at: '' },
];

export const mockWorkTasks: WorkTask[] = [
  { id: 1, title: '강의 커리큘럼 기반 프롬프트 생성기', gpts_link: 'https://chatgpt.com/g/g-xxxxx', prompts: ['당신은 시니어 개발자입니다. 아래 커리큘럼을 바탕으로 주차별 과제를 만들어주세요.', '수강생들의 수준에 맞춰 초급/중급/고급으로 난이도를 나누어 설명해주세요.'], created_at: d(-2) },
  { id: 2, title: '수강생 코드 리뷰 Bot', gpts_link: 'https://chatgpt.com/g/g-yyyyy', prompts: ['코드의 스타일과 로직 오류를 발견하고 한국어로 설명해주세요.'], created_at: d(-5) },
];

export const mockTags: StudentTag[] = [
  { id: 1, student_id: 1, tag: '#기획강점', created_at: '' },
  { id: 2, student_id: 1, tag: '#개발관심', created_at: '' },
  { id: 3, student_id: 2, tag: '#디자인', created_at: '' },
  { id: 4, student_id: 3, tag: '#기획강점', created_at: '' },
];

export const mockConsultations: Consultation[] = [
  { id: 1, student_id: 1, consulted_at: d(-5), type: '진로상담', content: '졸업 후 스타트업 PM 포지션을 목표로 하고 있어 포트폴리오 방향을 논의했습니다.', follow_up: '다음 주까지 포트폴리오 초안 작성', created_at: d(-5) },
  { id: 2, student_id: 1, consulted_at: d(-20), type: '학습점검', content: '최근 과제 제출이 늦어지고 있어 학습 스케줄을 점검했습니다.', created_at: d(-20) },
  { id: 3, student_id: 2, consulted_at: d(-3), type: '개인상담', content: '팀 프로젝트에서 갈등이 있어 중재 및 커뮤니케이션 방법을 안내했습니다.', created_at: d(-3) },
];

export const mockTeamMembers: TeamMember[] = [
  { id: 1, team_id: 1, student_id: 1, role: '팀장/기획', joined_at: '' },
  { id: 2, team_id: 1, student_id: 4, role: '프론트엔드', joined_at: '' },
  { id: 3, team_id: 1, student_id: 8, role: '백엔드', joined_at: '' },
  { id: 4, team_id: 1, student_id: 9, role: '디자인', joined_at: '' },
  { id: 5, team_id: 2, student_id: 2, role: '팀장/디자인', joined_at: '' },
  { id: 6, team_id: 2, student_id: 6, role: '기획', joined_at: '' },
];

export const mockProjectLogs: ProjectLog[] = [
  { id: 1, team_id: 1, log_date: d(-1), type: '회의록', title: '기능 정의 완료', content: '핵심 기능 3가지를 최종 확정하고 개발 일정을 수립했습니다.', progress_pct: 65, author: '김강사', created_at: d(-1) },
];

export const mockSchedules: Schedule[] = [
  { id: 1, title: '중간발표', start_date: d(3), is_dday: true, category: '평가', created_at: '' },
  { id: 2, title: '과제 마감', start_date: d(7), is_dday: true, category: '평가', created_at: '' },
  { id: 4, title: '수업 — 리액트 심화', start_date: d(0), is_dday: false, category: '수업', created_at: '' },
];

export const mockTodos: Todo[] = [
  { id: 1, title: '25기 성적 입력', category: '개인업무', is_done: false, priority: '높음', created_at: '' },
];

// Helpers
export function getTagsForStudent(studentId: number): StudentTag[] {
  return mockTags.filter((t) => t.student_id === studentId);
}

export function getConsultationsForStudent(studentId: number): Consultation[] {
  return mockConsultations.filter((c) => c.student_id === studentId);
}

export function getMembersForTeam(teamId: number): (TeamMember & { student: Student })[] {
  return mockTeamMembers
    .filter((m) => m.team_id === teamId)
    .map((m) => ({
      ...m,
      student: mockStudents.find((s) => s.id === m.student_id)!,
    }))
    .filter((m) => m.student);
}

export function getLogsForTeam(teamId: number): ProjectLog[] {
  return mockProjectLogs
    .filter((l) => l.team_id === teamId)
    .sort((a, b) => b.log_date.localeCompare(a.log_date));
}

export function getProjectsForCohort(cohortId: number): Project[] {
  return mockProjects.filter((p) => p.cohort_id === cohortId);
}
