-- =============================================
-- 학생 관리 시스템 Supabase Schema
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 실행하세요
-- =============================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. cohorts (기수)
create table public.cohorts (
  id serial primary key,
  name varchar(50) not null,
  start_date date not null,
  end_date date,
  description text,
  created_at timestamptz default now()
);

-- 2. students (수강생)
create type student_status as enum ('수강중', '수료', '탈퇴');

create table public.students (
  id serial primary key,
  name varchar(50) not null,
  age smallint,
  phone varchar(20) unique,
  email varchar(100) unique,
  cohort_id int references public.cohorts(id) on delete set null,
  status student_status not null default '수강중',
  profile_image_url text,
  joined_at date not null default current_date,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. student_tags (역량 태그)
create table public.student_tags (
  id serial primary key,
  student_id int not null references public.students(id) on delete cascade,
  tag varchar(50) not null,
  created_at timestamptz default now(),
  unique(student_id, tag)
);

-- 4. consultations (상담 이력)
create type consultation_type as enum ('개인상담', '진로상담', '학습점검', '기타');

create table public.consultations (
  id serial primary key,
  student_id int not null references public.students(id) on delete cascade,
  consulted_at date not null,
  type consultation_type not null default '기타',
  content text not null,
  follow_up text,
  created_at timestamptz default now()
);

-- 5. grades (성적/GPA)
create table public.grades (
  id serial primary key,
  student_id int not null references public.students(id) on delete cascade,
  subject varchar(100) not null,
  score decimal(5,2),
  gpa decimal(3,2),
  evaluated_at date not null,
  note text
);

-- 6. assignments (과제)
create type assignment_status as enum ('제출', '미제출', '지각제출');

create table public.assignments (
  id serial primary key,
  student_id int not null references public.students(id) on delete cascade,
  assignment_name varchar(200) not null,
  due_date date not null,
  submitted_at timestamptz,
  status assignment_status not null default '미제출',
  score decimal(5,2),
  feedback text
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
create type project_stage as enum ('기획', '디자인', '개발', '완료');

create table public.teams (
  id serial primary key,
  cohort_id int references public.cohorts(id) on delete set null,
  team_name varchar(100) not null,
  project_topic varchar(200),
  stage project_stage not null default '기획',
  progress_pct smallint default 0 check (progress_pct between 0 and 100),
  leader_id int references public.students(id) on delete set null,
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
  log_date date not null,
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
  cohort_id int references public.cohorts(id) on delete set null,
  color varchar(7),
  created_at timestamptz default now()
);

-- 12. todos (투두리스트)
create type todo_category as enum ('개인업무', '수강생관리');
create type todo_priority as enum ('높음', '보통', '낮음');

create table public.todos (
  id serial primary key,
  title varchar(200) not null,
  category todo_category not null default '개인업무',
  related_student_id int references public.students(id) on delete set null,
  due_date date,
  is_done boolean default false,
  priority todo_priority not null default '보통',
  created_at timestamptz default now()
);

-- =============================================
-- Row Level Security (선택 — 인증 붙일 경우 활성화)
-- =============================================
-- alter table public.students enable row level security;
-- alter table public.teams enable row level security;
-- (필요 시 각 테이블에 RLS 정책 추가)

-- =============================================
-- 샘플 데이터
-- =============================================
insert into public.cohorts (name, start_date, end_date) values
  ('24기', '2024-03-04', '2024-08-30'),
  ('25기', '2025-03-03', '2025-08-29');

insert into public.students (name, age, phone, email, cohort_id, status, joined_at, gpa, attendance_rate) values
  ('김민준', 24, '010-1234-5678', 'minjun@example.com', 2, '수강중', '2025-03-03', 3.8, 85),
  ('이서연', 23, '010-9876-5432', 'seoyeon@example.com', 2, '수강중', '2025-03-03', 4.1, 92),
  ('박지훈', 25, '010-5555-7777', 'jihoon@example.com', 1, '수료', '2024-03-04', 2.9, 78),
  ('최예린', 22, '010-1111-2222', 'yerin@example.com', 2, '수강중', '2025-03-03', 3.9, 88),
  ('강다은', 24, '010-8888-9999', 'daeun@example.com', 2, '수강중', '2025-03-03', 3.7, 82);
