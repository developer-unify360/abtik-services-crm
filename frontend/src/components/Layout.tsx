import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import { Outlet } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 72;

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleToggleSidebar = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarCollapsed((current) => !current);
      }
    };

    window.addEventListener('toggleSidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggleSidebar', handleToggleSidebar);
  }, []);

  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent('toggleSidebar'));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      {/* Floating Toggle Button */}
      <button
        onClick={handleToggle}
        className={`fixed z-[60] bottom-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-all duration-300 hover:bg-slate-50 hover:text-indigo-600 lg:bottom-auto lg:top-3.5 ${isSidebarCollapsed ? 'lg:left-[56px]' : 'lg:left-[224px]'
          }`}
        title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <Sidebar isCollapsed={isSidebarCollapsed} />

      <div
        className={`min-w-0 flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'
          }`}
      >
        <HeaderBar />
        <main className="flex-1 overflow-y-auto px-2 py-2">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export { COLLAPSED_DRAWER_WIDTH, DRAWER_WIDTH };
export default Layout;
