import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  ListTodo,
  UserCircle,
  Building2,
  Kanban,
  FilePlus2,
} from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { canManageServicesCatalog, isBDEUser } from '../auth/roleUtils';

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  isActive?: (pathname: string) => boolean;
}

const baseNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Clients', path: '/clients', icon: <Users size={20} /> },
  { label: 'Bookings', path: '/bookings', icon: <Calendar size={20} /> },
  { label: 'Kanban Board', path: '/kanban', icon: <Kanban size={20} /> },
  { label: 'Service Requests', path: '/service-requests', icon: <ClipboardList size={20} /> },
  { label: 'Users', path: '/users', icon: <UserCircle size={20} /> },
  { label: 'Tenants', path: '/tenants', icon: <Building2 size={20} /> },
];

const bdeNavItems: NavItem[] = [
  {
    label: 'Booking List',
    path: '/bookings',
    icon: <Calendar size={20} />,
    isActive: (pathname) => pathname === '/bookings',
  },
  {
    label: 'Booking Form',
    path: '/bookings/new',
    icon: <FilePlus2 size={20} />,
    isActive: (pathname) => pathname === '/bookings/new' || /^\/bookings\/[^/]+\/edit$/.test(pathname),
  },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const navItems: NavItem[] = isBDEUser(user)
    ? bdeNavItems
    : (
        canManageServicesCatalog(user)
          ? [
              ...baseNavItems.slice(0, 5),
              { label: 'Services', path: '/services', icon: <ListTodo size={20} /> },
              ...baseNavItems.slice(5),
            ]
          : baseNavItems
      );

  return (
    <aside 
      className="fixed left-0 top-0 h-screen w-60 bg-slate-900 text-slate-300 flex flex-col z-50"
      style={{ width: DRAWER_WIDTH }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white tracking-wide">
          Business ERP
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.isActive
              ? item.isActive(location.pathname)
              : location.pathname.startsWith(item.path);
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

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">
          v1.0.0
        </p>
      </div>
    </aside>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
