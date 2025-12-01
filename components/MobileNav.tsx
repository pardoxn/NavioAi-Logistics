
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Truck, Package, Archive, LogOut, MessageSquare, Settings, BookOpen } from 'lucide-react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';

const MobileNav = () => {
  const { isDispo, isLager, isAdmin, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${
      isActive ? 'text-brand-600 scale-105' : 'text-slate-400 hover:text-slate-600'
    }`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 h-16 flex justify-between items-center px-2 z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col items-center justify-center w-full h-full">
        <Logo size={26} />
      </div>
      <NavLink to="/dashboard" className={linkClass}>
        {({ isActive }) => (
          <>
            <LayoutDashboard size={20} className={isActive ? "drop-shadow-md" : ""} />
            <span className="text-[10px] font-medium">Home</span>
          </>
        )}
      </NavLink>

      <NavLink to="/team" className={linkClass}>
        {({ isActive }) => (
          <>
            <MessageSquare size={20} className={isActive ? "drop-shadow-md" : ""} />
            <span className="text-[10px] font-medium">Team</span>
          </>
        )}
      </NavLink>
      <NavLink to="/handbook" className={linkClass}>
        {({ isActive }) => (
          <>
            <BookOpen size={20} className={isActive ? "drop-shadow-md" : ""} />
            <span className="text-[10px] font-medium">Handbuch</span>
          </>
        )}
      </NavLink>

      {/* Notification Bell Integrated Here */}
      <div className="flex flex-col items-center justify-center w-full h-full">
         <div className="bg-slate-900 rounded-full p-1 shadow-lg -mt-4">
            {/* Pass isMobile=true to force dropdown to open upwards */}
            <NotificationBell isMobile={true} />
         </div>
      </div>

      {isDispo && (
        <NavLink to="/planning" className={linkClass}>
          {({ isActive }) => (
            <>
              <Truck size={20} className={isActive ? "drop-shadow-md" : ""} />
              <span className="text-[10px] font-medium">Planung</span>
            </>
          )}
        </NavLink>
      )}

      {isLager && (
        <NavLink to="/warehouse" className={linkClass}>
          {({ isActive }) => (
            <>
              <Package size={20} className={isActive ? "drop-shadow-md" : ""} />
              <span className="text-[10px] font-medium">Lager</span>
            </>
          )}
        </NavLink>
      )}
      
      {isAdmin && (
        <NavLink to="/settings" className={linkClass}>
          {({ isActive }) => (
            <>
              <Settings size={20} className={isActive ? "drop-shadow-md" : ""} />
              <span className="text-[10px] font-medium">Setup</span>
            </>
          )}
        </NavLink>
      )}

      <button onClick={logout} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-300 hover:text-red-400 transition-colors">
        <LogOut size={20} />
        <span className="text-[10px] font-medium">Exit</span>
      </button>
    </div>
  );
};

export default MobileNav;
