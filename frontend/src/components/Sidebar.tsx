import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  FileText,
  ListChecks,
  ScrollText,
  Settings2,
  Briefcase,
  Calendar,
  Cog,
  CreditCard,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Link2,
  LogOut,
  Trophy,
  Users,
} from 'lucide-react';
import { hasAdminAccess, useAuthStore } from '../auth/authStore';
import { getRoleName, isHrUser, isBdeUser, isSalesManager } from '../auth/roleUtils';

const DRAWER_WIDTH = 240;

interface NavChildItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  children?: NavChildItem[];
}

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Payroll: location.pathname.startsWith('/payroll'),
    Sales: location.pathname.match(/^\/(leads|clients|bookings|payments)/) !== null,
    'IT Operations': location.pathname.match(/^\/(it-delivery|client-documents|document-portals)/) !== null,
  });
  const canAccessAdminNav = hasAdminAccess(user);
  const isHr = isHrUser(user);
  const isBde = isBdeUser(user);
  const isSalesManagerUser = isSalesManager(user);

  const navItems: NavItem[] = useMemo(() => ([
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    {
      label: 'Sales',
      icon: <Trophy size={18} />,
      children: [
        { label: 'Lead Inbox', path: '/leads', icon: <Trophy size={14} /> },
        { label: 'Clients', path: '/clients', icon: <Users size={14} /> },
        { label: 'Bookings', path: '/bookings', icon: <Calendar size={14} /> },
        { label: 'Payments', path: '/payments', icon: <CreditCard size={14} /> },
      ],
    },
    {
      label: 'IT Operations',
      icon: <Briefcase size={18} />,
      children: [
        { label: 'IT Delivery', path: '/it-delivery', icon: <Briefcase size={14} /> },
        { label: 'Client Docs', path: '/client-documents', icon: <FolderOpen size={14} /> },
        { label: 'Doc Portals', path: '/document-portals', icon: <Link2 size={14} />, adminOnly: true },
      ],
    },
    {
      label: 'Payroll',
      icon: <FileText size={18} />,
      children: [
        { label: 'Company Setup', path: '/payroll/company-setup', icon: <Building2 size={14} /> },
        { label: 'Salary Rules', path: '/payroll/salary-rules', icon: <ScrollText size={14} /> },
        { label: 'Attendance Rules', path: '/payroll/attendance-rules', icon: <Settings2 size={14} /> },
        { label: 'Employees', path: '/payroll/employees', icon: <ListChecks size={14} /> },
        { label: 'Payslip Generator', path: '/payroll/payslip-generator', icon: <FileText size={14} /> },
      ],
    },
    { label: 'Rules', path: '/leads/assignment-rules', icon: <Layers size={18} />, adminOnly: true },
    { label: 'Settings', path: '/attributes', icon: <Cog size={18} />, adminOnly: true },
  ]), []);

  const filteredNavItems = navItems
    .filter((item) => {
      if (isHr) {
        return item.label === 'Payroll';
      }
      if (isBde || isSalesManagerUser) {
        return item.label === 'Sales';
      }
      return !item.adminOnly || canAccessAdminNav;
    })
    .map((item) => {
      if (item.children) {
        const children = item.children.filter((child) => {
          // BDE sees restricted Sales items
          if (isBde && item.label === 'Sales') {
            return child.label === 'Lead Inbox' || child.label === 'Bookings';
          }
          // Sales Manager sees ALL Sales items
          if (isSalesManagerUser && item.label === 'Sales') {
            return true;
          }
          return !child.adminOnly || canAccessAdminNav;
        });
        return { ...item, children };
      }
      return item;
    });

  const isPathActive = (path: string) => {
    if (path === '/leads') {
      return location.pathname === '/leads' || (location.pathname.startsWith('/leads/') && !location.pathname.startsWith('/leads/assignment-rules'));
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  useEffect(() => {
    if (location.pathname.startsWith('/payroll')) {
      setOpenGroups((previous) => ({ ...previous, Payroll: true }));
    }
    if (location.pathname.match(/^\/(leads|clients|bookings|payments)/)) {
      setOpenGroups((previous) => ({ ...previous, Sales: true }));
    }
    if (location.pathname.match(/^\/(it-delivery|client-documents|document-portals)/)) {
      setOpenGroups((previous) => ({ ...previous, 'IT Operations': true }));
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((previous) => ({
      ...previous,
      [label]: !previous[label],
    }));
  };

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth < 1024) {
        setIsMobileOpen((previous) => !previous);
      }
    };
    window.addEventListener('toggleSidebar', handler);
    return () => window.removeEventListener('toggleSidebar', handler);
  }, []);


  const itemsToRender = useMemo(() => {
    if (!isCollapsed) return filteredNavItems;
    return filteredNavItems.flatMap((item) => (item.children ? (item.children as NavItem[]) : [item]));
  }, [isCollapsed, filteredNavItems]);

  return (
    <>
      {isMobileOpen ? (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 h-screen bg-slate-900 text-slate-400 flex flex-col z-50 overflow-hidden border-r border-white/5 shadow-2xl transition-[width,transform] duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          } w-[240px] lg:translate-x-0 ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-[240px]'}`}
      >
        <div className={`flex h-12 items-center border-b border-white/5 bg-slate-950/40 relative ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}>
          {!isCollapsed ? (
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Abtik CRM</p>
              <p className="text-xs font-bold text-slate-100 truncate">Workspace</p>
            </div>
          ) : (
            <span className="text-white font-black tracking-tighter text-lg">A</span>
          )}
        </div>

        <nav className={`sidebar-scroll flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {!isCollapsed ? (
            <div className="mb-3 px-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Main Menu</p>
            </div>
          ) : null}
          <ul className="space-y-1.5">
            {itemsToRender.map((item) => {
              const navItem = item as NavItem;
              const children = navItem.children || [];
              const hasChildren = children.length > 0;
              const isActive = hasChildren
                ? children.some((child) => isPathActive(child.path))
                : Boolean(navItem.path && isPathActive(navItem.path));
              const isOpen = openGroups[navItem.label];

              if (hasChildren && !isCollapsed) {
                return (
                  <li key={navItem.label}>
                    <button
                      onClick={() => toggleGroup(navItem.label)}
                      className={`w-full flex items-center rounded-lg transition-all text-left group gap-3 px-3 py-2.5 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold' : 'hover:bg-white/5 hover:text-slate-100'}`}
                    >
                      <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                        {navItem.icon}
                      </span>
                      <span className="flex-1 text-sm tracking-tight">{navItem.label}</span>
                      <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                    </button>
                    {isOpen && (
                      <ul className="mt-1 space-y-1 pl-4">
                        {children.map((child) => {
                          const isChildActive = isPathActive(child.path);
                          return (
                            <li key={child.path}>
                              <button
                                onClick={() => handleNavClick(child.path)}
                                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${isChildActive ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}
                              >
                                <span className={`${isChildActive ? 'text-emerald-300' : 'text-slate-500'}`}>{child.icon}</span>
                                <span>{child.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={navItem.path || navItem.label}>
                  <button
                    onClick={() => navItem.path && handleNavClick(navItem.path)}
                    title={isCollapsed ? navItem.label : undefined}
                    className={`
                      w-full flex items-center rounded-lg transition-all text-left group
                      ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
                      ${isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold'
                        : 'hover:bg-white/5 hover:text-slate-100'
                      }
                    `}
                  >
                    <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                      {navItem.icon}
                    </span>
                    {!isCollapsed ? <span className="text-sm tracking-tight">{navItem.label}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={`border-t border-white/5 bg-slate-950/30 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`mb-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-black text-white shadow-inner shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            {!isCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-tight text-slate-100 leading-tight">{user?.name || 'Abtik User'}</p>
                <p className="mt-0.5 truncate text-[10px] lowercase text-slate-500">{user?.email}</p>
                {getRoleName(user) && (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/90 whitespace-nowrap">
                    {getRoleName(user)}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`w-full flex items-center justify-center rounded-lg text-xs font-black text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 border border-rose-500/0 hover:border-rose-500/20 transition-all uppercase tracking-widest ${isCollapsed ? 'px-0 py-2.5' : 'gap-2 px-3 py-2.5'}`}
          >
            <LogOut size={14} />
            {!isCollapsed ? <span>Sign Out</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
