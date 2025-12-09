import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Truck, Package, Archive, LogOut, MessageSquare, Settings, BookOpen, Menu, X, Route } from 'lucide-react';
import Logo from './Logo';

const MobileNav = () => {
  const { isDispo, isLager, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
    }`;

  if (isLager) {
    return null; // Kein Mobile-Menü für Lager
  }

  return (
    <>
      {/* Burger Button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 bg-white shadow-lg rounded-full p-3 border border-slate-200 text-slate-700"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
      >
        <Menu size={20} />
      </button>

      {/* Drawer Overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 left-0 h-full w-72 bg-white shadow-2xl border-r border-slate-200 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo size={32} />
              </div>
              <button
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                onClick={() => setOpen(false)}
                aria-label="Menü schließen"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
              <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                {({ isActive }) => (
                  <>
                    <LayoutDashboard size={18} className={isActive ? "text-brand-600" : ""} />
                    Dashboard
                  </>
                )}
              </NavLink>

              {isAdmin ? (
                <>
                  <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <LayoutDashboard size={18} className={isActive ? "text-brand-600" : ""} />
                        Dashboard
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/team" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <MessageSquare size={18} className={isActive ? "text-pink-500" : ""} />
                        Team & Chat
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/handbook" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <BookOpen size={18} className={isActive ? "text-amber-500" : ""} />
                        Handbuch
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/import" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Truck size={18} className={isActive ? "text-brand-600" : ""} />
                        Import CSV
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/planning" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Truck size={18} className={isActive ? "text-brand-600" : ""} />
                        Tourenplanung
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/planning-v2" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Route size={18} className={isActive ? "text-emerald-500" : ""} />
                        Tourenplanung V2
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/warehouse" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Package size={18} className={isActive ? "text-green-500" : ""} />
                        Geplante Touren
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/archive" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Archive size={18} className={isActive ? "text-amber-500" : ""} />
                        Archiv
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/archive-v2" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Archive size={18} className={isActive ? "text-amber-500" : ""} />
                        Archiv V2
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/settings" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Settings size={18} className={isActive ? "text-slate-800" : ""} />
                        Einstellungen
                      </>
                    )}
                  </NavLink>
                </>
              ) : isDispo ? (
                <>
                  <NavLink to="/planning-v2" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Route size={18} className={isActive ? "text-emerald-500" : ""} />
                        Tourenplanung V2
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/archive-v2" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <Archive size={18} className={isActive ? "text-amber-500" : ""} />
                        Archiv V2
                      </>
                    )}
                  </NavLink>
                  <NavLink to="/handbook" className={linkClass} onClick={() => setOpen(false)}>
                    {({ isActive }) => (
                      <>
                        <BookOpen size={18} className={isActive ? "text-amber-500" : ""} />
                        Handbuch
                      </>
                    )}
                  </NavLink>
                </>
              ) : isLager ? (
                <NavLink to="/warehouse" className={linkClass} onClick={() => setOpen(false)}>
                  {({ isActive }) => (
                    <>
                      <Package size={18} className={isActive ? "text-green-500" : ""} />
                      Geplante Touren
                    </>
                  )}
                </NavLink>
              ) : null}
            </nav>

            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 font-semibold"
            >
              <LogOut size={16} />
              Abmelden
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
