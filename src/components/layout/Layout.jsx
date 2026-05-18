import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuClick={toggleSidebar} />
      <div className="flex relative min-w-0">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 min-w-0 w-full p-4 sm:p-6 ml-0 lg:ml-64 transition-all duration-300 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;