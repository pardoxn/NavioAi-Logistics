import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, ArrowRight, Lock, Mail, ShieldCheck, Heart } from 'lucide-react';
import Logo from '../components/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(email, password);
    if (!ok) {
      setError('Login fehlgeschlagen. Bitte Zugangsdaten prüfen.');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex font-sans overflow-hidden bg-white">
      
      {/* LEFT SIDE: Brand & Animation (Full Height) */}
      <div className="hidden md:flex relative w-1/2 bg-slate-900 text-white flex-col justify-between p-16 overflow-hidden">
        
        {/* Animated Background Layers */}
        <div className="absolute inset-0 z-0 overflow-hidden">
           {/* 1. Alive Gradient Background */}
           <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0c4a6e] to-[#0f172a] bg-[length:400%_400%] animate-gradient-xy"></div>
           
           {/* 2. Floating Orbs (Brighter & More Movement) */}
           <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-500 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob"></div>
           <div className="absolute top-[20%] right-[-20%] w-[400px] h-[400px] bg-indigo-500 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob animation-delay-2000"></div>
           <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>
           
           {/* 3. Subtle Grid / Tech Pattern */}
           <div className="absolute inset-0 opacity-[0.03]" 
                style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
           </div>
        </div>

        {/* Curved Separator */}
        <div className="absolute top-0 right-0 bottom-0 w-24 h-full z-10 translate-x-[1px]">
           <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full text-white fill-current drop-shadow-xl">
              <path d="M 100 0 L 0 0 C 50 40 40 60 0 100 L 100 100 Z" />
           </svg>
        </div>

        {/* Content Top */}
        <div className="relative z-20">
           <div className="flex items-center gap-4 mb-8 animate-fade-in-down">
             <Logo size={64} className="drop-shadow-xl" />
             <div className="flex flex-col">
               <span className="text-xl font-extrabold tracking-[0.2em] uppercase text-white drop-shadow">Navio AI</span>
               <span className="text-xs text-blue-100/80 tracking-[0.25em] uppercase">Logistics</span>
             </div>
           </div>
           
           <div className="space-y-6 animate-fade-in-up">
             <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white drop-shadow-lg">
               Die Zukunft der <br/>
               <span className="text-cyan-200">Tourenplanung.</span>
             </h1>
             <p className="text-blue-50 text-lg max-w-md leading-relaxed opacity-90 font-light border-l-2 border-cyan-400/40 pl-6">
               Automatisierte Logistik-Prozesse, KI-gestützte Optimierung und digitales Frachtmanagement für maximale Effizienz.
             </p>
           </div>
        </div>

        {/* Content Bottom */}
        <div className="relative z-20 animate-fade-in-up animation-delay-500">
           <div className="flex items-center gap-4 text-sm font-medium text-brand-200 bg-white/5 w-fit px-5 py-3 rounded-full backdrop-blur-sm border border-white/10 shadow-lg hover:bg-white/10 transition-colors cursor-default">
              <ShieldCheck size={18} className="text-cyan-400" />
              <span>Secure Enterprise Environment</span>
           </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form (Full Height) */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 relative bg-white">
        
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Willkommen zurück</h2>
            <p className="mt-2 text-slate-500">Bitte melden Sie sich an, um auf das Portal zuzugreifen.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Adresse</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <label className="text-sm font-medium text-slate-700">Passwort</label>
                 <a href="#" className="text-xs font-semibold text-brand-600 hover:text-brand-500">Vergessen?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-600">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-center gap-3 border border-red-100 animate-shake">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-500/30 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Anmelden
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </form>

          <div className="pt-6 text-center text-sm text-slate-500">
            Kein Account? <Link to="/signup" className="text-brand-600 font-semibold">Jetzt registrieren</Link>
          </div>

        </div>

        {/* Footer / Copyright */}
        <div className="absolute bottom-6 w-full text-center">
           <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
             Created with <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" /> by Benedikt Niewels
           </p>
        </div>

      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes gradient-xy {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-gradient-xy {
          animation: gradient-xy 15s ease infinite;
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  );
};

export default Login;
