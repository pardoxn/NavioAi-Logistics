import React, { useEffect, useState } from 'react';
import { ArchiveTour } from './types';
import {
  Archive,
  Calendar,
  Camera,
  Check,
  FileText,
  ImageIcon,
  PackageCheck,
  Phone,
  Printer,
  RotateCcw,
  Search,
  Truck,
} from './Icons';
import { supabase } from '../../lib/supabaseClient';

export const ArchiveView: React.FC = () => {
  const [tours, setTours] = useState<ArchiveTour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [informedStops, setInformedStops] = useState<Set<string>>(new Set());
  const [localStopPhotos, setLocalStopPhotos] = useState<Record<string, string>>({});
  const [reactivating, setReactivating] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);

  useEffect(() => {
    const loadArchive = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('navio_state')
        .select('state')
        .eq('id', 'planning_v2_archive')
        .eq('org', 'werny')
        .single();
      if (error) {
        console.warn('Archive V2 laden fehlgeschlagen', error.message);
        return;
      }
      setTours((data?.state?.tours as ArchiveTour[]) || []);
    };
    loadArchive();
  }, []);

  const selectedTour = tours.find((t) => t.id === selectedTourId) || null;

  const filteredTours = tours.filter(
    (tour) =>
      tour.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.stops.some((stop) => stop.customerName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const serializeToPlanning = (tour: ArchiveTour) => ({
    id: tour.id,
    truckName: tour.id,
    date: tour.date,
    status: 'PLANNING',
    estimatedDistanceKm: typeof tour.totalDistance === 'string' ? Number(tour.totalDistance.replace(/[^\d.-]/g, '')) || 0 : 0,
    stops: tour.stops.map((s) => ({
      id: s.id,
      referenceNumber: s.orderNumber,
      customerName: s.customerName,
      address: [s.zip, s.city].filter(Boolean).join(' '),
      weightToUnload: s.weight,
      description: s.note,
    })),
  });

  const handleReactivate = async () => {
    if (!selectedTourId || !supabase) return;
    const tour = tours.find((t) => t.id === selectedTourId);
    if (!tour) return;

    setReactivating(true);
    try {
      const { data: planningData } = await supabase
        .from('navio_state')
        .select('state')
        .eq('id', 'planning_v2')
        .eq('org', 'werny')
        .single();
      const planningTours = (planningData?.state?.tours as any[]) || [];
      const updatedPlanning = [...planningTours, serializeToPlanning(tour)];

      await supabase.from('navio_state').upsert({
        id: 'planning_v2',
        org: 'werny',
        state: { tours: updatedPlanning },
      });

      const remainingArchive = tours.filter((t) => t.id !== tour.id);
      await supabase.from('navio_state').upsert({
        id: 'planning_v2_archive',
        org: 'werny',
        state: { tours: remainingArchive },
      });

      setTours(remainingArchive);
      setSelectedTourId(null);
      setInformedStops(new Set());
    } catch (err) {
      console.error('Reaktivieren fehlgeschlagen', err);
      alert('Reaktivieren fehlgeschlagen.');
    } finally {
      setReactivating(false);
    }
  };

  const handlePrint = () => {
    if (!selectedTour) return;
    setPrintBusy(true);
    try {
      window.print();
    } finally {
      setTimeout(() => setPrintBusy(false), 300);
    }
  };

  const toggleInformed = (stopId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newInformed = new Set(informedStops);
    if (newInformed.has(stopId)) {
      newInformed.delete(stopId);
    } else {
      newInformed.add(stopId);
    }
    setInformedStops(newInformed);
  };

  const handleAddPhoto = (stopId: string) => {
    const mockUrl =
      'https://images.unsplash.com/photo-1595246140625-573b715d11dc?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
    setLocalStopPhotos((prev) => ({
      ...prev,
      [stopId]: mockUrl,
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0 text-[13px] leading-5">
      {/* Left panel */}
      <div className="lg:col-span-4 w-full flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex-shrink-0 h-full min-h-0">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg font-bold text-slate-800">Archiv</h2>
          </div>
          <p className="text-xs text-slate-500">Verladene & abgeschlossene Touren.</p>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tour, Kunde oder PLZ suchen..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 bg-white">
          {filteredTours.map((tour) => (
            <div
              key={tour.id}
              onClick={() => setSelectedTourId(tour.id)}
              className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                selectedTourId === tour.id
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200 shadow-sm'
                  : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-green-100 text-green-700">
                    <PackageCheck size={16} />
                  </div>
                  <span className="font-bold text-gray-900">{tour.id}</span>
                </div>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">{tour.totalWeight} kg</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{tour.date}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                  <span>{tour.stops.length} Stopps</span>
                  <span>•</span>
                  <span>{tour.totalDistance}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredTours.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Archive size={40} className="mx-auto mb-2 opacity-20" />
              <p className="text-[13px]">Keine Touren gefunden.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden h-full min-h-0">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Archiv-Details</h2>
            <p className="text-xs text-slate-500 mt-1">{selectedTour ? 'Tourdaten & Protokoll' : 'Warte auf Auswahl...'}</p>
          </div>
        </div>

        {selectedTour ? (
          <>
            <div className="px-6 py-5 border-b border-slate-100 z-10 bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                    {selectedTour.id}
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 bg-green-50 text-green-700 ring-1 ring-green-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Abgeschlossen
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Archiviert am {selectedTour.date}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    disabled={printBusy}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-[13px] font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={16} />
                    <span>Drucken</span>
                  </button>
                  <button
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw size={16} />
                    <span>{reactivating ? 'Reaktiviert...' : 'Reaktivieren'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-[13px] text-gray-600 mt-4">
                <div className="flex items-center gap-2 min-w-fit">
                  <div className="p-1 bg-blue-100 text-blue-600 rounded">
                    <Truck size={14} />
                  </div>
                  <span className="font-medium text-gray-900">{selectedTour.stops.length} Stopps</span>
                </div>
                <div className="flex items-center gap-2 min-w-fit">
                  <div className="text-gray-400">~</div>
                  <span className="font-medium text-gray-900">{selectedTour.totalDistance}</span>
                </div>
                <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                  <span className="text-blue-500">Start:</span>
                  <span className="truncate" title={selectedTour.startLocation}>
                    {selectedTour.startLocation}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6 space-y-6 min-h-0">
              {selectedTour.loadingPhotoUrl ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
                      <Camera size={16} className="text-gray-400" />
                      Ladungsnachweis (Gesamt)
                    </h3>
                    <span className="text-xs text-gray-400">Aufgenommen bei Verladung</span>
                  </div>
                  <div className="relative h-48 w-full bg-gray-100">
                    <img src={selectedTour.loadingPhotoUrl} alt="Ladungsfoto" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer group">
                      <div className="opacity-0 group-hover:opacity-100 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs backdrop-blur-sm transition-opacity flex items-center gap-1.5">
                        <ImageIcon size={14} />
                        Vergrößern
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-gray-400 border-dashed">
                  <Camera size={20} className="opacity-50" />
                  <span className="text-[13px]">Kein Ladungsfoto für die gesamte Tour vorhanden.</span>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-[13px] font-bold text-gray-800 px-1">Lieferstopps & Status</h3>

                {selectedTour.stops.map((stop) => {
                  const isInformed = informedStops.has(stop.id);
                  const activePhotoUrl = localStopPhotos[stop.id] || stop.photoUrl;

                  return (
                    <div
                      key={stop.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-5 relative group hover:shadow-md transition-all duration-200"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${isInformed ? 'bg-green-500' : 'bg-gray-200 group-hover:bg-blue-500'}`}></div>

                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full font-bold text-[13px] flex items-center justify-center border transition-colors ${
                            isInformed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {isInformed ? <Check size={16} /> : stop.sequence}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-base font-bold text-gray-900 leading-tight">{stop.customerName}</h3>
                              <p className="text-gray-600 mt-1 text-[13px]">
                                {stop.zip} {stop.city}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div className="px-2.5 py-1 bg-gray-100 rounded-md text-[13px] font-semibold text-gray-700 border border-gray-200">
                                {stop.weight} kg
                              </div>

                              <button
                                onClick={(e) => toggleInformed(stop.id, e)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                  isInformed
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                                }`}
                              >
                                {isInformed ? (
                                  <>
                                    <Check size={12} />
                                    <span>Kunde informiert</span>
                                  </>
                                ) : (
                                  <>
                                    <Phone size={12} />
                                    <span>Kunde informieren</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center flex-wrap gap-4">
                            <div className="flex items-center gap-1.5 text-[13px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              <FileText size={14} className="text-blue-500" />
                              <span className="text-gray-400 text-xs">LS:</span>
                              <span className="font-mono font-medium text-gray-700">{stop.orderNumber}</span>
                            </div>

                            <button
                              onClick={() => !activePhotoUrl && handleAddPhoto(stop.id)}
                              className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded transition-colors ${
                                activePhotoUrl
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100 cursor-default'
                                  : 'text-gray-400 hover:text-gray-600 border border-transparent hover:border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {activePhotoUrl ? (
                                <>
                                  <ImageIcon size={14} />
                                  <span>Foto vorhanden</span>
                                </>
                              ) : (
                                <>
                                  <Camera size={14} />
                                  <span>Foto hinzufügen</span>
                                </>
                              )}
                            </button>
                          </div>

                          {activePhotoUrl && (
                            <div className="mt-3 relative group/photo w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                              <img src={activePhotoUrl} alt="Auftragsfoto" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-2 text-gray-400 py-4 opacity-60">
                <div className="h-px bg-gray-300 w-12"></div>
                <span className="text-xs uppercase tracking-wider font-semibold">Tour Ende</span>
                <div className="h-px bg-gray-300 w-12"></div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white text-center p-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <PackageCheck className="w-10 h-10 opacity-40" />
            </div>
            <p className="text-base font-semibold text-slate-600">Keine Tour ausgewählt</p>
            <p className="text-sm mt-2 max-w-xs mx-auto text-slate-500">Wählen Sie links eine Tour aus der Liste.</p>
          </div>
        )}
      </div>
    </div>
  );
};
