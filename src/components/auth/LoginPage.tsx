'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { loginAsGuest, mockLoginWithGoogle } = useAuth();

  return (
    <div className="login-gate">
      <div className="login-content">
        <div className="login-card">
          <div className="brand-section">
            <div className="brand-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
              <img src="/logo.png" alt="EduManager Logo" style={{ width: 60, height: 60, objectFit: 'contain' }} />
            </div>
            <h1 className="brand-name">EduManager</h1>
            <p className="brand-tagline">스마트한 수강생 및 학사 관리 시스템</p>
          </div>

          <div className="auth-section">
            <button className="google-login-btn" onClick={mockLoginWithGoogle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.87 14.13c-.22-.67-.35-1.38-.35-2.13s.13-1.46.35-2.13V7.03H2.18C1.43 8.53 1 10.21 1 12s.43 3.47 1.18 4.97l3.69-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.69 2.84c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335"/>
              </svg>
              <span>Google 계정으로 계속하기</span>
            </button>

            <button className="guest-login-link" onClick={loginAsGuest}>
              로그인 없이 둘러보기 <ArrowRight size={16} />
            </button>
          </div>
          
          <div className="login-footer">
            © 2026 EduManager. All rights reserved.
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-gate {
          position: fixed;
          inset: 0;
          background: #0d0f1a;
          background: radial-gradient(circle at top left, #1c2035 0%, #0d0f1a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
        }

        .login-gate::before {
          content: '';
          position: absolute;
          width: 1000px;
          height: 1000px;
          background: radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%);
          top: -400px;
          right: -300px;
        }

        .login-content {
          width: 100%;
          max-width: 440px;
          padding: 20px;
          animation: slideUpIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .login-card {
          background: rgba(20, 23, 40, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 40px;
          padding: 60px 40px;
          text-align: center;
          box-shadow: 0 40px 100px rgba(0,0,0,0.5);
        }

        .brand-section {
          margin-bottom: 50px;
        }

        .brand-logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 20px 40px rgba(124,58,237,0.3);
        }

        .brand-name {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: white;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .brand-tagline {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
        }

        .auth-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .google-login-btn {
          width: 100%;
          height: 56px;
          background: white;
          color: #1e293b;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 700;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .google-login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.2);
        }

        .guest-login-link {
          background: none;
          border: none;
          color: #64748b;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: color 0.3s;
          padding: 10px;
        }

        .guest-login-link:hover {
          color: #7c3aed;
        }

        .login-footer {
          margin-top: 50px;
          font-size: 12px;
          color: #475569;
          font-weight: 500;
        }

        @keyframes slideUpIn {
          from { 
            opacity: 0; 
            transform: translateY(30px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }

        /* Light Mode Overrides */
        [data-theme='light'] .login-gate {
          background: #f1f5f9;
          background: radial-gradient(circle at top left, #ffffff 0%, #f1f5f9 100%);
        }
        [data-theme='light'] .login-card {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 40px 100px rgba(0,0,0,0.1);
        }
        [data-theme='light'] .brand-name {
          color: #0f172a;
        }
        [data-theme='light'] .brand-tagline {
          color: #64748b;
        }
        [data-theme='light'] .google-login-btn {
          border: 1px solid #e2e8f0;
        }
      `}} />
    </div>
  );
}
