import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CohortProvider } from '@/context/CohortContext';
import { DataProvider } from '@/context/DataContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import AuthGate from '@/components/auth/AuthGate';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "EduManager — 학생 관리 시스템",
  description: "수강생 성적 정보 및 팀 프로젝트 현황을 한눈에 관리하는 대시보드",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  icons: {
    icon: "/logo.png?v=3",
    apple: "/logo.png?v=3",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <CohortProvider>
              <DataProvider>
                <AuthGate>{children}</AuthGate>
                <Toaster position="top-right" />
              </DataProvider>
            </CohortProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
