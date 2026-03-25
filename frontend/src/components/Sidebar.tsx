import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Trophy, Layers, CreditCard, LogOut, Cog } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';

const DRAWER_WIDTH = 240; // Restored to a more standard width

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuthStore();
  
  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Lead Inbox', path: '/leads', icon: <Trophy size={18} /> },
    { label: 'Clients', path: '/clients', icon: <Users size={18} /> },
    { label: 'Bookings', path: '/bookings', icon: <Calendar size={18} /> },
    { label: 'Payments', path: '/payments', icon: <CreditCard size={18} /> },
    { label: 'Rules', path: '/leads/assignment-rules', icon: <Layers size={18} />, adminOnly: true },
    { label: 'Settings', path: '/attributes', icon: <Cog size={18} />, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-slate-900 text-slate-400 flex flex-col z-50 overflow-hidden shadow-2xl"
      style={{ width: DRAWER_WIDTH }}
    >
      {/* Brand Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 bg-slate-950/50">
        <span className="text-white font-black tracking-tighter text-2xl">ABTIK</span>
        <span className="ml-2 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-500/20">CRM</span>
      </div>

      {/* Navigation - Spacious */}
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mb-4 px-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Main Menu</p>
        </div>
        <ul className="space-y-1.5">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold'
                      : 'hover:bg-white/5 hover:text-slate-100'
                    }
                  `}
                >
                  <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm tracking-tight">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Session Area */}
      <div className="p-4 border-t border-white/5 bg-slate-950/30">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-inner border border-white/10 shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-100 truncate leading-tight uppercase tracking-tight">{user?.name || 'Abtik User'}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5 lowercase">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-black text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 border border-rose-500/0 hover:border-rose-500/20 transition-all uppercase tracking-widest"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
