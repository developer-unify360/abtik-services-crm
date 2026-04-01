import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { getRoleName } from '../auth/roleUtils';
import { useNavigate, useLocation } from 'react-router-dom';

const HeaderBar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggleSidebar'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = (pathname: string) => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/leads')) return 'Lead Management';
    if (pathname.startsWith('/clients')) return 'Client Directory';
    if (pathname.startsWith('/bookings')) return 'Service Bookings';
    if (pathname.startsWith('/it-delivery')) return 'IT Delivery Ops';
    if (pathname.startsWith('/client-documents')) return 'Document Repository';
    if (pathname.startsWith('/document-portals')) return 'Access Portals';
    if (pathname.startsWith('/payments')) return 'Payment Records';
    if (pathname.startsWith('/payroll')) return 'Payroll & Compliance';
    if (pathname.startsWith('/attributes')) return 'System Attributes';
    return 'Project Dashboard';
  };

  const getPageSubtitle = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Workspace / Home';
    
    return `Workspace / ${parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' ')).join(' / ')}`;
  };

  return (
    <header className="h-14 bg-white/70 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4">
      <div className="flex items-center justify-between h-full">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleSidebar}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
          
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">{getPageTitle(location.pathname)}</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{getPageSubtitle(location.pathname)}</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* User Display */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors group cursor-default">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
                {getRoleName(user) || 'Staff'}
              </p>
            </div>
            
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs border-2 border-white shadow-sm ring-1 ring-indigo-500/10">
                {user?.name?.[0].toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
            title="Sign Out"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
