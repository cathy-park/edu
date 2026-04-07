'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, UsersRound, Sun, Moon, LogOut, MessageSquare } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { href: '/', label: '홈', icon: Home },
  { href: '/students', label: '수강생 관리', icon: Users },
  { href: '/teams', label: '프로젝트 관리', icon: UsersRound },
  { href: '/consultations', label: '상담 이력', icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo" style={{ textDecoration: 'none', cursor: 'pointer' }}>
        <div className="sidebar-logo-icon" style={{ background: 'transparent' }}>
          <img src="/logo.png?v=3" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div className="sidebar-logo-text">
          EduManager
          <span>학생 관리 시스템</span>
        </div>
      </Link>

      <nav className="sidebar-nav">
        <div className="nav-section-label">메뉴</div>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${pathname === href ? 'active' : ''}`}
          >
            <Icon className="nav-icon" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button 
          className="nav-item" 
          onClick={toggleTheme}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={18} className="nav-icon" />
              <span>라이트 모드</span>
            </>
          ) : (
            <>
              <Moon size={18} className="nav-icon" />
              <span>다크 모드</span>
            </>
          )}
        </button>
        <button 
          className="nav-item" 
          onClick={logout}
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--red)' }}
        >
          <LogOut size={18} className="nav-icon" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
