
import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { TourStatus, Tour, Order } from '../types';
import { Package, Truck, CheckCircle, Box, ChevronDown, Camera, FileText, Globe, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Warehouse = () => {
  const { tours, completeTourLoading } = useData();
  const [v2Tours, setV2Tours] = useState<Tour[]>([]);
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadV2 = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('navio_state')
        .select('state')
        .eq('id', 'planning_v2')
        .eq('org', 'werny')
        .single();
      if (error || !data?.state?.tours) return;
      const mapped: Tour[] = (data.state.tours as any[]).map((t: any) => {
        const stops: Order[] = (t.stops || []).map((s: any) => {
          const postcodeMatch = (s.address || '').match(/\b\d{4,5}\b/);
          const postcode = postcodeMatch ? postcodeMatch[0] : '';
          const city = (s.address || '').replace(postcode, '').trim();
          return {
            id: s.id || s.referenceNumber || crypto.randomUUID(),
            orderId: s.referenceNumber || s.id || '',
            documentNumber: s.referenceNumber || s.id || '',
            documentYear: new Date().getFullYear().toString(),
            documentType: 'Tourenplanung V2',
            customerReferenceNumber: '',
            documentDate: new Date().toISOString().split('T')[0],
            customerNumber: 'RM',
            customerName1: s.customerName || 'Kunde',
            shippingCountryCode: 'DE',
            shippingCountryName: 'Deutschland',
            shippingPostcode: postcode,
            shippingCity: city || s.address || '',
            shippingStreet: '',
            totalWeightKg: s.weightToUnload || 0,
            isPlanned: true,
            bearing: 0,
            distanceFromDepot: 0,
          };
        });
        const totalWeight = stops.reduce((sum, s) => sum + (s.totalWeightKg || 0), 0);
        return {
          id: t.id || crypto.randomUUID(),
          name: t.truckName || 'Tour V2',
          date: new Date().toISOString().split('T')[0],
          status: TourStatus.PLANNING,
          stops,
          totalWeight,
          maxWeight: 1300,
          utilization: Math.round((totalWeight / 1300) * 100),
          estimatedDistanceKm: 0,
          vehiclePlate: t.truckName || '',
        };
      });
      setV2Tours(mapped);
    };
    loadV2();
  }, []);

  // Filter relevant tours (native + V2)
  const allTours = [...tours, ...v2Tours];
  const activeTours = allTours.filter(t => t.status === TourStatus.LOCKED || t.status === TourStatus.PLANNING);

  const toggleExpand = (id: string) => {
    if (expandedTourId === id) {
      setExpandedTourId(null);
      resetForm();
    } else {
      setExpandedTourId(id);
      resetForm();
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setNote('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetLoaded = async (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    
    if (!selectedFile) {
      alert("Ein Foto der Ladung ist Pflicht!");
      return;
    }

    setIsProcessing(true);
    
    try {
        await completeTourLoading(tourId, selectedFile, note);
        // Success
        setExpandedTourId(null);
        resetForm();
    } catch (err) {
        console.error(err);
        alert("Fehler beim Speichern.");
    } finally {
        setIsProcessing(false);
    }
  };

  if (activeTours.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-slate-400 animate-fade-in">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
           <Package className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Alles erledigt!</h2>
        <p className="text-center mt-2 text-slate-500 max-w-xs">Im Moment gibt es keine offenen Touren zum Verladen.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 bg-slate-50 min-h-screen animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verladung</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Offene Touren: {activeTours.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {activeTours.map((tour) => {
          const isExpanded = expandedTourId === tour.id;
          const isOverloaded = tour.totalWeight > tour.maxWeight;

          return (
            <div 
              key={tour.id} 
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
                isExpanded ? 'border-brand-500 ring-1 ring-brand-500 shadow-xl' : 'border-slate-200'
              }`}
            >
              <div 
                className="p-5 flex items-center justify-between active:bg-slate-50 cursor-pointer"
                onClick={() => toggleExpand(tour.id)}
              >
                <div className="flex-1">
                  <div className="flex flex-col items-start gap-1 mb-2">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-slate-800">{tour.name}</span>
                        {tour.status === TourStatus.LOCKED && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-sm">
                            Bereit
                        </span>
                        )}
                        {tour.status === TourStatus.PLANNING && (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                            Planung
                        </span>
                        )}
                    </div>
                    
                    {/* FREIGHT STATUS BADGES FOR WAREHOUSE */}
                    {tour.freightStatus === 'OFFERED' && (
                       <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-200">
                          <Globe size={10} /> Angeboten bei Timocom
                       </span>
                    )}
                    {tour.freightStatus === 'CONFIRMED' && (
                       <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200 animate-pulse">
                          <ThumbsUp size={10} /> Fahrer kommt / Bestätigt
                       </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      <Truck size={14} className="text-slate-400" /> {tour.stops.length} Stopps
                    </span>
                    <span className={`flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 font-medium ${isOverloaded ? 'text-red-600 bg-red-50 border-red-100' : ''}`}>
                      <Box size={14} className={isOverloaded ? "text-red-500" : "text-slate-400"} /> {tour.totalWeight} kg
                    </span>
                  </div>
                </div>
                <div className={`text-slate-300 bg-slate-50 p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-brand-50 text-brand-500' : ''}`}>
                  <ChevronDown size={24} />
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 cursor-default animate-fade-in">
                  <div className="p-5 space-y-6">
                    <div className="relative">
                      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
                      {tour.stops.map((stop) => (
                        <div key={stop.id} className="relative pl-12 mb-4 last:mb-0">
                          <div className="absolute left-[15px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-400 z-10 shadow-sm"></div>
                          <div className="flex justify-between items-start bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                             <div>
                               <div className="font-bold text-slate-800 text-sm">{stop.shippingPostcode} {stop.shippingCity}</div>
                               <div className="text-xs text-slate-500 font-medium">{stop.customerName1}</div>
                               <div className="text-[10px] text-slate-400 mt-1 font-mono bg-slate-50 w-fit px-1 rounded">LS: {stop.documentNumber}</div>
                             </div>
                             <div className="text-xs font-bold font-mono bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-slate-600">
                               {stop.totalWeightKg}kg
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-slate-200/60 space-y-5">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Camera size={14} /> Foto der Ladung (Pflicht)
                        </label>
                        <div className="flex items-center gap-4">
                          <label className={`flex-1 flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                            previewUrl ? 'border-green-300 bg-green-50' : 'border-brand-200 bg-brand-50 hover:bg-brand-100'
                          }`}>
                              {previewUrl ? (
                                 <CheckCircle size={24} className="text-green-500 mb-1" />
                              ) : (
                                 <Camera size={24} className="mb-1 text-brand-400" />
                              )}
                              <span className={`text-xs font-bold uppercase ${previewUrl ? 'text-green-600' : 'text-brand-600'}`}>
                                {previewUrl ? 'Bild Ändern' : 'Kamera / Bild'}
                              </span>
                              <input type='file' accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                          </label>
                          
                          {previewUrl && (
                            <div className="h-24 w-24 relative rounded-xl overflow-hidden border-2 border-white shadow-md">
                              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <FileText size={14} /> Notiz (Optional)
                        </label>
                        <textarea 
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Besonderheiten..."
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white text-slate-900"
                          rows={2}
                        />
                      </div>

                      <button 
                        onClick={(e) => handleSetLoaded(e, tour.id)}
                        disabled={!selectedFile || isProcessing}
                        className={`w-full font-bold py-4 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                          selectedFile 
                            ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-green-500/30' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {isProcessing ? 'Speichere...' : (
                          <>
                            <CheckCircle size={20} />
                            Tour Abschließen
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Warehouse;
