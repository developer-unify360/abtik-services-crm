import React from 'react';
import { Bell, LogOut, Search } from 'lucide-react';
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
      className="fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40"
      style={{ 
        left: DRAWER_WIDTH,
        width: `calc(100% - ${DRAWER_WIDTH}px)`
      }}
    >
      {/* Left - Title */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Business Service Management
        </h2>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
          />
        </div>

        {/* Role Badge */}
        {user?.role && (
          <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg">
            {user.role}
          </span>
        )}

        {/* Notifications */}
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user?.name?.[0] || 'U'}
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default HeaderBar;
