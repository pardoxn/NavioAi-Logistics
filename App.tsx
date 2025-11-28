
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
import Activities from './pages/Activities';
import Team from './pages/Team';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import Terms from './pages/Terms';
import Admin from './pages/Admin';

// Components for other routes
const Admin = () => <div className="p-8"><h2 className="text-2xl font-bold">Benutzerverwaltung</h2><p className="text-slate-500 mt-2">Nur für Administratoren.</p></div>;

const ProtectedLayout = () => {
  const { user } = useAuth();
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
              <Route path="/planning" element={<Planning />} />
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
