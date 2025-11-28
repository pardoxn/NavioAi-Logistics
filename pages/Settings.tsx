
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Save, Settings as SettingsIcon, Eye, EyeOff, Move } from 'lucide-react';
import { CmrConfig, CmrFieldConfig } from '../types';
import { generatePreviewURL } from '../services/pdfService';

const Settings = () => {
  const { cmrConfig, updateCmrConfig } = useData();
  
  // Local state for form
  const [config, setConfig] = useState<CmrConfig>(cmrConfig);
  const [saved, setSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Update local state when context changes (initial load)
  useEffect(() => {
    setConfig(cmrConfig);
  }, [cmrConfig]);

  // Generate Preview on change (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = generatePreviewURL(config);
      setPreviewUrl(url);
    }, 500); // 500ms debounce to prevent lag

    return () => clearTimeout(timer);
  }, [config]);

  const handleFieldChange = (key: keyof CmrConfig, field: keyof CmrFieldConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
    setSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCmrConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const renderFieldEditor = (key: string, field: CmrFieldConfig) => (
    <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-brand-300 transition-colors">
       <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-1">
          <label className="font-bold text-slate-700 text-sm">{field.label}</label>
          <button 
            type="button"
            onClick={() => handleFieldChange(key as keyof CmrConfig, 'visible', !field.visible)}
            className={`p-1.5 rounded-lg transition-colors ${field.visible ? 'text-brand-600 bg-brand-50' : 'text-slate-300 bg-slate-100 hover:bg-slate-200'}`}
            title={field.visible ? "Sichtbar" : "Versteckt"}
          >
            {field.visible ? <Eye size={16}/> : <EyeOff size={16}/>}
          </button>
       </div>
       
       <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
               <Move size={10}/> X (mm)
             </label>
             <input 
               type="number" 
               value={field.x}
               onChange={(e) => handleFieldChange(key as keyof CmrConfig, 'x', parseInt(e.target.value))}
               className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50 focus:bg-white text-slate-900"
             />
          </div>
          <div>
             <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
               <Move size={10} className="rotate-90"/> Y (mm)
             </label>
             <input 
               type="number" 
               value={field.y}
               onChange={(e) => handleFieldChange(key as keyof CmrConfig, 'y', parseInt(e.target.value))}
               className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50 focus:bg-white text-slate-900"
             />
          </div>
       </div>

       {/* Only show value input if it's a field that usually has static text */}
       {['sender', 'loadingPlace', 'packCount', 'packaging', 'goodsDesc', 'remarks', 'footerPlace', 'footerSignature'].includes(key) && (
         <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Standard-Text</label>
            <textarea 
              rows={key === 'sender' ? 3 : 1}
              value={field.value || ''}
              onChange={(e) => handleFieldChange(key as keyof CmrConfig, 'value', e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50 focus:bg-white text-slate-900 resize-none"
            />
         </div>
       )}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50 overflow-hidden">
      
      {/* LEFT COLUMN: EDITOR */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200">
        <div className="flex-none p-6 border-b border-slate-200 bg-white z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 shadow-sm">
                <SettingsIcon size={24} />
                </div>
                <div>
                <h2 className="text-2xl font-bold text-slate-900">CMR Editor</h2>
                <p className="text-sm text-slate-500">Layout & Standardwerte anpassen.</p>
                </div>
            </div>
            
            <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
                <Save size={18} /> Speichern
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
            {saved && (
                <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-sm mb-6 font-bold animate-fade-in-down">
                Einstellungen gespeichert!
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {Object.keys(config).map((key) => renderFieldEditor(key, config[key as keyof CmrConfig]))}
                </div>
            </form>
        </div>
      </div>

      {/* RIGHT COLUMN: PREVIEW */}
      <div className="hidden lg:block w-1/2 h-full bg-slate-200 p-8 flex-col">
         <div className="h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col">
            <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
               <span>Live Preview</span>
               <span className="text-slate-400">A4 PDF</span>
            </div>
            <div className="flex-1 bg-slate-500 relative">
               {previewUrl ? (
                 <embed 
                   src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                   type="application/pdf"
                   className="w-full h-full border-none"
                 />
               ) : (
                 <div className="flex items-center justify-center h-full text-white">Lade Vorschau...</div>
               )}
            </div>
         </div>
      </div>

    </div>
  );
};

export default Settings;
