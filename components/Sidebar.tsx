
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LayoutDashboard, Truck, Package, Users, LogOut, FileSpreadsheet, Archive, Disc, History, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Sidebar = () => {
  const { user, logout, isAdmin, isDispo, isLager } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all duration-300 rounded-r-xl mr-2 mb-1 group overflow-hidden ${
      isActive
        ? 'text-white bg-white/10 shadow-[inset_1px_0_0_0_rgba(255,255,255,0.2)] border-l-[3px] border-cyan-400'
        : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-[3px] border-transparent'
    }`;

  return (
    // Removed overflow-hidden from root to allow Bell Dropdown to show outside
    <div className="hidden md:flex w-72 flex-col h-screen fixed left-0 top-0 z-50 bg-[#0f172a] border-r border-white/5 shadow-2xl">
      
      {/* Background FX - Wrapped in a separate overflow-hidden container so effects are clipped but dropdowns aren't */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-100"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-600 rounded-full blur-[80px] opacity-20"></div>
        <div className="absolute top-1/2 -right-24 w-48 h-48 bg-cyan-500 rounded-full blur-[60px] opacity-10"></div>
      </div>

      {/* Header with Bell - High Z-Index to stay above content */}
      <div className="p-6 pb-2 relative z-[60] flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="relative">
             <div className="absolute inset-0 bg-cyan-400 blur-sm rounded-lg opacity-50"></div>
             <div className="relative bg-gradient-to-br from-brand-500 to-cyan-600 p-2 rounded-lg shadow-inner border border-white/10">
               <Truck className="h-5 w-5 text-white" />
             </div>
           </div>
           <div>
             <h1 className="text-lg font-bold tracking-tight text-white leading-none">Navio AI</h1>
             <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-200/60 mt-1 font-medium">Logistics</p>
           </div>
        </div>
        {/* BELL HERE */}
        <NotificationBell />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-0 py-6 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="px-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Menu</div>
        <NavLink to="/dashboard" className={linkClass}>
          {({ isActive }) => (
            <>
              <LayoutDashboard size={18} className={isActive ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" : ""} />
              Dashboard
            </>
          )}
        </NavLink>
        <NavLink to="/team" className={linkClass}>
          {({ isActive }) => (
            <>
              <MessageSquare size={18} className={isActive ? "text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)]" : ""} />
              Team & Chat
            </>
          )}
        </NavLink>

        {isDispo && (
          <>
            <div className="mt-8 px-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between group cursor-default">
              Disposition
              <div className="h-[1px] flex-1 bg-white/5 ml-3 group-hover:bg-white/10 transition-colors"></div>
            </div>
            <NavLink to="/import" className={linkClass}>
              {({ isActive }) => (
                <>
                  <FileSpreadsheet size={18} className={isActive ? "text-cyan-400" : ""} />
                  Import CSV
                </>
              )}
            </NavLink>
            <NavLink to="/planning" className={linkClass}>
              {({ isActive }) => (
                <>
                  <Disc size={18} className={isActive ? "text-cyan-400 animate-spin-slow" : ""} />
                  Tourenplanung
                </>
              )}
            </NavLink>
          </>
        )}

        {isLager && (
          <>
            <div className="mt-8 px-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between group cursor-default">
              Lager & Versand
              <div className="h-[1px] flex-1 bg-white/5 ml-3 group-hover:bg-white/10 transition-colors"></div>
            </div>
            <NavLink to="/warehouse" className={linkClass}>
              {({ isActive }) => (
                <>
                  <Package size={18} className={isActive ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : ""} />
                  Verladung
                </>
              )}
            </NavLink>
          </>
        )}
        
        <div className="mt-8 px-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
           History
           <div className="h-[1px] flex-1 bg-white/5 ml-3"></div>
        </div>
        <NavLink to="/archive" className={linkClass}>
          {({ isActive }) => (
            <>
              <Archive size={18} className={isActive ? "text-amber-400" : ""} />
              Archiv
            </>
          )}
        </NavLink>
        <NavLink to="/activities" className={linkClass}>
          {({ isActive }) => (
            <>
              <History size={18} className={isActive ? "text-blue-400" : ""} />
              Aktivitäten
            </>
          )}
        </NavLink>

        {isAdmin && (
          <>
             <div className="mt-8 px-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
               Admin
               <div className="h-[1px] flex-1 bg-white/5 ml-3"></div>
            </div>
            <NavLink to="/admin" className={linkClass}>
               {({ isActive }) => (
                <>
                  <Users size={18} className={isActive ? "text-purple-400" : ""} />
                  Benutzer
                </>
              )}
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
               {({ isActive }) => (
                <>
                  <SettingsIcon size={18} className={isActive ? "text-slate-200" : ""} />
                  Einstellungen
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 relative z-10">
        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-lg group hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-brand-600 border-2 border-white/10 flex items-center justify-center text-sm font-bold text-white shadow-lg">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-200 transition-colors">{user?.username}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                 {user?.role.toLowerCase()}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 hover:text-red-200 rounded-lg transition-all">
            <LogOut size={14} /> Abmelden
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
