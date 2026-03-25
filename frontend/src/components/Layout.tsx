import React from 'react';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import { Outlet } from 'react-router-dom';

const DRAWER_WIDTH = 200; // More compact sidebar width

const Layout: React.FC = () => {
  return (
    <div className="flex viewport-height bg-gray-50 overflow-hidden">
      <Sidebar />
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{ marginLeft: `${DRAWER_WIDTH}px` }}
      >
        <HeaderBar />
        <main className="flex-1 overflow-hidden p-1.5 pt-0">
          <div className="h-full overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export { DRAWER_WIDTH };
export default Layout;
