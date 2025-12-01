import React from 'react';
import { BookOpen, Play, MessageSquare, Package, Archive, FileText, Wand2, ShieldCheck } from 'lucide-react';

const sections = [
  {
    id: 'einleitung',
    title: 'Einleitung & Ziel',
    body: (
      <>
        <p className="text-slate-700">
          Dieses Handbuch zeigt dir Schritt für Schritt, wie du Navio AI nutzt – vom Login bis zur KI-gestützten Tourenplanung.
        </p>
        <p className="text-slate-600 mt-2">
          Rollen: <strong>Admin</strong> (alle Rechte), <strong>Dispo</strong> (Planung), <strong>Lager</strong> (Team & Chat, Verladung, Archiv).
        </p>
      </>
    )
  },
  {
    id: 'start',
    title: 'Schnellstart',
    body: (
      <ol className="list-decimal list-inside space-y-2 text-slate-700">
        <li>Anmelden mit deiner E-Mail und deinem Passwort.</li>
        <li>Prüfe deine Rolle unten links im Sidebar-Profil.</li>
        <li>Dispo/Admin: Öffne <strong>Tourenplanung</strong>, importiere CSVs und nutze <strong>Auto-Plan</strong> oder Benni.</li>
        <li>Lager: Öffne <strong>Verladung</strong> und <strong>Archiv</strong>, um Tourenstatus zu sehen und zu quittieren.</li>
        <li>Team & Chat: Tausche Nachrichten und Aufgaben in Echtzeit aus.</li>
      </ol>
    )
  },
  {
    id: 'login',
    title: 'Login & Session',
    body: (
      <ul className="list-disc list-inside space-y-2 text-slate-700">
        <li>Login: E-Mail + Passwort; Sessions bleiben auch nach Refresh erhalten.</li>
        <li>Passwort vergessen? Admin kann Nutzer in Supabase aktivieren oder ein neues Passwort setzen.</li>
        <li>Rollenwechsel erfolgt über Supabase (user_metadata.role) – danach neu anmelden.</li>
      </ul>
    )
  },
  {
    id: 'dashboard',
    title: 'Dashboard (Admin/Dispo)',
    body: (
      <p className="text-slate-700">
        Überblick über Aufträge, Tourenstatus und letzte Aktivitäten. Nutze die Kacheln, um direkt in Planung, Team oder Archiv zu springen.
      </p>
    )
  },
  {
    id: 'team',
    title: 'Team & Chat',
    body: (
      <div className="space-y-2 text-slate-700">
        <p>Realtime-Chat und Aufgaben (inkl. Zuweisung):</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Nachricht schreiben oder als Aufgabe markieren (Checkbox unten).</li>
          <li>Optional Empfänger auswählen, um Aufgaben gezielt zuzustellen.</li>
          <li>Mobile: Eingabefeld bleibt am unteren Rand fixiert; scrollen für Verlauf.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'planung',
    title: 'Tourenplanung (Dispo/Admin)',
    body: (
      <div className="space-y-2 text-slate-700">
        <p>Workflow:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>CSV importieren (Import CSV).</li>
          <li>Im <strong>Pool</strong> filtern/suchen, Aufträge per Drag & Drop zu Touren ziehen.</li>
          <li><strong>Auto-Plan</strong> nutzt Heuristiken für 1.3t/3.0t Fahrzeuge.</li>
          <li><strong>Benni (KI)</strong> fragen (Text oder Quick-Prompts); optional Auto-Plan anstoßen.</li>
          <li>Status pro Tour: offen/gesperrt, Gewicht, Stops; Karten-Button für Karte.</li>
          <li>Feedback: Daumen hoch/runter → Kommentar → speichert in <code>tour_feedback</code>, wird in KI-Kontext genutzt.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'verladung',
    title: 'Verladung (Lager/Admin)',
    body: (
      <ul className="list-disc list-inside space-y-1 text-slate-700">
        <li>Touren einsehen, Status aktualisieren, Notizen/Bilder hinterlegen (falls aktiviert).</li>
        <li>Nur für Lager sichtbar: Team & Chat, Verladung, Archiv.</li>
      </ul>
    )
  },
  {
    id: 'archiv',
    title: 'Archiv & Aktivitäten',
    body: (
      <p className="text-slate-700">
        Abgeschlossene Touren und Audit-Events. Nutze Filter, um schnell vergangene Touren oder Logs zu finden.
      </p>
    )
  },
  {
    id: 'cmr',
    title: 'CMR Editor & PDF',
    body: (
      <div className="space-y-2 text-slate-700">
        <ul className="list-disc list-inside space-y-1">
          <li>Hintergrund-Muster hochladen (PNG/JPG); dient nur der Ausrichtung im Editor.</li>
          <li>Felder manuell hinzufügen oder duplizieren; Position in mm im Editor setzen.</li>
          <li>In Tourenplanung → CMR Button: erzeugt pro Auftrag eine eigene Seite (Bundle-PDF).</li>
        </ul>
      </div>
    )
  },
  {
    id: 'benni',
    title: 'Benni KI-Assistent',
    body: (
      <ul className="list-disc list-inside space-y-1 text-slate-700">
        <li>Quick-Prompts nutzen oder frei schreiben.</li>
        <li>Antworten enthalten Vorschläge; bei Planungs-Intent kannst du direkt Auto-Plan auslösen.</li>
        <li>Feedback aus <code>tour_feedback</code> fließt in die KI-Kontextnotizen ein.</li>
      </ul>
    )
  },
  {
    id: 'feedback',
    title: 'Feedback & Lernen',
    body: (
      <ul className="list-disc list-inside space-y-1 text-slate-700">
        <li>Daumen hoch/runter an der Tour → Kommentar → Speicherung in Supabase <code>tour_feedback</code>.</li>
        <li>Admins können Feedback im Supabase Table Editor ansehen/exportieren.</li>
        <li>Benni liest die letzten Einträge und passt Empfehlungen an.</li>
      </ul>
    )
  },
  {
    id: 'rollen',
    title: 'Rollen & Berechtigungen',
    body: (
      <ul className="list-disc list-inside space-y-1 text-slate-700">
        <li><strong>Admin</strong>: alle Tabs inkl. Benutzer, Einstellungen.</li>
        <li><strong>Dispo</strong>: Dashboard, Import, Planung, Team & Chat, Archiv, Aktivitäten.</li>
        <li><strong>Lager</strong>: Team & Chat, Verladung, Archiv.</li>
      </ul>
    )
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    body: (
      <ul className="list-disc list-inside space-y-1 text-slate-700">
        <li>Leere Seiten / 404: Prüfe Vercel-Domain, Env Vars (Supabase URL/Keys, Gemini Key).</li>
        <li>Chat ohne Daten: RLS-Policies für <code>chat_messages</code> prüfen (auth.role() = authenticated).</li>
        <li>Feedback-Insert-Fehler: Spalten in <code>tour_feedback</code> (id uuid, created_at timestamptz, tour_id, rating, comment, user_name) prüfen.</li>
        <li>CMR-Hintergrund weiß: Datei in <code>public/</code> vorhanden und in Einstellungen neu laden.</li>
      </ul>
    )
  },
];

const Handbook: React.FC = () => {
  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Navio AI Handbuch</h1>
            <p className="text-slate-600 text-sm">Schneller Einstieg, Workflows und KI-Features im Überblick.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-fit sticky top-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Inhaltsverzeichnis</h3>
            <div className="space-y-2 text-sm">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleJump(s.id)}
                  className="w-full text-left text-slate-600 hover:text-brand-600 transition-colors"
                >
                  • {s.title}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm scroll-mt-16"
              >
                <div className="flex items-center gap-2 mb-2">
                  {section.id === 'planung' && <Play size={18} className="text-brand-600" />}
                  {section.id === 'team' && <MessageSquare size={18} className="text-pink-500" />}
                  {section.id === 'verladung' && <Package size={18} className="text-green-500" />}
                  {section.id === 'archiv' && <Archive size={18} className="text-amber-500" />}
                  {section.id === 'cmr' && <FileText size={18} className="text-blue-500" />}
                  {section.id === 'benni' && <Wand2 size={18} className="text-purple-500" />}
                  {section.id === 'rollen' && <ShieldCheck size={18} className="text-slate-500" />}
                  <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                </div>
                <div className="text-sm leading-relaxed">{section.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Handbook;
