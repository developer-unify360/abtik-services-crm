import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Trophy, Layers } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuthStore();
  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Leads', path: '/leads', icon: <Trophy size={20} /> },
    { label: 'Clients', path: '/clients', icon: <Users size={20} /> },
    { label: 'Bookings', path: '/bookings', icon: <Calendar size={20} /> },
    { label: 'Attributes', path: '/attributes', icon: <Layers size={20} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-slate-900 text-slate-300 flex flex-col z-50"
      style={{ width: DRAWER_WIDTH }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white tracking-wide">
          Abtik BDE
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                    transition-all duration-200 text-left
                    ${isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500'
                      : 'hover:bg-slate-800 hover:text-slate-200 text-slate-400'
                    }
                  `}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - User info + logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
