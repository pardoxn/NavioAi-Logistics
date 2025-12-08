
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { TourStatus, Tour, Order } from '../types';
import { Truck, Camera, CheckCircle2, AlertTriangle, Image as ImageIcon, MapPin, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ArchiveTour } from '../components/archiveV2/types';

type V2FormState = {
  file: File | null;
  previewUrl: string | null;
  isProcessing: boolean;
  done: boolean;
  note: string;
};

const defaultV2FormState: V2FormState = {
  file: null,
  previewUrl: null,
  isProcessing: false,
  done: false,
  note: '',
};

const serializePlanningTour = (tour: Tour) => ({
  id: tour.id,
  truckName: tour.name,
  date: tour.date,
  status: tour.status,
  estimatedDistanceKm: tour.estimatedDistanceKm,
  stops: (tour.stops || []).map((s) => ({
    id: s.id,
    referenceNumber: s.documentNumber,
    customerName: s.customerName1 || s.shippingCity,
    address: `${s.shippingPostcode} ${s.shippingCity}`.trim(),
    weightToUnload: s.totalWeightKg || 0,
  })),
});

const serializeArchiveTour = (tour: Tour, imageUrl: string | null, note: string): ArchiveTour => ({
  id: tour.id,
  date: tour.date,
  status: 'loaded',
  driver: tour.driverName,
  vehicle: tour.vehiclePlate,
  totalWeight: tour.totalWeight,
  totalDistance: tour.estimatedDistanceKm ? `${tour.estimatedDistanceKm} km` : '—',
  startLocation: 'Depot',
  loadingPhotoUrl: imageUrl || undefined,
  stops: tour.stops.map((s, idx) => ({
    id: s.id,
    customerName: s.customerName1 || s.shippingCity,
    zip: s.shippingPostcode,
    city: s.shippingCity,
    weight: s.totalWeightKg || 0,
    orderNumber: s.documentNumber,
    note: note || undefined,
    sequence: idx + 1,
  })),
});

interface WarehouseMobileV2CardProps {
  tour: Tour;
  formState: V2FormState;
  onFileChange: (file: File) => void;
  onSubmit: () => void;
  onNoteChange: (note: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const WarehouseMobileV2Card: React.FC<WarehouseMobileV2CardProps> = ({
  tour,
  formState,
  onFileChange,
  onSubmit,
  onNoteChange,
  isExpanded,
  onToggle,
}) => {
  const progress = tour.maxWeight
    ? Math.min((tour.totalWeight / tour.maxWeight) * 100, 100)
    : Math.min(tour.utilization || 0, 100);
  const isOverloaded = tour.maxWeight ? tour.totalWeight > tour.maxWeight : false;
  const isDone = formState.done || tour.status === TourStatus.LOADED;
  const dateLabel = tour.date
    ? new Date(tour.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const lockedLabel = tour.lockedAt
    ? new Date(tour.lockedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 border-b border-slate-100 flex items-start justify-between gap-3 active:bg-slate-50"
      >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Truck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <div className="text-lg font-bold text-slate-900 leading-tight">{tour.name}</div>
              <div className="text-sm text-slate-500">{tour.stops.length} Stopps</div>
              {dateLabel && <div className="text-xs text-slate-400 mt-0.5">{dateLabel}</div>}
              {lockedLabel && <div className="text-[11px] text-slate-500">Gesperrt am {lockedLabel}</div>}
            </div>
          </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
              isOverloaded ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}
          >
            {tour.totalWeight} kg
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden min-w-[120px]">
            <div className={`${isOverloaded ? 'bg-red-500' : 'bg-blue-500'} h-full`} style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-slate-500">{isExpanded ? 'Einklappen' : 'Ausklappen'}</span>
        </div>
      </button>

      {isExpanded && (
        <>
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

                <div>
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    Notiz (Optional)
                  </label>
                  <textarea
                    value={formState.note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    placeholder="Besonderheiten..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white text-slate-900"
                    rows={2}
                  />
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
        </>
      )}
    </div>
  );
};

interface WarehouseMobileV2ViewProps {
  tours: Tour[];
  forms: Record<string, V2FormState>;
  onFileChange: (tourId: string, file: File) => void;
  onSubmit: (tourId: string) => void;
  onNoteChange: (tourId: string, note: string) => void;
}

const WarehouseMobileV2View: React.FC<WarehouseMobileV2ViewProps> = ({ tours, forms, onFileChange, onSubmit, onNoteChange }) => {
  const activeTours = tours.filter((t) => t.status === TourStatus.LOCKED);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (activeTours.length === 0) {
    return (
      <div className="-mx-4 md:mx-0 bg-slate-100 p-6 rounded-2xl text-center text-slate-500">
        <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Truck className="w-10 h-10 opacity-30" />
        </div>
        <h3 className="text-lg font-semibold text-slate-600">Keine Touren in V2 geplant</h3>
        <p className="text-sm mt-2">Bitte erst in der Planung V2 aufbauen.</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 md:mx-0 bg-slate-100 pb-16 rounded-2xl">
      <div className="p-4 space-y-5 max-w-xl mx-auto">
        {activeTours.map((tour) => (
          <WarehouseMobileV2Card
            key={tour.id}
            tour={tour}
            formState={forms[tour.id] || defaultV2FormState}
            onFileChange={(file) => onFileChange(tour.id, file)}
            onSubmit={() => onSubmit(tour.id)}
            onNoteChange={(note) => onNoteChange(tour.id, note)}
            isExpanded={expandedId === tour.id}
            onToggle={() => setExpandedId(expandedId === tour.id ? null : tour.id)}
          />
        ))}
      </div>
    </div>
  );
};

const Warehouse = () => {
  const { completeTourLoading } = useData();
  const [v2Tours, setV2Tours] = useState<Tour[]>([]);
  const [archivedV2Tours, setArchivedV2Tours] = useState<ArchiveTour[]>([]);
  const [v2Forms, setV2Forms] = useState<Record<string, V2FormState>>({});

  const uploadV2Image = async (tourId: string, file: File): Promise<string | null> => {
    if (!supabase) return null;
    const filePath = `planning_v2/${tourId}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from('tour_uploads')
      .upload(filePath, file, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' });
    if (error) {
      console.warn('Upload failed', error.message);
      return null;
    }
    const { data: publicData } = supabase.storage.from('tour_uploads').getPublicUrl(filePath);
    return publicData?.publicUrl || null;
  };

  useEffect(() => {
    const mapRawToTour = (t: any): Tour => {
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
        date: t.date || new Date().toISOString().split('T')[0],
        status: t.status || (t.isLocked ? TourStatus.LOCKED : TourStatus.PLANNING),
        lockedAt: t.lockedAt,
        stops,
        totalWeight,
        maxWeight: 1300,
        utilization: Math.round((totalWeight / 1300) * 100),
        estimatedDistanceKm: t.estimatedDistanceKm || 0,
        vehiclePlate: t.truckName || '',
        loadedImageUrl: t.loadedImageUrl,
        loadedNote: t.loadedNote,
      };
    };

    const loadV2 = async () => {
      if (!supabase) return;
      const { data: activeData } = await supabase
        .from('navio_state')
        .select('state')
        .eq('id', 'planning_v2')
        .eq('org', 'werny')
        .single();
      const mapped = (activeData?.state?.tours || []).map(mapRawToTour);
      setV2Tours(mapped);

      const { data: archivedData } = await supabase
        .from('navio_state')
        .select('state')
        .eq('id', 'planning_v2_archive')
        .eq('org', 'werny')
        .single();
      const archivedMapped: ArchiveTour[] = (archivedData?.state?.tours || []) as ArchiveTour[];
      setArchivedV2Tours(archivedMapped);
    };
    loadV2();
  }, []);

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

  const handleV2NoteChange = (tourId: string, note: string) => {
    setV2Forms((prev) => ({
      ...prev,
      [tourId]: {
        ...defaultV2FormState,
        ...prev[tourId],
        note,
      },
    }));
  };

  const handleSetLoadedV2 = async (tourId: string) => {
    const form = getV2Form(tourId);
    if (!form.file) {
      alert('Ein Foto der Ladung ist Pflicht!');
      return;
    }

    setV2Forms((prev) => ({ ...prev, [tourId]: { ...form, isProcessing: true } }));

    try {
      const tour = v2Tours.find((t) => t.id === tourId);
      if (!tour) throw new Error('Tour nicht gefunden');

      const imageUrl = (await uploadV2Image(tourId, form.file)) || form.previewUrl || null;
      const archivedEntry = serializeArchiveTour(tour, imageUrl, form.note);
      const remainingTours = v2Tours.filter((t) => t.id !== tourId);

      if (supabase) {
        await supabase.from('navio_state').upsert({
          id: 'planning_v2',
          org: 'werny',
          state: { tours: remainingTours.map(serializePlanningTour) },
        });
        await supabase.from('navio_state').upsert({
          id: 'planning_v2_archive',
          org: 'werny',
          state: { tours: [...archivedV2Tours, archivedEntry] },
        });
      }

      setV2Tours(remainingTours);
      setArchivedV2Tours((prev) => [...prev, archivedEntry]);
      setV2Forms((prev) => ({ ...prev, [tourId]: { ...form, file: null, isProcessing: false, done: true } }));
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern.');
      setV2Forms((prev) => ({ ...prev, [tourId]: { ...form, isProcessing: false } }));
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen animate-fade-in">
      <div className="p-4 pb-24">
        <WarehouseMobileV2View
          tours={v2Tours}
          forms={v2Forms}
          onFileChange={handleV2ImageChange}
          onSubmit={handleSetLoadedV2}
          onNoteChange={handleV2NoteChange}
        />
      </div>
    </div>
  );
};

export default Warehouse;
