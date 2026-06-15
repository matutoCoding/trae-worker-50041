import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-xuan-paper bg-paper-texture">
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="animate-fade-in-up">
          {children}
        </div>
      </main>
    </div>
  );
}
