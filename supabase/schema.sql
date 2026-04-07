-- =============================================
-- 학생 관리 시스템 Supabase Schema (v2.0)
-- 이 파일 전체를 Supabase SQL Editor에 붙여넣고 실행하세요.
-- 기존 데이터가 있다면 삭제(Drop) 후 재생성됩니다.
-- =============================================

-- Drop existing tables to start fresh
drop table if exists public.project_logs cascade;
drop table if exists public.team_members cascade;
drop table if exists public.teams cascade;
drop table if exists public.projects cascade;
drop table if exists public.attendances cascade;
drop table if exists public.assignments cascade;
drop table if exists public.grades cascade;
drop table if exists public.consultations cascade;
drop table if exists public.student_tags cascade;
drop table if exists public.todos cascade;
drop table if exists public.schedules cascade;
drop table if exists public.students cascade;
drop table if exists public.cohorts cascade;

drop type if exists student_status cascade;
drop type if exists consultation_type cascade;
drop type if exists assignment_status cascade;
drop type if exists attendance_status cascade;
drop type if exists project_stage cascade;
drop type if exists log_type cascade;
drop type if exists schedule_category cascade;
drop type if exists todo_category cascade;
drop type if exists todo_priority cascade;

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. cohorts (기수)
create table public.cohorts (
  id serial primary key,
  name varchar(50) not null unique,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz default now()
);

-- 2. projects (프로젝트)
create table public.projects (
  id serial primary key,
  cohort_id int references public.cohorts(id) on delete cascade,
  name varchar(100) not null,
  description text,
  stages text[] default '{"기획", "디자인", "개발", "검증", "완료"}',
  score_categories jsonb default '[{"id": "planning", "label": "기획"}, {"id": "development", "label": "개발"}, {"id": "design", "label": "디자인"}, {"id": "communication", "label": "소통"}]',
  created_at timestamptz default now()
);

-- 3. students (수강생)
create type student_status as enum ('수강중', '수료', '중도포기', '탈퇴');

create table public.students (
  id serial primary key,
  name varchar(50) not null,
  age smallint,
  phone varchar(20),
  email varchar(100),
  cohort_id int references public.cohorts(id) on delete set null,
  status student_status not null default '수강중',
  profile_image_url text,
  joined_at date not null default current_date,
  gpa decimal(3,2) default 0,
  attendance_rate smallint default 0,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. student_tags (역량 태그)
create table public.student_tags (
  id serial primary key,
  student_id int not null references public.students(id) on delete cascade,
  tag varchar(50) not null,
  created_at timestamptz default now(),
  unique(student_id, tag)
);

-- 5. consultations (상담 이력)
create type consultation_type as enum ('개인상담', '진로상담', '학습점검', '기타');

create table public.consultations (
  id serial primary key,
  student_id int not null references public.students(id) on delete cascade,
  consulted_at timestamptz not null default now(),
  type consultation_type not null default '기타',
  content text not null,
  follow_up text,
  created_at timestamptz default now()
);

-- 6. grades (성적/Project Scores)
create table public.grades (
  id serial primary key,
  student_id int not null references public.students(id) on delete cascade,
  project_id int references public.projects(id) on delete cascade,
  category_scores jsonb default '{}',
  team_score decimal(3,2) default 0,
  average_score decimal(3,2) default 0,
  feedback text,
  created_at timestamptz default now(),
  unique(student_id, project_id)
);

-- 7. attendances (출석)
create type attendance_status as enum ('출석', '결석', '지각', '조퇴');

create table public.attendances (
  id serial primary key,
  student_id int not null references public.students(id) on delete cascade,
  date date not null,
  status attendance_status not null default '출석',
  note text,
  unique(student_id, date)
);

-- 8. teams (팀)
create table public.teams (
  id serial primary key,
  project_id int references public.projects(id) on delete cascade,
  team_name varchar(100) not null,
  stage varchar(50) default '기획',
  progress_pct smallint default 0 check (progress_pct between 0 and 100),
  leader_id int references public.students(id) on delete set null,
  is_individual boolean default false,
  memo text,
  project_link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. team_members (팀-수강생 연결 N:M)
create table public.team_members (
  id serial primary key,
  team_id int not null references public.teams(id) on delete cascade,
  student_id int not null references public.students(id) on delete cascade,
  role varchar(50),
  joined_at date default current_date,
  unique(team_id, student_id)
);

-- 10. project_logs (프로젝트 로그)
create type log_type as enum ('회의록', '멘토피드백', '진행보고');

create table public.project_logs (
  id serial primary key,
  team_id int not null references public.teams(id) on delete cascade,
  log_date date not null default current_date,
  type log_type not null,
  title varchar(200),
  content text not null,
  progress_pct smallint check (progress_pct between 0 and 100),
  author varchar(50),
  created_at timestamptz default now()
);

-- 11. schedules (일정/D-Day)
create type schedule_category as enum ('수업', '평가', '행사', '팀활동', '기타');

create table public.schedules (
  id serial primary key,
  title varchar(200) not null,
  start_date date not null,
  end_date date,
  is_dday boolean default false,
  category schedule_category not null default '기타',
  cohort_id int references public.cohorts(id) on delete cascade,
  color varchar(7),
  created_at timestamptz default now()
);

-- 12. todos (투두리스트)
create type todo_category as enum ('개인업무', '수강생관리', '기타');
create type todo_priority as enum ('높음', '보통', '낮음');

create table public.todos (
  id serial primary key,
  title varchar(200) not null,
  category todo_category not null default '기타',
  related_student_id int references public.students(id) on delete set null,
  due_date date,
  is_done boolean default false,
  priority todo_priority not null default '보통',
  created_at timestamptz default now()
);

-- =============================================
-- Row Level Security 비활성화 (개발 편의성)
-- =============================================
alter table public.cohorts disable row level security;
alter table public.projects disable row level security;
alter table public.students disable row level security;
alter table public.student_tags disable row level security;
alter table public.consultations disable row level security;
alter table public.grades disable row level security;
alter table public.attendances disable row level security;
alter table public.teams disable row level security;
alter table public.team_members disable row level security;
alter table public.project_logs disable row level security;
alter table public.schedules disable row level security;
alter table public.todos disable row level security;

-- 13. work_tasks (업무 및 AI 프롬프트 메모)
create table public.work_tasks (
  id serial primary key,
  title varchar(200) not null,
  gpts_link text,
  prompts text[] default '{}',
  created_at timestamptz default now()
);

alter table public.work_tasks disable row level security;

-- =============================================
-- 샘플 데이터 입력
-- =============================================

-- 기수
insert into public.cohorts (name, start_date) values
  ('24기', '2024-03-04'),
  ('25기', '2025-03-03');

-- 프로젝트
insert into public.projects (cohort_id, name, description) values
  (1, '파이널 프로젝트', '24기 최종 프로젝트입니다.'),
  (2, '팀 프로젝트 1', '25기 첫 번째 팀 프로젝트입니다.');

-- 학생
insert into public.students (name, cohort_id, status, joined_at, gpa, attendance_rate) values
  ('김민준', 2, '수강중', '2025-03-03', 3.8, 85),
  ('이서연', 2, '수강중', '2025-03-03', 4.1, 92),
  ('박지훈', 1, '수료', '2024-03-04', 2.9, 78);
