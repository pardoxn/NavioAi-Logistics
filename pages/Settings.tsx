
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Save, Settings as SettingsIcon, Eye, EyeOff, Move, Copy, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { CmrConfig, CmrFieldConfig } from '../types';
import { generatePreviewURL } from '../services/pdfService';

const Settings = () => {
  const { cmrConfig, updateCmrConfig } = useData();
  
  // Local state for form
  const [config, setConfig] = useState<CmrConfig>(cmrConfig);
  const [saved, setSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bgLoading, setBgLoading] = useState(false);

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

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setConfig(prev => ({ ...prev, previewBackground: dataUrl }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  // If previewBackground is a URL (not data:), load and convert once
  useEffect(() => {
    const convertBg = async () => {
      if (!config.previewBackground || config.previewBackground.startsWith('data:')) return;
      try {
        setBgLoading(true);
        const res = await fetch(config.previewBackground);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setConfig(prev => ({ ...prev, previewBackground: dataUrl }));
          setBgLoading(false);
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.warn('Konnte Hintergrund nicht laden', e);
        setBgLoading(false);
      }
    };
    convertBg();
  }, [config.previewBackground]);

  const addCustomField = () => {
    const newField: CmrFieldConfig = {
      x: 10,
      y: 10,
      visible: true,
      label: 'Benutzerfeld',
      value: ''
    };
    setConfig(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField]
    }));
    setSaved(false);
  };

  const updateCustomField = (idx: number, field: Partial<CmrFieldConfig>) => {
    setConfig(prev => {
      const list = [...(prev.customFields || [])];
      list[idx] = { ...list[idx], ...field };
      return { ...prev, customFields: list };
    });
    setSaved(false);
  };

  const duplicateCustomField = (idx: number) => {
    setConfig(prev => {
      const list = [...(prev.customFields || [])];
      const copy = { ...list[idx], label: `${list[idx].label} (Kopie)` };
      list.splice(idx + 1, 0, copy);
      return { ...prev, customFields: list };
    });
    setSaved(false);
  };

  const removeCustomField = (idx: number) => {
    setConfig(prev => {
      const list = [...(prev.customFields || [])];
      list.splice(idx, 1);
      return { ...prev, customFields: list };
    });
    setSaved(false);
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

            <div className="flex flex-col gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Hintergrund für Editor</p>
                    <p className="text-xs text-slate-500">Wird nur in der Vorschau angezeigt, nicht beim Druck.</p>
                  </div>
                  <label className="px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer flex items-center gap-2">
                    <ImageIcon size={16}/> Datei wählen
                    <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload}/>
                  </label>
                </div>
                {config.previewBackground && (
                  <div className="text-xs text-slate-500">Vorschaubild gespeichert.</div>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {Object.keys(config)
                    .filter(key => !['customFields','previewBackground'].includes(key))
                    .map((key) => renderFieldEditor(key, config[key as keyof CmrConfig] as any))}
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-700">Benutzerfelder</p>
                      <button type="button" onClick={addCustomField} className="px-3 py-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-lg text-sm font-semibold flex items-center gap-2">
                        <Plus size={14}/> Feld hinzufügen
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(config.customFields || []).map((field, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e)=>updateCustomField(idx,{label:e.target.value})}
                              className="text-sm font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                              placeholder="Label"
                            />
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={()=>updateCustomField(idx,{visible:!field.visible})} className={`p-1 rounded ${field.visible ? 'text-brand-600 bg-brand-50' : 'text-slate-300 bg-slate-100'}`}>
                                {field.visible ? <Eye size={14}/> : <EyeOff size={14}/>}
                              </button>
                              <button type="button" onClick={()=>duplicateCustomField(idx)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                                <Copy size={14}/>
                              </button>
                              <button type="button" onClick={()=>removeCustomField(idx)} className="p-1 rounded text-red-500 hover:bg-red-50">
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                                <Move size={10}/> X (mm)
                              </label>
                              <input
                                type="number"
                                value={field.x}
                                onChange={(e)=>updateCustomField(idx,{x:parseInt(e.target.value)})}
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
                                onChange={(e)=>updateCustomField(idx,{y:parseInt(e.target.value)})}
                                className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50 focus:bg-white text-slate-900"
                              />
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={field.value || ''}
                            onChange={(e)=>updateCustomField(idx,{value:e.target.value})}
                            className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50 focus:bg-white text-slate-900 resize-none"
                            placeholder="Standard-Text"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
              </form>
            </div>
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
               {config.previewBackground && (
                 <div className="absolute inset-0">
                   <img src={config.previewBackground} alt="bg" className="w-full h-full object-contain opacity-70" />
                 </div>
               )}
               {previewUrl ? (
                 <embed 
                   src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                   type="application/pdf"
                   className="w-full h-full border-none relative"
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
