import React, { useMemo, useState, useEffect } from 'react';
import { OrderInputV2 } from '../components/routemaster/OrderInputV2';
import { TourResultV2 } from '../components/routemaster/TourResultV2';
import { RMOrder, RMPlanningResult, RMTour, RMStop } from '../types/routemaster';
import { planToursV2 } from '../services/routemasterService';
import { useData } from '../context/DataContext';
import { generateCMRBundle } from '../services/pdfService';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { useRef } from 'react';

const PlanningV2: React.FC = () => {
  const { cmrConfig, orders: globalOrders, addOrders, removeOrders } = useData();
  const orders: RMOrder[] = useMemo(() => {
    return globalOrders
      .filter(o => !o.isPlanned)
      .map(o => ({
        id: o.id,
        customerName: o.customerName1 || 'Kunde',
        address: o.address || `${o.shippingStreet ? o.shippingStreet + ', ' : ''}${o.shippingPostcode || ''} ${o.shippingCity || ''}`.trim(),
        weight: Math.round(Number(o.totalWeightKg) || 0),
        referenceNumber: o.documentNumber || o.orderId || undefined,
      }));
  }, [globalOrders]);

  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const addRmOrders = (newOrders: RMOrder[]) => {
    if (!newOrders.length) return;
    const toAdd = newOrders.map(o => {
      const postcodeMatch = (o.address || '').match(/\b\d{4,5}\b/);
      const postcode = postcodeMatch ? postcodeMatch[0] : '';
      const rawCity = (o.address || '').replace(postcode, '').replace(',', '').trim();
      const city = rawCity && rawCity !== postcode ? rawCity : '';
      const street = o.address.includes(',') ? o.address.split(',')[0].trim() : '';
      const addressLine = `${street ? street + ', ' : ''}${postcode}${city ? ' ' + city : ''}`.trim();
      return {
        id: o.id || uuidv4(),
        orderId: o.referenceNumber || o.id || uuidv4(),
        documentNumber: o.referenceNumber || o.id || uuidv4(),
        documentYear: new Date().getFullYear().toString(),
        documentType: 'Tourenplanung V2',
        customerReferenceNumber: '',
        documentDate: new Date().toISOString().split('T')[0],
        customerNumber: 'RM',
        customerName1: o.customerName || 'Kunde',
        shippingCountryCode: 'DE',
        shippingCountryName: 'Deutschland',
        shippingPostcode: postcode,
        shippingCity: city,
        shippingStreet: street,
        totalWeightKg: o.weight,
        isPlanned: false,
        bearing: 0,
        distanceFromDepot: 0,
        // Preserve a display address for consistency
        address: addressLine,
        referenceNumber: o.referenceNumber
      } as any;
    });
    addOrders(toAdd as any);
  };
  const [results, setResults] = useState<RMPlanningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; tour?: RMTour; rating?: 'UP' | 'DOWN'; comment?: string }>({ open: false, comment: '' });
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => {
    const loadFeedback = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('tour_feedback')
        .select('rating,comment')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error || !data) {
        setFeedbackNotes('');
        return;
      }
      const notes = data.map((f: any) => `${f.rating === 'UP' ? '👍' : '👎'} ${f.comment || ''}`.trim()).join('\n');
      setFeedbackNotes(notes);
    };
    loadFeedback();
  }, []);
  const stateLoaded = useRef(false);

  // --- Persist V2 Tours global via Supabase ---
  useEffect(() => {
    const loadState = async () => {
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('navio_state')
            .select('state')
            .eq('id', 'planning_v2')
            .single();
          if (!error && data?.state?.tours) {
            setResults({ tours: data.state.tours });
            stateLoaded.current = true;
            return;
          }
        }
      } catch (e) {
          console.warn('V2 state load failed', e);
        }
      stateLoaded.current = true;
    };
    loadState();
  }, []);

  useEffect(() => {
    if (!stateLoaded.current) return;
    const payload = { tours: results?.tours || [] };
    // Save Supabase if available
    const save = async () => {
      if (!supabase) return;
      await supabase.from('navio_state').upsert({
        id: 'planning_v2',
        org: 'werny',
        state: payload,
        updated_at: new Date().toISOString(),
      });
    };
    save().catch((e) => console.warn('V2 state save failed', e));
  }, [results]);

  const handlePlanTours = async () => {
    const lockedTours = results?.tours.filter(t => t.isLocked) || [];
    const unlockedTours = results?.tours.filter(t => !t.isLocked) || [];
    
    const existingOrdersFromUnlockedTours: RMOrder[] = [];
    unlockedTours.forEach(tour => {
        tour.stops.forEach(stop => {
            existingOrdersFromUnlockedTours.push({
                id: crypto.randomUUID(),
                customerName: stop.customerName || 'Unbekannt',
                address: stop.address,
                weight: stop.weightToUnload,
                referenceNumber: stop.referenceNumber
            });
        });
    });

    const allOrdersToPlan = [...orders, ...existingOrdersFromUnlockedTours];
    if (allOrdersToPlan.length === 0 && lockedTours.length === 0) return;
    
    setLoading(true);
    setError(null);

    try {
      let newTours: RMTour[] = [];

      if (allOrdersToPlan.length > 0) {
        const data = await planToursV2(allOrdersToPlan, feedbackNotes);
        newTours = data.tours;
      }

      const finalTours = [...lockedTours, ...newTours];
      setResults({ tours: finalTours });
      // Remove geplante Orders aus globaler Liste, damit sie nicht doppelt auftauchen
      const usedIds = allOrdersToPlan.map(o => o.id).filter(Boolean) as string[];
      if (usedIds.length) removeOrders(usedIds);
    } catch (err: any) {
      setError(err?.message || "Fehler bei der Planung. Bitte überprüfen Sie Ihre Eingaben oder versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (results) {
      const restoredOrders: RMOrder[] = [];
      results.tours.forEach(tour => {
        tour.stops.forEach(stop => {
          restoredOrders.push({
            id: crypto.randomUUID(),
            customerName: stop.customerName || 'Unbekannt',
            address: stop.address,
            weight: stop.weightToUnload,
            referenceNumber: stop.referenceNumber
          });
        });
      });
      if (restoredOrders.length) addRmOrders(restoredOrders);
    }
    setResults(null);
    setError(null);
  };

  const handleToursUpdate = (updatedTours: RMTour[]) => {
    if (results) {
      setResults({
        ...results,
        tours: updatedTours
      });
    }
  };

  const handleToggleLock = (tourIndex: number) => {
    if (!results) return;
    
    const newTours = [...results.tours];
    newTours[tourIndex] = {
        ...newTours[tourIndex],
        isLocked: !newTours[tourIndex].isLocked
    };
    
    setResults({ ...results, tours: newTours });
  };

  const handleMoveOrderToTour = (orderId: string, targetTourIndex: number) => {
    if (!results) return;
    if (results.tours[targetTourIndex].isLocked) return;

    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newStop: RMStop = {
      stopNumber: 0,
      customerName: order.customerName,
      address: order.address,
      weightToUnload: order.weight,
      referenceNumber: order.referenceNumber,
      description: "Manuell hinzugefügt"
    };

    removeOrders([orderId]);

    const newTours = [...results.tours];
    const targetTour = newTours[targetTourIndex];
    targetTour.stops.push(newStop);
    
    targetTour.stops.forEach((s, idx) => s.stopNumber = idx + 1);
    targetTour.totalWeight = targetTour.stops.reduce((sum, s) => sum + s.weightToUnload, 0);

    setResults({ ...results, tours: newTours });
  };

  const handleRemoveOrderFromList = (orderId: string) => {
    removeOrders([orderId]);
  };

  const handleClearOrders = () => {
    if (!orders.length) return;
    const ids = orders.map(o => o.id);
    removeOrders(ids);
  };

  const handleMoveStopToTour = (sourceTourIndex: number, stopIndex: number, targetTourIndex: number) => {
    if (!results) return;
    if (sourceTourIndex === targetTourIndex) return;
    if (results.tours[sourceTourIndex].isLocked) return;
    if (results.tours[targetTourIndex].isLocked) return;

    const newTours = [...results.tours];
    const sourceTour = newTours[sourceTourIndex];
    const targetTour = newTours[targetTourIndex];

    const [movedStop] = sourceTour.stops.splice(stopIndex, 1);
    targetTour.stops.push(movedStop);

    [sourceTour, targetTour].forEach(tour => {
      tour.stops.forEach((s, idx) => s.stopNumber = idx + 1);
      tour.totalWeight = tour.stops.reduce((sum, s) => sum + s.weightToUnload, 0);
    });

    const cleanTours = newTours.filter(t => t.stops.length > 0);

    setResults({ ...results, tours: cleanTours });
  };

  const handleRemoveStop = (tourIndex: number, stopIndex: number, action: 'restore' | 'delete') => {
    if (!results) return;
    if (results.tours[tourIndex].isLocked) return;

    const newTours = [...results.tours];
    const sourceTour = newTours[tourIndex];
    
    const [removedStop] = sourceTour.stops.splice(stopIndex, 1);

    if (action === 'restore') {
      const restoredOrder: RMOrder = {
        id: crypto.randomUUID(),
        customerName: removedStop.customerName || 'Unbekannt',
        address: removedStop.address,
        weight: removedStop.weightToUnload,
        referenceNumber: removedStop.referenceNumber
      };
      addRmOrders([restoredOrder]);
    }

    sourceTour.stops.forEach((s, idx) => s.stopNumber = idx + 1);
    sourceTour.totalWeight = sourceTour.stops.reduce((sum, s) => sum + s.weightToUnload, 0);

    const cleanTours = newTours.filter(t => t.stops.length > 0);

    setResults({ ...results, tours: cleanTours });
  };

  const handlePrintCMR = (tour: RMTour) => {
    if (!cmrConfig) return;
    const mappedStops: any[] = tour.stops.map((s) => {
      const postcodeMatch = (s.address || '').match(/\b\d{4,5}\b/);
      const postcode = postcodeMatch ? postcodeMatch[0] : '';
      const city = (s.address || '').replace(postcode, '').trim();
      return {
        id: s.referenceNumber || s.address || s.stopNumber?.toString() || crypto.randomUUID(),
        customerName1: s.customerName || 'Kunde',
        shippingStreet: '',
        shippingPostcode: postcode,
        shippingCity: city || s.address,
        shippingCountryName: 'Deutschland',
        shippingCountryCode: 'DE',
        documentYear: new Date().getFullYear().toString(),
        documentNumber: s.referenceNumber || '',
        totalWeightKg: s.weightToUnload || 0,
      };
    });
    const mappedTour: any = {
      name: tour.truckName,
      vehiclePlate: tour.truckName,
    };
    generateCMRBundle(mappedTour as any, mappedStops as any, cmrConfig);
  };

  const submitFeedback = async (tour: RMTour, rating: 'UP' | 'DOWN', comment: string) => {
    try {
      if (!supabase) {
        setFeedbackToast({ message: 'Supabase nicht konfiguriert', type: 'error' });
        return;
      }
      const { error } = await supabase.from('tour_feedback').insert({
        tour_id: tour.id,
        rating,
        comment,
        source: 'planning_v2'
      });
      if (error) throw error;
      setFeedbackToast({ message: 'Feedback gespeichert, danke!', type: 'success' });
    } catch (e: any) {
      setFeedbackToast({ message: 'Feedback konnte nicht gespeichert werden', type: 'error' });
    } finally {
      setTimeout(() => setFeedbackToast(null), 3000);
    }
  };

  const handleOpenFeedback = (tour: RMTour, rating: 'UP' | 'DOWN') => {
    setFeedbackModal({ open: true, tour, rating, comment: '' });
  };

  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col overflow-hidden font-sans">
      <main className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8 w-full">
        {feedbackToast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${feedbackToast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {feedbackToast.message}
          </div>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
          
          <div className="xl:col-span-4 h-full flex flex-col min-h-0">
            <OrderInputV2 
              orders={orders} 
              onAddOrders={addRmOrders}
              onRemoveOrder={handleRemoveOrderFromList}
              onClearOrders={handleClearOrders}
              onPlan={handlePlanTours}
              onReset={handleReset}
              isLoading={loading}
              hasResults={!!results}
              error={error}
            />
          </div>

          <div className="xl:col-span-8 h-full flex flex-col min-h-0">
             <TourResultV2
                tours={results?.tours || []} 
                isLoading={loading} 
                onToursUpdate={handleToursUpdate}
                onMoveOrderToTour={handleMoveOrderToTour}
                onMoveStopToTour={handleMoveStopToTour}
                onRemoveStop={handleRemoveStop}
                onToggleLock={handleToggleLock}
                onPrintCMR={handlePrintCMR}
                onFeedback={handleOpenFeedback}
             />
          </div>

        </div>
      </main>
      {feedbackModal.open && feedbackModal.tour && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Feedback zu {feedbackModal.tour.truckName}</h3>
                <p className="text-xs text-slate-500">Hilf uns, die KI-Planung zu verbessern.</p>
              </div>
              <button onClick={() => setFeedbackModal({ open: false })} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                <span className="sr-only">Schließen</span>
                <span aria-hidden>×</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${feedbackModal.rating === 'UP' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {feedbackModal.rating === 'UP' ? '👍 Positiv' : '👎 Negativ'}
                </span>
                <span className="text-xs text-slate-500">Truck: {feedbackModal.tour.truckName}</span>
              </div>
              <textarea
                value={feedbackModal.comment}
                onChange={(e) => setFeedbackModal(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Was war gut/schlecht? (z.B. zu schwer, falsche Richtung, Stopp-Reihenfolge unlogisch, fehlender Kunde)"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200"
                rows={3}
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setFeedbackModal({ open: false })}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  if (feedbackModal.tour && feedbackModal.rating) {
                    submitFeedback(feedbackModal.tour, feedbackModal.rating, feedbackModal.comment || '');
                  }
                  setFeedbackModal({ open: false });
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Feedback senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningV2;
