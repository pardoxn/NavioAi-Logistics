import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, User, Calendar, Building2, ShieldCheck } from 'lucide-react';

const ORGANIZATION_NAME = 'werny';

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organization: '',
    fullName: '',
    email: '',
    password: '',
    birthdate: '',
    acceptTerms: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (form.organization.trim().toLowerCase() !== ORGANIZATION_NAME) {
      return 'Organisation muss "werny" sein.';
    }
    if (!form.fullName.trim()) return 'Bitte vollen Namen eintragen.';
    if (!form.email.trim()) return 'Bitte E-Mail eintragen.';
    if (!form.password.trim()) return 'Bitte Passwort setzen.';
    if (!form.birthdate.trim()) return 'Bitte Geburtsdatum eintragen.';
    if (!form.acceptTerms) return 'Bitte AGBs akzeptieren.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!supabase) {
      setError('Supabase ist nicht konfiguriert.');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          role: 'DISPO',
          fullName: form.fullName.trim(),
          birthdate: form.birthdate.trim(),
          organization: form.organization.trim(),
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess('Account erstellt. Bitte E-Mail bestätigen und danach anmelden.');
    setTimeout(() => navigate('/'), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-xl bg-white shadow-md rounded-2xl p-8 border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Account erstellen</h1>
            <p className="text-sm text-slate-500">Nur für Organisation "werny"</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1">
              <Building2 size={16} /> Organisation
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="werny"
              value={form.organization}
              onChange={(e) => updateField('organization', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1">
              <User size={16} /> Voller Name
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Vor- und Nachname"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1">
              <Mail size={16} /> E-Mail
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="email@werny.de"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1">
              <Lock size={16} /> Passwort
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1">
              <Calendar size={16} /> Geburtsdatum
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              value={form.birthdate}
              onChange={(e) => updateField('birthdate', e.target.value)}
              required
            />
          </div>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 text-brand-600 rounded border-slate-300"
              checked={form.acceptTerms}
              onChange={(e) => updateField('acceptTerms', e.target.checked)}
              required
            />
            <span>
              Ich habe die <Link className="text-brand-600 underline" to="/agb">AGB</Link> gelesen und akzeptiere sie.
            </span>
          </label>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>}
          {success && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold py-3.5 shadow-md shadow-brand-500/30 hover:from-brand-700 hover:to-brand-600 transition-all"
          >
            {loading ? 'Erstelle Account…' : 'Account erstellen'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Schon einen Account? <Link to="/" className="text-brand-600 font-semibold">Zum Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
