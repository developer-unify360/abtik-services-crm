import React from 'react';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import { Outlet } from 'react-router-dom';

const DRAWER_WIDTH = 240;

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div 
        className="flex-1 ml-60"
        style={{ marginLeft: `${DRAWER_WIDTH}px` }}
      >
        <HeaderBar />
        <main className="pt-16 px-3 pb-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export { DRAWER_WIDTH };
export default Layout;
