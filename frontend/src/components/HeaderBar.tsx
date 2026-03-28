import React from 'react';
import { LogOut, Search, Menu } from 'lucide-react';
import { hasAdminAccess, useAuthStore } from '../auth/authStore';
import { useNavigate } from 'react-router-dom';

const HeaderBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = hasAdminAccess(user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-60 h-10 bg-white border-b border-slate-200 z-30">
      <div className="relative flex items-center h-full px-2 lg:px-4">

        <button
          onClick={() => window.dispatchEvent(new Event('toggleSidebar'))}
          className="lg:hidden z-10 p-1.5 rounded-md hover:bg-slate-100"
        >
          <Menu size={16} />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
            Abtik ERP
          </span>
        </div>

        <div className="flex items-center gap-1 lg:gap-2 ml-auto">
          <div className="relative hidden md:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input
              type="text"
              placeholder="Search leads..."
              className="pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32 lg:w-48"
            />
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden md:block" />

          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-end leading-none hidden lg:flex">
              <span className="text-[10px] font-bold text-slate-900 uppercase">
                {user?.name || 'User'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                {isAdmin ? 'Systems Admin' : 'Abtik User'}
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
      </div>
    </header>
  );
};

export default HeaderBar;
