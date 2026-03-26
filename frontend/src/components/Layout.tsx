import React from 'react';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import { Outlet } from 'react-router-dom';

const DRAWER_WIDTH = 240;

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="min-w-0 flex-1 flex flex-col lg:ml-60 min-h-0 h-full">
        <HeaderBar />
        <main className="min-w-0 flex-1 overflow-hidden p-3 pt-14 pb-3 min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export { DRAWER_WIDTH };
export default Layout;
