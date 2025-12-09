
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Planning from './pages/Planning';
import Warehouse from './pages/Warehouse';
import Archive from './pages/Archive';
import ArchiveV2 from './pages/ArchiveV2';
import Activities from './pages/Activities';
import Team from './pages/Team';
import Settings from './pages/Settings';
import PlanningV2 from './pages/PlanningV2';
import Signup from './pages/Signup';
import Terms from './pages/Terms';
import AdminPage from './pages/Admin';
import Handbook from './pages/Handbook';
import { useState } from 'react';

const ProtectedLayout = () => {
  const disableLegacy = true;
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Lädt...
      </div>
    );
  }
  if (!user) return <Navigate to="/" />;

  return (
    <div className="flex flex-col md:flex-row bg-slate-50 min-h-screen">
      <Sidebar />
      {/* Fixed: changed md:ml-64 to md:ml-72 to match Sidebar w-72 */}
      <div className="flex-1 md:ml-72 mb-16 md:mb-0 transition-all duration-300">
        <Outlet />
      </div>
      <MobileNav />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/agb" element={<Terms />} />
            
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/import" element={<Import />} />
              <Route path="/planning" element={disableLegacy ? <Navigate to="/planning-v2" replace /> : <Planning />} />
              <Route path="/planning-v2" element={<PlanningV2 />} />
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/archive" element={disableLegacy ? <Navigate to="/archive-v2" replace /> : <Archive />} />
              <Route path="/archive-v2" element={<ArchiveV2 />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/team" element={disableLegacy ? <Navigate to="/dashboard" replace /> : <Team />} />
              <Route path="/handbook" element={<Handbook />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
