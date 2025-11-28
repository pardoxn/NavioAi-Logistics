import React from 'react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="text-slate-600 leading-relaxed">
          Diese AGB regeln die Nutzung der Navio AI Logistics Console durch berechtigte Nutzer der Organisation
          &quot;werny&quot;. Mit Erstellung eines Accounts und Nutzung der Anwendung erkennen Sie diese Bedingungen an.
        </p>
        <ol className="list-decimal list-inside space-y-3 text-slate-700">
          <li><strong>Zugriff:</strong> Der Zugang ist ausschließlich für autorisierte Mitarbeitende der Organisation werny.</li>
          <li><strong>Datenschutz:</strong> Personenbezogene Daten werden ausschließlich zur Bereitstellung der Anwendung verarbeitet.</li>
          <li><strong>Sicherheit:</strong> Zugangsdaten sind vertraulich zu behandeln; Weitergabe an Dritte ist untersagt.</li>
          <li><strong>Verfügbarkeit:</strong> Es besteht kein Anspruch auf dauerhafte Verfügbarkeit oder bestimmte Performance.</li>
          <li><strong>Haftung:</strong> Nutzung erfolgt auf eigenes Risiko; es wird keine Haftung für Schäden aus der Nutzung übernommen.</li>
          <li><strong>Änderungen:</strong> Die AGB können angepasst werden; Änderungen werden in der App kommuniziert.</li>
        </ol>
        <p className="text-slate-600">Stand: {new Date().toLocaleDateString('de-DE')}</p>
      </div>
    </div>
  );
};

export default Terms;
