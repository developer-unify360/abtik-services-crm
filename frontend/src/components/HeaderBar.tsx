import React from 'react';
import { LogOut, Search } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { useNavigate } from 'react-router-dom';
import { DRAWER_WIDTH } from './Sidebar';

const HeaderBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header 
      className="fixed top-0 right-0 h-10 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40 no-select"
      style={{ 
        left: DRAWER_WIDTH,
        width: `calc(100% - ${DRAWER_WIDTH}px)`
      }}
    >
      {/* Left - Title (Minimal) */}
      <div className="flex items-center gap-2">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          CRM Operations
        </h2>
        <span className="text-[10px] text-slate-300">/</span>
        <span className="text-[11px] font-bold text-indigo-600 uppercase">Abtik ERP</span>
      </div>

      {/* Right - Actions (Compact) */}
      <div className="flex items-center gap-2">
        {/* Compact Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input
            type="text"
            placeholder="Search leads..."
            className="pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
          />
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* User Info - Compact */}
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-end leading-none">
            <span className="text-[10px] font-bold text-slate-900 uppercase">
              {user?.name || 'Admin'}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              {user?.role === 'admin' ? 'Systems Admin' : 'BDE Manager'}
            </span>
          </div>
          <div className="w-6 h-6 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600 text-[10px] font-bold">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
};

export default HeaderBar;
