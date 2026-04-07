'use client';

import { Team } from '@/lib/types';
import { getMembersForTeam, mockProjects } from '@/lib/mockData';

interface Props {
  team: Team;
  selected: boolean;
  onClick: () => void;
}

const STAGE_COLORS: Record<string, string> = {
  기획: 'var(--yellow)',
  디자인: 'var(--purple)',
  개발: 'var(--blue)',
  완료: 'var(--green)',
};

export default function TeamCard({ team, selected, onClick }: Props) {
  const members = getMembersForTeam(team.id);
  const leader = members.find((m) => m.student_id === team.leader_id);
  const stageColor = STAGE_COLORS[team.stage] ?? 'var(--text-muted)';
  
  const project = mockProjects.find(p => p.id === team.project_id);

  return (
    <div className={`team-card ${selected ? 'selected' : ''}`} onClick={onClick} style={{ position: 'relative', overflow: 'hidden' }}>
      {team.is_individual && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          background: 'var(--blue)', 
          color: 'white', 
          fontSize: '9px', 
          fontWeight: 800, 
          padding: '2px 8px', 
          borderBottomRightRadius: '8px',
          zIndex: 1
        }}>
          개인 프로젝트
        </div>
      )}
      
      <div className="team-card-header" style={{ marginTop: team.is_individual ? 12 : 0 }}>
        <div className="team-name" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 8 }}>
          {team.team_name}
        </div>
        <span
          className={`badge badge-${team.stage}`}
          style={{ color: stageColor, background: `${stageColor}22`, flexShrink: 0 }}
        >
          {team.stage}
        </span>
      </div>

      {leader && (
        <div className="team-leader">팀장: {leader.student.name}</div>
      )}
      <div className="team-topic">{project?.name ?? '주제 미정'}</div>

      {/* Progress */}
      <div style={{ marginBottom: 12 }}>
        <div className="progress-wrap">
          <div className="progress-bg">
            <div
              className="progress-fill"
              style={{
                width: `${team.progress_pct}%`,
                background:
                  team.progress_pct >= 70 ? 'var(--green)' :
                  team.progress_pct >= 40 ? 'var(--accent)' : 'var(--yellow)',
              }}
            />
          </div>
          <span className="progress-pct">{team.progress_pct}%</span>
        </div>
      </div>

      {/* Members */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="team-avatars">
          {members.slice(0, 4).map((m, i) => (
            <div
              key={m.id}
              className="m-avatar"
              title={m.student.name}
              style={{
                background: ['#7c3aed22','#3b82f622','#10b98122','#f59e0b22'][i % 4],
                color: ['#a78bfa','#93c5fd','#6ee7b7','#fcd34d'][i % 4],
              }}
            >
              {m.student.name[0]}
            </div>
          ))}
          {members.length > 4 && (
            <div className="m-avatar" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              +{members.length - 4}
            </div>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>팀원 {members.length}명</span>
      </div>
    </div>
  );
}
