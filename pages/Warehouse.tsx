
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { TourStatus, Tour, Order } from '../types';
import { Package, Truck, CheckCircle, Box, ChevronDown, Camera, FileText, Globe, ThumbsUp, ArrowLeft, Calendar, CheckCircle2, AlertTriangle, Image as ImageIcon, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type WarehouseTab = 'classic' | 'v2';

type V2FormState = {
  file: File | null;
  previewUrl: string | null;
  isProcessing: boolean;
  done: boolean;
};

const defaultV2FormState: V2FormState = {
  file: null,
  previewUrl: null,
  isProcessing: false,
  done: false,
};

interface WarehouseMobileV2CardProps {
  tour: Tour;
  formState: V2FormState;
  onFileChange: (file: File) => void;
  onSubmit: () => void;
}

const WarehouseMobileV2Card: React.FC<WarehouseMobileV2CardProps> = ({ tour, formState, onFileChange, onSubmit }) => {
  const progress = tour.maxWeight
    ? Math.min((tour.totalWeight / tour.maxWeight) * 100, 100)
    : Math.min(tour.utilization || 0, 100);
  const isOverloaded = tour.maxWeight ? tour.totalWeight > tour.maxWeight : false;
  const isDone = formState.done || tour.status === TourStatus.LOADED;

  return (
    <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 leading-tight">{tour.name}</div>
              <div className="text-sm text-slate-500">{tour.stops.length} Stopps</div>
            </div>
          </div>
          <div
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
              isOverloaded ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}
          >
            {tour.totalWeight} kg
          </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
          <div className={`${isOverloaded ? 'bg-red-500' : 'bg-blue-500'} h-full`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {tour.stops.map((stop, idx) => (
          <div key={stop.id} className="p-4 flex gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-base leading-tight truncate">
                    {stop.customerName1 || stop.customerName2 || stop.shippingCity}
                  </div>
                  <div className="flex items-start gap-1.5 text-sm text-slate-500 mt-1 leading-snug">
                    <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <span className="break-words">{[stop.shippingPostcode, stop.shippingCity].filter(Boolean).join(' ')}</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 whitespace-nowrap">
                  {stop.totalWeightKg || 0} kg
                </span>
              </div>
              {stop.documentNumber && (
                <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                  <span className="uppercase font-semibold text-slate-400">Beleg</span>
                  <span className="font-mono text-xs text-slate-700">{stop.documentNumber}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-4">
        {isDone ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold">Tour verladen</p>
              <p className="text-xs text-emerald-700 opacity-80">Dokumentation gespeichert.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl border border-dashed border-slate-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Ladungssicherung dokumentieren
                </span>
                {!formState.previewUrl && (
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded font-medium">Foto erforderlich</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 items-stretch">
                <label
                  htmlFor={`camera-${tour.id}`}
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer border border-slate-200 transition-colors min-h-[96px]"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-bold">Kamera öffnen</span>
                </label>
                <div className="w-full bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                  {formState.previewUrl ? (
                    <img src={formState.previewUrl} alt="Ladung" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-slate-300" />
                  )}
                </div>
                <input
                  id={`camera-${tour.id}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileChange(file);
                  }}
                />
              </div>
            </div>

            <button
              onClick={onSubmit}
              disabled={!formState.previewUrl || formState.isProcessing}
              className={`w-full py-4 rounded-xl font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 ${
                formState.previewUrl
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {formState.isProcessing ? (
                'Speichere...'
              ) : formState.previewUrl ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Ladung bestätigen
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  Erst Foto machen
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

interface WarehouseMobileV2ViewProps {
  tours: Tour[];
  forms: Record<string, V2FormState>;
  onFileChange: (tourId: string, file: File) => void;
  onSubmit: (tourId: string) => void;
}

const WarehouseMobileV2View: React.FC<WarehouseMobileV2ViewProps> = ({ tours, forms, onFileChange, onSubmit }) => {
  const activeTours = tours.filter((t) => t.status === TourStatus.PLANNING || t.status === TourStatus.LOCKED);
  const currentDate = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (activeTours.length === 0) {
    return (
      <div className="-mx-4 md:mx-0 bg-slate-100 p-6 rounded-2xl text-center text-slate-500">
        <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Truck className="w-10 h-10 opacity-30" />
        </div>
        <h3 className="text-lg font-semibold text-slate-600">Keine Touren in V2 geplant</h3>
        <p className="text-sm mt-2">Bitte erst in der Planung V2 aufbauen.</p>
        <Link
          to="/planning-v2"
          className="inline-flex items-center justify-center gap-2 mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Zur Planung
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 md:mx-0 bg-slate-100 pb-16 rounded-2xl">
      <div className="bg-slate-900 text-white p-4 pt-5 pb-5 shadow-lg rounded-b-3xl sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-300" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-300">Lager</p>
              <h1 className="text-xl font-bold leading-tight">Geplant V2</h1>
            </div>
          </div>
          <Link
            to="/planning-v2"
            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Planung
          </Link>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Calendar className="w-4 h-4" />
          <span className="capitalize">{currentDate}</span>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-xl mx-auto">
        {activeTours.map((tour) => (
          <WarehouseMobileV2Card
            key={tour.id}
            tour={tour}
            formState={forms[tour.id] || defaultV2FormState}
            onFileChange={(file) => onFileChange(tour.id, file)}
            onSubmit={() => onSubmit(tour.id)}
          />
        ))}
      </div>
    </div>
  );
};

const Warehouse = () => {
  const { tours, completeTourLoading } = useData();
  const [v2Tours, setV2Tours] = useState<Tour[]>([]);
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WarehouseTab>('classic');
  const [v2Forms, setV2Forms] = useState<Record<string, V2FormState>>({});

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

  const activeClassicTours = tours.filter(t => t.status === TourStatus.LOCKED || t.status === TourStatus.PLANNING);
  const activeV2Tours = v2Tours.filter(t => t.status === TourStatus.LOCKED || t.status === TourStatus.PLANNING);

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

  const getV2Form = (tourId: string): V2FormState => v2Forms[tourId] || defaultV2FormState;

  const handleV2ImageChange = (tourId: string, file: File) => {
    setV2Forms((prev) => {
      const prevState = prev[tourId];
      if (prevState?.previewUrl && prevState.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prevState.previewUrl);
      }

      return {
        ...prev,
        [tourId]: {
          ...defaultV2FormState,
          ...prevState,
          file,
          previewUrl: URL.createObjectURL(file),
          done: false,
        },
      };
    });
  };

  const handleSetLoadedV2 = async (tourId: string) => {
    const form = getV2Form(tourId);
    if (!form.file) {
      alert('Ein Foto der Ladung ist Pflicht!');
      return;
    }

    setV2Forms((prev) => ({ ...prev, [tourId]: { ...form, isProcessing: true } }));

    try {
      await completeTourLoading(tourId, form.file, '');
      setV2Tours((prev) =>
        prev.map((t) =>
          t.id === tourId ? { ...t, status: TourStatus.LOADED, loadedImageUrl: form.previewUrl || t.loadedImageUrl } : t
        )
      );
      setV2Forms((prev) => ({ ...prev, [tourId]: { ...form, file: null, isProcessing: false, done: true } }));
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern.');
      setV2Forms((prev) => ({ ...prev, [tourId]: { ...form, isProcessing: false } }));
    }
  };

  const renderClassicContent = () => {
    if (activeClassicTours.length === 0) {
      return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-700">Alles erledigt!</h2>
          <p className="text-center mt-2 text-slate-500 max-w-xs">Im Moment gibt es keine offenen Touren zum Verladen.</p>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Verladung</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">
              Offene Touren: {activeClassicTours.length}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {activeClassicTours.map((tour) => {
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
                      <span
                        className={`flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 font-medium ${
                          isOverloaded ? 'text-red-600 bg-red-50 border-red-100' : ''
                        }`}
                      >
                        <Box size={14} className={isOverloaded ? 'text-red-500' : 'text-slate-400'} /> {tour.totalWeight} kg
                      </span>
                    </div>
                  </div>
                  <div
                    className={`text-slate-300 bg-slate-50 p-2 rounded-full transition-transform duration-300 ${
                      isExpanded ? 'rotate-180 bg-brand-50 text-brand-500' : ''
                    }`}
                  >
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
                                <div className="font-bold text-slate-800 text-sm">
                                  {stop.shippingPostcode} {stop.shippingCity}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">{stop.customerName1}</div>
                                <div className="text-[10px] text-slate-400 mt-1 font-mono bg-slate-50 w-fit px-1 rounded">
                                  LS: {stop.documentNumber}
                                </div>
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
                            <label
                              className={`flex-1 flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                                previewUrl ? 'border-green-300 bg-green-50' : 'border-brand-200 bg-brand-50 hover:bg-brand-100'
                              }`}
                            >
                              {previewUrl ? (
                                <CheckCircle size={24} className="text-green-500 mb-1" />
                              ) : (
                                <Camera size={24} className="mb-1 text-brand-400" />
                              )}
                              <span
                                className={`text-xs font-bold uppercase ${previewUrl ? 'text-green-600' : 'text-brand-600'}`}
                              >
                                {previewUrl ? 'Bild Ändern' : 'Kamera / Bild'}
                              </span>
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
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
                          {isProcessing ? (
                            'Speichere...'
                          ) : (
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
      </>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen animate-fade-in">
      <div className="p-4 pb-24">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
              activeTab === 'classic'
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/15'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
            onClick={() => setActiveTab('classic')}
          >
            <span>Geplant</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                activeTab === 'classic' ? 'border-white/30 bg-white/10' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {activeClassicTours.length}
            </span>
          </button>
          <button
            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
              activeTab === 'v2'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
            onClick={() => setActiveTab('v2')}
          >
            <span>Geplant V2</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                activeTab === 'v2' ? 'border-white/30 bg-white/10' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {activeV2Tours.length}
            </span>
          </button>
        </div>

        {activeTab === 'classic' ? (
          renderClassicContent()
        ) : (
          <WarehouseMobileV2View
            tours={v2Tours}
            forms={v2Forms}
            onFileChange={handleV2ImageChange}
            onSubmit={handleSetLoadedV2}
          />
        )}
      </div>
    </div>
  );
};

export default Warehouse;
