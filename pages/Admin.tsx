import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCog, RefreshCw, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ManagedUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  birthdate: string;
  organization: string;
  isBanned: boolean;
  lastSignIn?: string | null;
  createdAt?: string;
}

const Admin: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const txt = await res.text();
        try {
          const parsed = JSON.parse(txt);
          throw new Error(parsed.error || txt);
        } catch {
          throw new Error(txt || 'Unbekannter Fehler');
        }
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) {
      setError('Konnte Benutzer nicht laden: ' + (e.message || e.toString()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const updateUser = async (id: string, payload: Partial<{ role: string; ban: boolean }>) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!res.ok) {
        const txt = await res.text();
        try {
          const parsed = JSON.parse(txt);
          throw new Error(parsed.error || txt);
        } catch {
          throw new Error(txt || 'Unbekannter Fehler');
        }
      }
      await fetchUsers();
    } catch (e: any) {
      setError('Update fehlgeschlagen: ' + (e.message || e.toString()));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Keine Berechtigung.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Benutzerverwaltung</h2>
            <p className="text-slate-500 text-sm">Rollen ändern, sperren/entsperren (Admin only)</p>
          </div>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Aktualisieren
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 whitespace-pre-wrap">{error}</div>}

      <div className="overflow-x-auto bg-white border border-slate-100 rounded-2xl shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">E-Mail</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Rolle</th>
              <th className="text-left px-4 py-3">Org</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Letzter Login</th>
              <th className="text-left px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.fullName || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                  >
                    {Object.values(UserRole).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.organization || '—'}</td>
                <td className="px-4 py-3">
                  {u.isBanned ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-50 text-red-600 border border-red-100">Gesperrt</span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-50 text-green-600 border border-green-100">Aktiv</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {u.lastSignIn ? new Date(u.lastSignIn).toLocaleString('de-DE') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateUser(u.id, { ban: !u.isBanned })}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      {u.isBanned ? <Unlock size={14} /> : <Lock size={14} />}
                      {u.isBanned ? 'Entsperren' : 'Sperren'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
          <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-2">
            <UserCog size={20} />
            <span>Keine Benutzer gefunden.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
