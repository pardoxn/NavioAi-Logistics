
import React, { useState, useMemo } from 'react';
import { Upload, CheckCircle, AlertTriangle, Plus, Keyboard, FileSpreadsheet, Trash2, ShieldAlert, X } from 'lucide-react';
import { parseCSV } from '../services/csvService';
import { useData } from '../context/DataContext';
import { Order } from '../types';
import { v4 as uuidv4 } from 'uuid';

const Import = () => {
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');
  
  // Context Data for Duplicate Checking
  const { addOrders, orders } = useData();

  // CSV State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(false);
  const [importStats, setImportStats] = useState({ new: 0, skipped: 0 });

  // Manual Entry State
  const [manualForm, setManualForm] = useState({
    customerName: '',
    postcode: '',
    city: '',
    weight: '',
    orderId: '',
    year: new Date().getFullYear().toString()
  });

  // --- Duplicate Logic ---
  // Check if an order already exists in the MAIN database (orders)
  const isDuplicate = (candidate: Order) => {
    return orders.some(existing => 
      existing.documentNumber === candidate.documentNumber && 
      existing.documentYear === candidate.documentYear
    );
  };

  // Check if duplicate within the PREVIEW itself (e.g. CSV contains same ID twice)
  const isDuplicateInPreview = (candidate: Order, currentIndex: number) => {
     return preview.findIndex((p, idx) => 
        idx < currentIndex && 
        p.documentNumber === candidate.documentNumber && 
        p.documentYear === candidate.documentYear
     ) !== -1;
  };

  // Memoized stats for the current preview
  const duplicateCount = useMemo(() => {
    return preview.filter(o => isDuplicate(o)).length;
  }, [preview, orders]);


  // --- CSV Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImported(false);
      setError('');
      setImportStats({ new: 0, skipped: 0 });
      
      parseCSV(e.target.files[0])
        .then(data => setPreview(data))
        .catch(err => setError('Fehler beim Lesen der CSV: ' + err.message));
    }
  };

  const removeDuplicatesFromPreview = () => {
    setPreview(prev => prev.filter(o => !isDuplicate(o)));
  };

  const confirmImport = () => {
    // Filter duplicates before adding
    const newOrders = preview.filter(o => !isDuplicate(o));
    const skippedCount = preview.length - newOrders.length;

    if (newOrders.length > 0) {
      addOrders(newOrders);
    }
    
    setImported(true);
    setImportStats({ new: newOrders.length, skipped: skippedCount });
    setPreview([]);
    setFile(null);
  };

  const removeFromPreview = (index: number) => {
    setPreview(prev => prev.filter((_, i) => i !== index));
  };

  // --- Manual Handlers ---
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.customerName || !manualForm.postcode || !manualForm.city || !manualForm.weight) {
      setError("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }

    const docNum = manualForm.orderId || 'MAN-' + Date.now().toString().slice(-4);
    const docYear = manualForm.year;

    // Check Duplicate for Manual Entry
    const isDup = orders.some(o => o.documentNumber === docNum && o.documentYear === docYear);
    if (isDup) {
      setError(`Auftrag mit Belegnummer ${docNum} (${docYear}) existiert bereits!`);
      return;
    }

    const newOrder: Order = {
      id: uuidv4(),
      orderId: docNum, // Fallback
      documentNumber: docNum,
      documentYear: docYear,
      documentType: 'Lieferschein (Manuell)',
      customerReferenceNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
      
      customerNumber: 'MANUAL',
      customerName1: manualForm.customerName,
      
      shippingCountryCode: 'DE',
      shippingCountryName: 'Deutschland',
      shippingPostcode: manualForm.postcode,
      shippingCity: manualForm.city,
      
      totalWeightKg: parseFloat(manualForm.weight.replace(',', '.')),
      
      isPlanned: false,
      bearing: 0,
      distanceFromDepot: 0
    };

    addOrders([newOrder]);
    setImported(true);
    setImportStats({ new: 1, skipped: 0 });

    // Reset form
    setManualForm({
      customerName: '',
      postcode: '',
      city: '',
      weight: '',
      orderId: '',
      year: new Date().getFullYear().toString()
    });
    setTimeout(() => setImported(false), 3000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Auftragseingang</h2>
      <p className="text-slate-500 mb-8">Importiere Lieferscheine via CSV oder erfasse Eilaufträge manuell.</p>
      
      {/* Tabs Pills */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-8 shadow-inner">
        <button 
          onClick={() => { setActiveTab('csv'); setImported(false); setError(''); }}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === 'csv' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileSpreadsheet size={16} /> CSV Import
        </button>
        <button 
          onClick={() => { setActiveTab('manual'); setImported(false); setError(''); }}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === 'manual' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Keyboard size={16} /> Manuelle Eingabe
        </button>
      </div>

      {imported && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 animate-fade-in-down shadow-sm">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <div>
               <p className="text-sm font-bold text-green-800">Import erfolgreich!</p>
               <p className="text-xs text-green-700 mt-0.5">
                 {importStats.new} neue Aufträge hinzugefügt. {importStats.skipped > 0 && <span>({importStats.skipped} Duplikate übersprungen)</span>}
               </p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-fade-in-down flex justify-between items-center shadow-sm">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
          <button onClick={() => setError('')}><X size={18} className="text-red-400 hover:text-red-600"/></button>
        </div>
      )}

      {/* CSV CONTENT */}
      {activeTab === 'csv' && (
        <div className="animate-fade-in-up">
          {/* File Dropzone */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 border-dashed mb-8 text-center hover:bg-slate-50 transition-colors group">
             <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload size={32} />
             </div>
             <label className="cursor-pointer">
                <span className="text-brand-600 font-semibold hover:text-brand-700 text-lg">Datei auswählen</span>
                <span className="text-slate-500 block mt-1">oder hierher ziehen</span>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  onClick={(e) => (e.target as HTMLInputElement).value = ''} // allow re-selecting same file
                />
             </label>
             <p className="text-xs text-slate-400 mt-4 font-mono">Unterstützt: Belegauskunft Verkauf (.csv)</p>
          </div>

          {preview.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              
              {/* Preview Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div>
                   <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <FileSpreadsheet size={18} className="text-slate-400"/>
                     Vorschau ({preview.length})
                   </h3>
                   {duplicateCount > 0 && (
                     <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle size={12}/> Achtung: {duplicateCount} Duplikate gefunden.
                     </p>
                   )}
                </div>
                
                <div className="flex gap-2">
                   {duplicateCount > 0 && (
                     <button
                       onClick={removeDuplicatesFromPreview}
                       className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-2"
                     >
                       <ShieldAlert size={14} />
                       Duplikate entfernen
                     </button>
                   )}
                   <button 
                    onClick={confirmImport}
                    className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95 transition-all text-sm"
                  >
                    <Upload size={16} />
                    {duplicateCount > 0 ? `Nur ${preview.length - duplicateCount} Neue importieren` : 'Import Bestätigen'}
                  </button>
                </div>
              </div>
              
              {/* Table */}
              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Beleg</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kunde</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">PLZ/Ort</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Gewicht</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {preview.map((row, index) => {
                        const isDup = isDuplicate(row);
                        const isTooHeavy = (row.totalWeightKg || 0) > 1300;
                        
                        return (
                          <tr 
                            key={index} 
                            className={`transition-colors group ${
                              isTooHeavy 
                                ? 'bg-red-50/60 hover:bg-red-100/60' 
                                : isDup 
                                  ? 'bg-amber-50/60 hover:bg-amber-100/50' 
                                  : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                               <div className="flex flex-col">
                                 <span className={`text-sm font-bold font-mono ${isDup ? 'text-amber-700' : 'text-slate-700'}`}>{row.documentNumber}</span>
                                 <span className="text-[10px] text-slate-400">{row.documentYear}</span>
                               </div>
                               {isDup && (
                                 <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 mt-1">
                                   Duplikat
                                 </span>
                               )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{row.customerName1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 flex items-center gap-2">
                               <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs font-mono font-bold">{row.shippingPostcode}</span>
                               {row.shippingCity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className={isTooHeavy ? 'text-red-700' : ''}>{row.totalWeightKg} kg</span>
                                {isTooHeavy && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                                    Zu schwer
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                               <button 
                                 onClick={() => removeFromPreview(index)}
                                 className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                 title="Aus Vorschau entfernen"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANUAL ENTRY CONTENT */}
      {activeTab === 'manual' && (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-3xl animate-fade-in-up">
          <form onSubmit={handleManualSubmit} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kunde / Empfänger *</label>
                  <input 
                    type="text" 
                    required
                    value={manualForm.customerName}
                    onChange={e => setManualForm({...manualForm, customerName: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white font-medium text-slate-900"
                    placeholder="Musterfirma GmbH"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">PLZ *</label>
                  <input 
                    type="text" 
                    required
                    value={manualForm.postcode}
                    onChange={e => setManualForm({...manualForm, postcode: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white text-slate-900"
                    placeholder="33181"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ort *</label>
                  <input 
                    type="text" 
                    required
                    value={manualForm.city}
                    onChange={e => setManualForm({...manualForm, city: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white text-slate-900"
                    placeholder="Bad Wünnenberg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gewicht (kg) *</label>
                  <input 
                    type="number" 
                    required
                    step="0.1"
                    value={manualForm.weight}
                    onChange={e => setManualForm({...manualForm, weight: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white text-slate-900"
                    placeholder="150"
                  />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Belegnummer & Jahr</label>
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={manualForm.orderId}
                        onChange={e => setManualForm({...manualForm, orderId: e.target.value})}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white text-slate-900"
                        placeholder="Nr (Optional)"
                      />
                      <input 
                        type="text" 
                        value={manualForm.year}
                        onChange={e => setManualForm({...manualForm, year: e.target.value})}
                        className="w-24 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white text-center text-slate-900"
                        placeholder="Jahr"
                      />
                   </div>
                </div>
             </div>

             <div className="pt-4">
               <button 
                 type="submit"
                 className="w-full md:w-auto bg-brand-600 text-white px-8 py-3 rounded-xl hover:bg-brand-700 font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 active:scale-95 transition-all"
               >
                 <Plus size={20} />
                 Auftrag anlegen
               </button>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Import;
