import React from 'react';
import { BookOpen, Play, MessageSquare, Package, Archive, FileText, Wand2, ShieldCheck } from 'lucide-react';

const sections = [
  {
    id: 'planung-v2',
    title: 'Tourenplanung V2 (Dispo/Admin)',
    body: (
      <div className="space-y-3 text-slate-700">
        <p className="text-slate-800 font-semibold">Ziel</p>
        <p>Aufträge importieren, in Touren bündeln und per KI oder manuell optimieren.</p>

        <p className="text-slate-800 font-semibold">Workflow</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>CSV importieren (Import-Button oben links) und Duplikate prüfen.</li>
          <li>Auftragsliste links: per Drag & Drop Stopps sortieren oder einer Tour zuordnen.</li>
          <li><strong>Touren planen</strong>: KI-gestützte Planung (Gemini) mit automatischem Retry/Fallback; Gewichtsgrenze 1.300 kg je Tour.</li>
          <li><strong>Touren optimieren</strong>: Wenn bereits Touren bestehen, kannst du sie mit der KI neu ordnen lassen.</li>
          <li>Gewichtsbalken je Tour zeigt Auslastung; Stopps sind nummeriert und per Drag & Drop umsortierbar.</li>
          <li><strong>Lock</strong>: Tour sperren, damit sie nicht mehr verändert wird. Gesperrte Touren werden gleichzeitig für das Lager sichtbar.</li>
          <li><strong>CMR/Maps</strong>: Direkt aus der Tour heraus CMR-PDF oder Maps-Link öffnen.</li>
          <li><strong>Feedback</strong>: Daumen hoch/runter pro Tour → Kommentar wird gespeichert (user_name inklusive).</li>
        </ol>

        <p className="text-slate-800 font-semibold">Hinweise</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Startpunkt ist immer Ostring 3, 33181 Bad Wünnenberg; KI sortiert Stopps ohne Zickzack.</li>
          <li>Lock bedeutet: Tour ist eingefroren und erscheint bei Lager-Mitarbeiter Patrick auf dem Handy.</li>
          <li>Über 1.300 kg pro Tour vermeiden (Gewichtsbalken und Badges warnen).</li>
        </ul>
      </div>
    )
  },
  {
    id: 'archiv-v2',
    title: 'Archiv V2 (Lager/Admin)',
    body: (
      <div className="space-y-3 text-slate-700">
        <p className="text-slate-800 font-semibold">Ziel</p>
        <p>Abgeschlossene oder gesperrte Touren einsehen, Reaktivieren/Drucken und Notizen prüfen.</p>

        <p className="text-slate-800 font-semibold">Funktionen</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Tour-Details: Stopps, Gewichte, Notizen, Feedback.</li>
          <li><strong>Drucken</strong>: CMR/PDF (falls Tour Druck unterstützt).</li>
          <li><strong>Reaktivieren</strong>: Tour zurück in die Planung schieben, um sie erneut zu bearbeiten.</li>
          <li>Filter/Suche nach Tournamen, Datum oder Status.</li>
        </ul>

        <p className="text-slate-800 font-semibold">Lager-Sicht</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Gesendete/gesperrte Touren aus der Planung erscheinen hier und auf dem Handy von Patrick.</li>
          <li>Notizen/Fotos (falls vorhanden) werden mitgeführt; Statusänderungen werden protokolliert.</li>
        </ul>
      </div>
    )
  }
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
                  {section.id === 'planung-v2' && <Play size={18} className="text-brand-600" />}
                  {section.id === 'archiv-v2' && <Archive size={18} className="text-amber-500" />}
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
