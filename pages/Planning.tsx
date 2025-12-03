
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { optimizeTours } from '../services/optimizerService';
import { generateCMRBundle } from '../services/pdfService';
import { TourStatus, Order, Tour, FreightStatus } from '../types';
import { Map, Truck, Lock, Unlock, FileText, Play, AlertTriangle, MapPin, Layers, Calculator, Trash2, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, X, Search, Filter, CheckCircle2, Pencil, Download, Navigation, Copy, RefreshCw, CheckSquare, Square, ThumbsUp, Globe, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import TourMap from '../components/TourMap';
import { useLocation } from 'react-router-dom';
import { getOptimizationAdvice, askBenni } from '../services/geminiService';
import { supabase } from '../lib/supabaseClient';
import { ThumbsDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Planning = () => {
  const { user, isLager } = useAuth();
  const { orders, tours, setTours, updateTourStatus, setTourFreightStatus, updateOrderPlannedStatus, addTour, deleteTour, deleteTourAndOrders, dissolveAllTours, removeOrder, removeOrders, moveOrderToTour, moveOrderToPool, reorderTourStops, updateOrder, cmrConfig } = useData();
  const location = useLocation(); // Hook to get navigation state
  
  // Settings & Filter State
  const [activeTab, setActiveTab] = useState<'pool' | 'tours'>('pool');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState<number>(1300);

  // Manual Mode State
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'TOUR' | 'ORDER' | 'ALL_TOURS' | 'BULK_ORDERS', id: string } | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showMapTour, setShowMapTour] = useState<Tour | null>(null);

  // Bulk Selection State
  const [selectedPoolItems, setSelectedPoolItems] = useState<Set<string>>(new Set());

  // HIGHLIGHT STATE (for Notifications)
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [benniOpen, setBenniOpen] = useState(true);
  const [benniInput, setBenniInput] = useState('');
  const [benniReply, setBenniReply] = useState<string>('');
  const [benniLoading, setBenniLoading] = useState(false);
  const [benniActionPending, setBenniActionPending] = useState(false);
  const [benniIntent, setBenniIntent] = useState<'auto' | 'replan' | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; tourId?: string; rating?: 'UP' | 'DOWN'; comment?: string }>({ open: false, comment: '' });

  // Check for highlight requests from navigation
  useEffect(() => {
    if (location.state && location.state.highlightIds) {
        setHighlightIds(location.state.highlightIds);
        setActiveTab('tours'); // Force switch to tours tab
        // Remove highlight after 3 seconds
        const timer = setTimeout(() => setHighlightIds([]), 3000);
        return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Load latest feedback (summary string)
  useEffect(() => {
    const loadFeedback = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('tour_feedback')
        .select('rating,comment')
        .order('created_at', { ascending: false });
      if (error || !data) {
        setFeedbackNotes('');
        return;
      }
      const notes = data.map((f: any) => `${f.rating === 'UP' ? '👍' : '👎'} ${f.comment || ''}`.trim()).join('\n');
      setFeedbackNotes(notes);
    };
    loadFeedback();
  }, []);

  const handleAskBenni = async () => {
    if (!benniInput.trim()) return;
    setBenniLoading(true);
    setBenniReply('');
    setBenniActionPending(false);
    setBenniIntent(null);
    try {
      const reply = await askBenni(benniInput, allUnplannedOrders, feedbackNotes, tours);
      setBenniReply(reply || 'Keine Antwort erhalten.');
      const lower = benniInput.toLowerCase();
      if (lower.includes('replan') || lower.includes('neu') || lower.includes('umbau')) {
        setBenniActionPending(true);
        setBenniIntent('replan');
      } else if (lower.includes('plan') || lower.includes('tour') || lower.includes('auto')) {
        setBenniActionPending(true);
        setBenniIntent('auto');
      } else {
        setBenniIntent(null);
      }
    } catch (e: any) {
      setBenniReply('Benni hat gerade ein Problem.');
    } finally {
      setBenniLoading(false);
    }
  };

  const handleBenniAutoPlan = () => {
    handleAutoPlan();
    setBenniActionPending(false);
    setBenniIntent(null);
  };

  const handleBenniReplanAll = () => {
    // Replant alle nicht-gesperrten Touren + Pool, lässt LOCKED stehen
    const unlockedTours = tours.filter(t => t.status !== TourStatus.LOCKED);
    const lockedTours = tours.filter(t => t.status === TourStatus.LOCKED);
    const unlockedIds = unlockedTours.flatMap(t => t.stops.map(s => s.id));

    // Pool sind alle ungeplanten plus die aus entsperrten Touren
    const replanPool = orders.filter(o => !o.isPlanned || unlockedIds.includes(o.id));
    if (replanPool.length === 0) {
      setBenniReply('Keine offenen Aufträge zum Neuplanen gefunden.');
      return;
    }

    // Reset: entsperrte Touren raus, Locked bleiben erhalten
    setTours(lockedTours);
    if (unlockedIds.length) updateOrderPlannedStatus(unlockedIds, false);

    const newTours = optimizeTours(replanPool, vehicleCapacity);
    if (newTours.length === 0) {
      setBenniReply('Benni konnte keine sinnvolle Neuplanung erzeugen.');
      return;
    }

    newTours.forEach(t => addTour(t));
    const plannedIds = newTours.flatMap(t => t.stops.map(s => s.id));
    if (plannedIds.length) updateOrderPlannedStatus(plannedIds, true);
    setActiveTab('tours');
    setBenniReply('Neuplanung abgeschlossen. Gesperrte Touren wurden nicht verändert.');
    setBenniActionPending(false);
    setBenniIntent(null);
  };

  const applyBenniAction = () => {
    if (!benniIntent) return;
    const msg = benniIntent === 'replan'
      ? 'Benni wird alle offenen Touren neu planen (LOCKED bleibt). Fortfahren?'
      : 'Benni plant die offenen Aufträge automatisch. Fortfahren?';
    if (!window.confirm(msg)) return;
    if (benniIntent === 'replan') {
      handleBenniReplanAll();
    } else {
      handleAutoPlan();
    }
    setBenniActionPending(false);
    setBenniIntent(null);
  };

  const submitFeedback = async (tourId: string, rating: 'UP' | 'DOWN', comment?: string) => {
    if (!tourId) return;
    if (!supabase) {
      setFeedbackToast({ message: 'Feedback konnte nicht gespeichert werden (kein Supabase-Client).', type: 'error' });
      setTimeout(() => setFeedbackToast(null), 2000);
      return;
    }
    try {
      const userName = user?.username || 'unknown';
      const { error } = await supabase.from('tour_feedback').insert({
        id: uuidv4(),
        tour_id: tourId,
        rating,
        comment: comment || '',
        user_name: userName,
        created_at: new Date().toISOString()
      });
      if (error) {
        console.error('Feedback insert failed', error);
        setFeedbackToast({ message: `Feedback konnte nicht gespeichert werden: ${error.message}`, type: 'error' });
        setTimeout(() => setFeedbackToast(null), 2000);
        return;
      }
      setFeedbackToast({ message: 'Danke! Navio AI lernt durch dein Feedback.', type: 'success' });
      setTimeout(() => setFeedbackToast(null), 2000);
      // Refresh feedback summary
        const { data, error: loadErr } = await supabase
        .from('tour_feedback')
        .select('rating,comment')
        .order('created_at', { ascending: false });
      if (!loadErr && data) {
        const notes = data.map((f: any) => `${f.rating === 'UP' ? '👍' : '👎'} ${f.comment || ''}`.trim()).join('\n');
        setFeedbackNotes(notes);
      }
    } catch (e: any) {
      console.error('Feedback insert exception', e);
      setFeedbackToast({ message: `Feedback konnte nicht gespeichert werden: ${e?.message || e}`, type: 'error' });
      setTimeout(() => setFeedbackToast(null), 2000);
    }
  };

  // --- FILTER LOGIC ---
  const allUnplannedOrders = orders.filter(o => !o.isPlanned).sort((a, b) => a.shippingPostcode.localeCompare(b.shippingPostcode));
  
  const filteredPool = useMemo(() => {
    if (!searchTerm) return allUnplannedOrders;
    const lower = searchTerm.toLowerCase();
    return allUnplannedOrders.filter(o => 
      o.customerName1.toLowerCase().includes(lower) ||
      o.shippingCity.toLowerCase().includes(lower) ||
      o.shippingPostcode.includes(lower) ||
      o.documentNumber.toLowerCase().includes(lower)
    );
  }, [allUnplannedOrders, searchTerm]);

  const activeTours = tours.filter(t => t.status === TourStatus.PLANNING || t.status === TourStatus.LOCKED);
  
  const filteredTours = useMemo(() => {
    if (!searchTerm) return activeTours;
    const lower = searchTerm.toLowerCase();
    return activeTours.filter(t => 
      t.name.toLowerCase().includes(lower) ||
      t.stops.some(s => 
        s.customerName1.toLowerCase().includes(lower) || 
        s.shippingCity.toLowerCase().includes(lower) ||
        s.shippingPostcode.includes(lower)
      )
    );
  }, [activeTours, searchTerm]);

  // Derived state for the order currently being assigned
  const orderToAssign = useMemo(() => {
    return orders.find(o => o.id === assigningOrderId);
  }, [assigningOrderId, orders]);


  const handleAutoPlan = () => {
    if (filteredPool.length === 0) return;
    
    // Use the selected vehicleCapacity
    const newTours = optimizeTours(filteredPool, vehicleCapacity);
    
    if (newTours.length === 0) {
      alert(`Keine effizienten Touren für ${vehicleCapacity}kg Limit gefunden (Mindestauslastung nicht erreicht).`);
      return;
    }

    newTours.forEach(t => addTour(t));
    const allPlannedOrderIds = newTours.flatMap(t => t.stops.map(s => s.id));
    updateOrderPlannedStatus(allPlannedOrderIds, true);
    setActiveTab('tours'); 
  };

  const handleStatusChange = (e: React.MouseEvent, tourId: string, currentStatus: TourStatus) => {
    e.stopPropagation();
    const newStatus = currentStatus === TourStatus.PLANNING ? TourStatus.LOCKED : TourStatus.PLANNING;
    updateTourStatus(tourId, newStatus);
  };

  const requestDeleteTour = (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    setItemToDelete({ type: 'TOUR', id: tourId });
  };

  const requestDissolveAllTours = () => {
    if (activeTours.length === 0) return;
    setItemToDelete({ type: 'ALL_TOURS', id: 'all' });
  };

  const requestDeleteOrder = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent, orderId: string) => {
    e.stopPropagation(); 
    e.preventDefault();
    setItemToDelete({ type: 'ORDER', id: orderId });
  };

  const requestBulkDeleteOrders = () => {
    if (selectedPoolItems.size === 0) return;
    setItemToDelete({ type: 'BULK_ORDERS', id: 'bulk' });
  };

  // --- SELECTION LOGIC ---
  const toggleSelectOrder = (id: string) => {
    const newSet = new Set(selectedPoolItems);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedPoolItems(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedPoolItems.size === filteredPool.length) {
        setSelectedPoolItems(new Set());
    } else {
        const allIds = filteredPool.map(o => o.id);
        setSelectedPoolItems(new Set(allIds));
    }
  };

  // --- CONFIRMATION HANDLERS ---

  const confirmDissolve = () => {
    if (itemToDelete?.type === 'TOUR') {
        deleteTour(itemToDelete.id);
    } else if (itemToDelete?.type === 'ALL_TOURS') {
        dissolveAllTours();
    }
    setItemToDelete(null);
  };

  const confirmDeleteAll = () => {
    if (itemToDelete?.type === 'TOUR') {
        deleteTourAndOrders(itemToDelete.id);
    }
    setItemToDelete(null);
  };

  const confirmDeleteOrder = () => {
    if (itemToDelete?.type === 'ORDER') {
      removeOrder(itemToDelete.id);
    } else if (itemToDelete?.type === 'BULK_ORDERS') {
      removeOrders(Array.from(selectedPoolItems));
      setSelectedPoolItems(new Set());
    }
    setItemToDelete(null);
  };

  const handlePrintCMR = (e: React.MouseEvent, tour: any) => {
      e.stopPropagation();
      generateCMRBundle(tour, tour.stops, cmrConfig);
  };

  const handleExportTourList = (e: React.MouseEvent, tour: any) => {
    e.stopPropagation();
    const csvData = tour.stops.map((s: Order, index: number) => ({
      Stop: index + 1,
      Kunde: s.customerName1,
      PLZ: s.shippingPostcode,
      Ort: s.shippingCity,
      Gewicht: s.totalWeightKg,
      Beleg: s.documentNumber
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tourliste_${tour.name.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenGoogleMaps = (e: React.MouseEvent, tour: Tour) => {
    e.stopPropagation();
    if (tour.stops.length === 0) return;

    const origin = encodeURIComponent("Ostring 3, 33181 Bad Wünnenberg");
    const lastStop = tour.stops[tour.stops.length - 1];
    const destination = encodeURIComponent(`${lastStop.shippingPostcode} ${lastStop.shippingCity}`);

    // Create waypoints string (all stops except the last one)
    const waypoints = tour.stops.slice(0, tour.stops.length - 1)
      .map(s => encodeURIComponent(`${s.shippingPostcode} ${s.shippingCity}`))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }

    window.open(url, '_blank');
  };

  const handleCopyTimocomString = (e: React.MouseEvent, tour: Tour) => {
    e.stopPropagation();
    if (tour.stops.length === 0) return;

    const lastStop = tour.stops[tour.stops.length - 1];
    const stopNames = tour.stops.map(s => s.shippingCity).join(', ');
    
    // Format: DE-33181 Bad Wünnenberg -> DE-80331 München | 1250kg | 4 Stopps | Stalleinrichtung | Stopps: Kassel, Nürnberg...
    const text = `DE-33181 Bad Wünnenberg -> ${lastStop.shippingCountryCode || 'DE'}-${lastStop.shippingPostcode} ${lastStop.shippingCity} | ${tour.totalWeight}kg | ${tour.stops.length} Stopps | Stalleinrichtung | Stopps: ${stopNames}`;

    navigator.clipboard.writeText(text).then(() => {
      alert("Timocom Text in Zwischenablage kopiert!");
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleFreightStatusChange = (e: React.ChangeEvent<HTMLSelectElement>, tourId: string) => {
    e.stopPropagation();
    const newStatus = e.target.value as FreightStatus;
    setTourFreightStatus(tourId, newStatus);
  };

  const getBarColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (percentage > 90) return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
    if (percentage > 70) return 'bg-green-400';
    if (percentage > 50) return 'bg-amber-400';
    return 'bg-amber-300';
  };

  // --- Manual Action Handlers ---

  const handleAssignToTour = (tourId: string) => {
    if (assigningOrderId) {
      moveOrderToTour(assigningOrderId, tourId);
      setAssigningOrderId(null);
    }
  };

  const handleMoveBackToPool = (orderId: string) => {
    moveOrderToPool(orderId);
  };

  const handleMoveStopUp = (tourId: string, index: number) => {
    if (index > 0) {
      reorderTourStops(tourId, index, index - 1);
    }
  };

  const handleMoveStopDown = (tourId: string, index: number, totalStops: number) => {
    if (index < totalStops - 1) {
      reorderTourStops(tourId, index, index + 1);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrder) {
      updateOrder(editingOrder.id, editingOrder);
      setEditingOrder(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50 overflow-hidden relative">
      
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]"
           style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Feedback Modal */}
      {feedbackModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-96 max-w-[90vw] p-6 relative">
            <button
              onClick={() => setFeedbackModal({ open: false, tourId: undefined, rating: undefined, comment: '' })}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${feedbackModal.rating === 'UP' ? 'bg-green-500' : 'bg-red-500'}`}>
                {feedbackModal.rating === 'UP' ? '👍' : '👎'}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700">Feedback zur Tour</div>
                <div className="text-xs text-slate-500">Hilf Benni, besser zu planen</div>
              </div>
            </div>
            <textarea
              value={feedbackModal.comment}
              onChange={(e) => setFeedbackModal(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Was war gut/schlecht? (optional)"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-200"
              rows={3}
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setFeedbackModal({ open: false, tourId: undefined, rating: undefined, comment: '' })}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  submitFeedback(feedbackModal.tourId || '', feedbackModal.rating || 'UP', feedbackModal.comment);
                  setFeedbackModal({ open: false, tourId: undefined, rating: undefined, comment: '' });
                }}
                className="flex-1 py-2 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 shadow-md active:scale-95"
              >
                Feedback senden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex-none z-20 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          {/* Left: Title & Stats */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="bg-brand-500/10 p-2 rounded-lg text-brand-600">
                 <MapPin size={24} />
              </div>
              <span>Tourenplanung</span>
            </h2>
            <div className="flex items-center gap-4 text-xs md:text-sm text-slate-500 mt-1 pl-1">
               <span className="flex items-center gap-1.5"><Layers size={14} className="text-slate-400"/> Pool: <b className="text-slate-700">{filteredPool.length}</b></span>
               <span className="hidden md:inline text-slate-300">|</span>
               <span className="flex items-center gap-1.5"><Truck size={14} className="text-slate-400"/> Geplant: <b className="text-slate-700">{filteredTours.length}</b></span>
            </div>
          </div>

          {/* Right: Controls (Search, Vehicle, Actions) */}
      <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            
            {/* Search Bar */}
            <div className="relative flex-1 md:w-64">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search size={16} className="text-slate-400" />
               </div>
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Suche (Kunde, Ort, Nr, PLZ)..." 
                 className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
               />
            </div>

            {/* Vehicle Selector Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
               <button 
                 onClick={() => setVehicleCapacity(1300)}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vehicleCapacity === 1300 ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 1.3t
               </button>
               <button 
                 onClick={() => setVehicleCapacity(3000)}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vehicleCapacity === 3000 ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 3.0t
               </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button 
                onClick={requestDissolveAllTours}
                disabled={activeTours.length === 0}
                className="justify-center px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title="Alle Touren auflösen"
              >
                 <RefreshCw size={16} />
                 <span className="hidden md:inline">Zurücksetzen</span>
              </button>
              <button 
                onClick={handleAutoPlan}
                disabled={filteredPool.length === 0}
                className="justify-center px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-500 shadow-lg shadow-brand-500/20 text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play size={16} fill="currentColor" />
                <span className="hidden md:inline">Auto-Plan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Benni Assistant */}
      {benniOpen ? (
        <div className="fixed bottom-6 right-4 md:right-8 z-40">
          <div className="w-[320px] max-w-[90vw] bg-white/90 backdrop-blur-xl shadow-2xl border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 max-h-[75vh] overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-lg shadow-inner border border-brand-200">🤖</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-700">Benni (KI)</div>
                <div className="text-xs text-slate-500">Frag nach Touren, Planung, Aufgaben…</div>
              </div>
              <button
                onClick={() => {
                  setBenniReply('');
                  setBenniInput('');
                  setBenniOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
                title="Schließen"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setBenniInput('Plane alle offenen Aufträge automatisch (1.3t/3.0t mix).');
                  setBenniIntent('auto');
                  setBenniActionPending(true);
                }}
                className="px-3 py-2 bg-brand-50 text-brand-700 rounded-xl text-xs font-semibold hover:bg-brand-100 text-left"
              >
                🚀 Auto-Plan
              </button>
              <button
                onClick={() => {
                  setBenniInput('Plane alles neu, aber gesperrte Touren nicht anfassen.');
                  setBenniIntent('replan');
                  setBenniActionPending(true);
                }}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 text-left"
              >
                🔄 Neu planen (ohne LOCKED)
              </button>
              <button
                onClick={() => setBenniInput('Optimier die aktuelle Planung nach kürzeren Wegen und Auslastung.')}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 text-left"
              >
                ✨ Optimieren
              </button>
              <button
                onClick={() => setBenniInput('Erstelle eine Idee entlang der A44/A2 ohne Zick-Zack.')}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 text-left"
              >
                🛣️ Korridor-Idee
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
              <textarea
                value={benniInput}
                onChange={(e) => setBenniInput(e.target.value)}
                placeholder="Optional: Zusatzwunsch (z.B. 'Stop 123 in Tour 5 tauschen')"
                className="w-full bg-transparent border-none focus:outline-none text-sm text-slate-800 resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>1) Aktion wählen · 2) Wunsch ergänzen · 3) Starten</span>
              <span>Feedback: {feedbackNotes ? 'aktiv' : 'keine Daten'}</span>
            </div>
            <button
              onClick={handleAskBenni}
              disabled={benniLoading || !benniInput.trim()}
              className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-brand-700"
            >
              {benniLoading ? 'Denkt...' : benniIntent === 'replan' ? 'Neu planen' : benniIntent === 'auto' ? 'Auto-Plan' : 'Benni starten'}
            </button>
          {benniReply && (
            <div className="text-sm text-slate-700 whitespace-pre-line border-t border-slate-100 pt-2 space-y-2 flex-1 overflow-y-auto pr-1">
              <div className="min-h-[60px]">{benniReply}</div>
              {benniActionPending && benniIntent && (
                <div className="space-y-2">
                  <button
                    onClick={applyBenniAction}
                    className={`w-full py-2 rounded-lg text-sm font-semibold shadow ${benniIntent === 'replan' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                  >
                    Vorschlag anwenden ({benniIntent === 'replan' ? 'Neu planen' : 'Auto-Plan'})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      ) : (
        <button
          className="fixed bottom-6 right-4 md:right-8 z-40 bg-white shadow-xl border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => setBenniOpen(true)}
          type="button"
        >
          <span className="text-lg">🤖</span>
          Benni öffnen
        </button>
      )}

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className={`fixed bottom-24 right-4 left-4 md:left-auto md:right-8 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-center ${
          feedbackToast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {feedbackToast.message}
        </div>
      )}

      {/* Mobile Tabs */}
      <div className="md:hidden flex border-b border-slate-200 bg-white z-20">
        <button 
          onClick={() => setActiveTab('pool')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'pool' ? 'text-brand-600 border-brand-600 bg-brand-50/30' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
        >
          Auftrags-Pool ({filteredPool.length})
        </button>
        <button 
          onClick={() => setActiveTab('tours')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'tours' ? 'text-brand-600 border-brand-600 bg-brand-50/30' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
        >
          Touren ({filteredTours.length})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* LEFT COLUMN: POOL */}
        <div 
           className={`w-full md:w-80 lg:w-[400px] border-r border-slate-200/60 flex-col transition-all duration-300 ${activeTab === 'pool' ? 'flex' : 'hidden md:flex'} bg-white/60 backdrop-blur-sm`}
        >
          <div className="px-4 py-3 border-b text-[11px] font-bold uppercase tracking-widest flex justify-between items-center shadow-sm z-10 bg-slate-50/80 border-slate-100 text-slate-500">
            {selectedPoolItems.size > 0 ? (
               <div className="flex items-center gap-2 w-full justify-between text-brand-600">
                  <div className="flex items-center gap-2">
                    <button onClick={toggleSelectAll} className="hover:text-brand-800"><CheckSquare size={14}/></button>
                    <span>{selectedPoolItems.size} Ausgewählt</span>
                  </div>
                  <button 
                    onClick={requestBulkDeleteOrders}
                    className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={12}/> Löschen
                  </button>
               </div>
            ) : (
               <>
                 <div className="flex items-center gap-2">
                    <button onClick={toggleSelectAll} disabled={filteredPool.length === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
                        <Square size={14}/>
                    </button>
                    <span>Ungeplante Aufträge</span>
                 </div>
                 <span className="flex items-center gap-1"><Filter size={10}/> {searchTerm ? 'Gefiltert' : 'PLZ Sortiert'}</span>
               </>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar relative">
            {filteredPool.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center select-none">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Calculator className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-sm font-medium text-slate-400">Keine Aufträge.</p>
                {searchTerm && <p className="text-xs mt-1 text-slate-300">Suchfilter aktiv.</p>}
              </div>
            ) : (
              filteredPool.map(order => (
                <div 
                  key={order.id} 
                  className={`group p-3.5 rounded-xl border shadow-sm relative transition-all duration-200 ${
                    selectedPoolItems.has(order.id) 
                      ? 'bg-brand-50 border-brand-200' 
                      : 'bg-white border-slate-200 hover:shadow-md hover:border-brand-200'
                  }`}
                >
                    <div className="flex items-start gap-3">
                        <div className="pt-1">
                            <input 
                                type="checkbox" 
                                checked={selectedPoolItems.has(order.id)}
                                onChange={() => toggleSelectOrder(order.id)}
                                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1.5">
                            <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">{order.shippingPostcode}</span>
                                {order.shippingCity}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.totalWeightKg > vehicleCapacity ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                {order.totalWeightKg} kg
                            </span>
                            </div>
                            <div className="text-xs text-slate-500 truncate mb-2 font-medium opacity-80">{order.customerName1}</div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-50 pt-2">
                            <span className="font-mono">{order.documentNumber}</span>
                            <div className="flex items-center gap-1">
                                {order.totalWeightKg > 1300 && (
                                <span className="text-red-500 flex items-center gap-1 font-bold mr-2"><AlertTriangle size={10} /> Schwer</span>
                                )}
                                
                                {/* EDIT BUTTON */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingOrder(order); }}
                                    className="text-slate-300 hover:text-brand-500 hover:bg-brand-50 p-1.5 rounded-md transition-colors"
                                    title="Bearbeiten"
                                >
                                    <Pencil size={14} />
                                </button>

                                {/* DELETE BUTTON */}
                                <div 
                                className="relative z-10"
                                onMouseDown={(e) => e.stopPropagation()} 
                                onTouchStart={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                >
                                <button 
                                    onClick={(e) => requestDeleteOrder(e, order.id)}
                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                                    title="Auftrag löschen"
                                >
                                    <Trash2 size={14} />
                                </button>
                                </div>

                                {/* ASSIGN BUTTON */}
                                <button 
                                onClick={() => setAssigningOrderId(order.id)}
                                className="bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white p-1.5 rounded-md transition-all shadow-sm ml-1"
                                title="Zu Tour hinzufügen"
                                >
                                <ArrowRight size={14} />
                                </button>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TOURS */}
        <div 
          className={`flex-1 overflow-y-auto p-4 md:p-8 relative ${activeTab === 'tours' ? 'block' : 'hidden md:block'} custom-scrollbar`}
        >
          
          {filteredTours.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Truck className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700">Keine Touren gefunden</h3>
              <p className="text-sm mt-2 max-w-xs text-center text-slate-500">
                {searchTerm ? 'Versuche die Suche anzupassen.' : 'Starte den Auto-Planer.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
              {filteredTours.map(tour => {
                const isLocked = tour.status === TourStatus.LOCKED;
                const isHighlighted = highlightIds.includes(tour.id);
                
                return (
                  <div 
                    key={tour.id} 
                    className={`flex flex-col h-full rounded-2xl group border shadow-sm hover:shadow-md transition-all duration-500 ${
                      isHighlighted ? 'ring-4 ring-amber-300 scale-[1.02] shadow-xl z-20' : 
                      isLocked 
                        ? 'bg-amber-50/20 border-amber-300 ring-1 ring-amber-300/50' 
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    
                    {/* Tour Header */}
                    <div className={`p-5 border-b border-dashed relative rounded-t-2xl ${
                      isLocked ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/50 border-slate-200'
                    }`}>
                      <div className={`absolute -left-2 bottom-[-10px] w-4 h-4 rounded-full z-10 ${isLocked ? 'bg-amber-50/20' : 'bg-slate-50'}`}></div>
                      <div className={`absolute -right-2 bottom-[-10px] w-4 h-4 rounded-full z-10 ${isLocked ? 'bg-amber-50/20' : 'bg-slate-50'}`}></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 mr-4">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                             <h3 className="font-bold text-slate-800 text-lg leading-tight flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${tour.maxWeight > 1300 ? 'bg-purple-500' : 'bg-brand-500'}`}></div>
                                {tour.name}
                             </h3>
                             
                             {/* FREIGHT STATUS DROPDOWN */}
                             <div className="relative inline-block">
                                <select 
                                  value={tour.freightStatus || 'OPEN'} 
                                  onChange={(e) => handleFreightStatusChange(e, tour.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`appearance-none pl-6 pr-8 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 border transition-all ${
                                    tour.freightStatus === 'CONFIRMED' 
                                      ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 focus:ring-green-400' 
                                      : tour.freightStatus === 'OFFERED'
                                        ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 focus:ring-amber-400'
                                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 focus:ring-slate-300'
                                  }`}
                                >
                                  <option value="OPEN">⚪ Offen</option>
                                  <option value="OFFERED">🟡 Angeboten</option>
                                  <option value="CONFIRMED">🟢 Bestätigt</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current">
                                  <ChevronDown size={10} />
                                </div>
                                {/* Icon Overlay */}
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-current">
                                   {tour.freightStatus === 'CONFIRMED' ? <ThumbsUp size={10} /> : tour.freightStatus === 'OFFERED' ? <Globe size={10} /> : <div className="w-2.5" />}
                                </div>
                             </div>
                          </div>

                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 pl-4">
                            <span className={`border px-2 py-0.5 rounded shadow-sm font-semibold ${tour.maxWeight > 1300 ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                               {tour.maxWeight > 1300 ? 'XL 3.0t' : '1.3t'}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="font-mono">~{tour.estimatedDistanceKm} km</span>
                            <span className="text-slate-300">|</span>
                            <span>• {tour.stops.length} Stopps</span>
                            <span>• Ø {tour.utilization}%</span>
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFeedbackModal({ open: true, tourId: tour.id, rating: 'UP', comment: '' });
                                }}
                                title="Tour gut"
                                className="p-1 rounded-full text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200 transition-colors"
                              >
                                <ThumbsUp size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFeedbackModal({ open: true, tourId: tour.id, rating: 'DOWN', comment: '' });
                                }}
                                title="Tour neu planen / schlecht"
                                className="p-1 rounded-full text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                              >
                                <ThumbsDown size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Header Actions: Delete & Lock */}
                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => requestDeleteTour(e, tour.id)}
                                className="p-2 rounded-lg transition-all active:scale-95 shadow-sm border bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200"
                                title="Tour löschen"
                            >
                                <Trash2 size={16} />
                            </button>

                            <button 
                                onClick={(e) => handleStatusChange(e, tour.id, tour.status)}
                                className={`p-2 rounded-lg transition-all active:scale-95 shadow-sm border ${
                                    isLocked
                                    ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' 
                                    : 'bg-white text-slate-400 border-slate-200 hover:text-brand-500 hover:border-brand-200'
                                }`}
                                title={isLocked ? "Tour entsperren" : "Tour sperren (Fertig)"}
                            >
                                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                        </div>
                      </div>

                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between text-xs font-bold tracking-wide">
                          <span className={tour.totalWeight > tour.maxWeight ? 'text-red-600' : 'text-slate-600'}>
                            {tour.totalWeight} / {tour.maxWeight} kg
                          </span>
                          <span className="text-slate-400">{tour.utilization}% Load</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(tour.utilization)}`} 
                            style={{ width: `${Math.min(tour.utilization, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Stops List */}
                    <div className={`flex-1 p-0 overflow-hidden ${isLocked ? 'bg-amber-50/10' : 'bg-white'}`}>
                      <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-slate-50">
                           <tr className="bg-slate-50/30 text-xs text-slate-400 select-none">
                              <td className="pl-4 py-2 w-8 text-center"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-auto"></div></td>
                              <td className="py-2 font-medium">Bad Wünnenberg (Start)</td>
                              <td className="pr-4 py-2 text-right"></td>
                           </tr>
                           
                           {tour.stops.map((stop, i) => (
                             <tr 
                               key={stop.id} 
                               className="hover:bg-brand-50/10 transition-colors group"
                             >
                                {/* Sorting Controls */}
                                <td className="pl-3 py-3 w-8 align-middle">
                                  {!isLocked && (
                                    <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => handleMoveStopUp(tour.id, i)}
                                        disabled={i === 0}
                                        className="p-0.5 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-inherit"
                                      >
                                        <ArrowUp size={12} />
                                      </button>
                                      <button 
                                        onClick={() => handleMoveStopDown(tour.id, i, tour.stops.length)}
                                        disabled={i === tour.stops.length - 1}
                                        className="p-0.5 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-inherit"
                                      >
                                        <ArrowDown size={12} />
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {/* Stop Content */}
                                <td className="py-3">
                                  <div className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                                    <span className="text-slate-300 font-mono text-[10px] w-4 text-right">#{i+1}</span>
                                    <span className={searchTerm && (stop.shippingPostcode.includes(searchTerm) || stop.shippingCity.toLowerCase().includes(searchTerm.toLowerCase())) ? 'bg-yellow-100 px-1 rounded' : ''}>
                                       {stop.shippingPostcode} {stop.shippingCity}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 truncate max-w-[140px] pl-6 mt-0.5 font-medium opacity-80">
                                     <span className={searchTerm && stop.customerName1.toLowerCase().includes(searchTerm.toLowerCase()) ? 'bg-yellow-100 px-1 rounded' : ''}>
                                        {stop.customerName1}
                                     </span>
                                  </div>
                                </td>

                                {/* Action Buttons (Right) */}
                                <td className="pr-4 py-3 text-right align-middle">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className={`border text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${stop.totalWeightKg > tour.maxWeight ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                      {stop.totalWeightKg}
                                    </span>
                                    
                                    {!isLocked && (
                                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingOrder(stop); }}
                                            className="text-slate-300 hover:text-brand-500 hover:bg-brand-50 p-1 rounded transition-colors mr-1"
                                            title="Bearbeiten"
                                          >
                                            <Pencil size={14} />
                                          </button>
                                          <button
                                            onClick={() => handleMoveBackToPool(stop.id)}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                            title="Zurück in den Pool"
                                          >
                                            <ArrowLeft size={14} />
                                          </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Actions (Icon-Only Row) */}
                    <div className={`p-3 border-t rounded-b-2xl flex gap-2 ${isLocked ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/80 border-slate-200'}`}>
                      
                      {/* Left Group */}
                      <div className="flex-1 flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowMapTour(tour); }}
                          className="flex items-center justify-center gap-2 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-bold hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all shadow-sm h-9"
                          title="Karte anzeigen"
                        >
                          <Map size={14} />
                          Karte
                        </button>
                        
                        <button 
                          onClick={(e) => handlePrintCMR(e, tour)}
                          className="flex items-center justify-center gap-2 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-bold hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all shadow-sm h-9"
                          title="CMR Drucken"
                        >
                          <FileText size={14} />
                          CMR
                        </button>

                        <button
                            onClick={(e) => handleOpenGoogleMaps(e, tour)}
                            className="w-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm h-9"
                            title="In Google Maps öffnen"
                        >
                            <Navigation size={16} />
                        </button>
                      </div>

                      {/* Right Group */}
                      <div className="flex gap-2">
                        <button
                            onClick={(e) => handleCopyTimocomString(e, tour)}
                            className="w-10 flex items-center justify-center border rounded-lg transition-all shadow-sm bg-white border-slate-200 text-slate-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 h-9"
                            title="Timocom Text kopieren"
                        >
                            <Copy size={16} />
                        </button>
                        
                        <button 
                          onClick={(e) => handleExportTourList(e, tour)}
                          className="w-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-all shadow-sm h-9"
                          title="Liste als CSV Exportieren"
                        >
                          <Download size={16} />
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL: TOUR MAP --- */}
      {showMapTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowMapTour(null)}>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">{showMapTour.name}</h3>
                    <p className="text-xs text-slate-500">{showMapTour.stops.length} Stopps | {showMapTour.estimatedDistanceKm} km</p>
                 </div>
                 <button onClick={() => setShowMapTour(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                    <X size={20} className="text-slate-500" />
                 </button>
              </div>
              <div className="flex-1 bg-slate-100 relative">
                 <TourMap tour={showMapTour} />
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL: EDIT ORDER --- */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Pencil size={20} className="text-brand-500"/>
                Auftrag bearbeiten
              </h3>
              
              <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kunde</label>
                    <input 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                      value={editingOrder.customerName1}
                      onChange={e => setEditingOrder({...editingOrder, customerName1: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PLZ</label>
                        <input 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                          value={editingOrder.shippingPostcode}
                          onChange={e => setEditingOrder({...editingOrder, shippingPostcode: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ort</label>
                        <input 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                          value={editingOrder.shippingCity}
                          onChange={e => setEditingOrder({...editingOrder, shippingCity: e.target.value})}
                        />
                     </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gewicht (kg)</label>
                    <input 
                      type="number"
                      step="0.1"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                      value={editingOrder.totalWeightKg}
                      onChange={e => setEditingOrder({...editingOrder, totalWeightKg: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                     <button 
                       type="button" 
                       onClick={() => setEditingOrder(null)}
                       className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                     >
                       Abbrechen
                     </button>
                     <button 
                       type="submit" 
                       className="flex-1 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-md shadow-brand-500/20"
                     >
                       Speichern
                     </button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* --- MODAL: ASSIGN ORDER TO TOUR --- */}
      {assigningOrderId && orderToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up border border-slate-100">
             <div className="bg-brand-50 p-4 border-b border-brand-100 flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-bold text-brand-900">Auftrag zuweisen</h3>
                  <p className="text-xs text-brand-600 mt-1 font-medium">{orderToAssign.shippingCity} ({orderToAssign.totalWeightKg}kg)</p>
               </div>
               <button onClick={() => setAssigningOrderId(null)} className="text-brand-400 hover:text-brand-700">
                 <X size={20} />
               </button>
             </div>
             
             <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                {activeTours.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                     <Truck size={32} className="mx-auto mb-2 opacity-30" />
                     <p>Keine aktiven Touren verfügbar.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTours.map(tour => {
                       const newWeight = tour.totalWeight + orderToAssign.totalWeightKg;
                       const isOverloaded = newWeight > tour.maxWeight;
                       
                       return (
                         <button
                           key={tour.id}
                           onClick={() => handleAssignToTour(tour.id)}
                           className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md flex items-center justify-between group ${
                             isOverloaded 
                               ? 'bg-red-50 border-red-100 hover:border-red-300' 
                               : 'bg-white border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                           }`}
                         >
                            <div>
                               <div className="font-bold text-slate-800 text-sm">{tour.name}</div>
                               <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded border ${isOverloaded ? 'bg-white text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {tour.totalWeight}kg
                                  </span>
                                  <ArrowRight size={10} />
                                  <span className={`px-1.5 py-0.5 rounded border font-bold ${isOverloaded ? 'bg-red-600 text-white border-red-600' : 'bg-brand-100 text-brand-700 border-brand-200'}`}>
                                    {newWeight}kg
                                  </span>
                               </div>
                            </div>
                            
                            {isOverloaded ? (
                               <AlertTriangle size={20} className="text-red-500" />
                            ) : (
                               <CheckCircle2 size={20} className="text-slate-300 group-hover:text-brand-500" />
                            )}
                         </button>
                       );
                    })}
                  </div>
                )}
             </div>
             
             <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button onClick={() => setAssigningOrderId(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wide">Abbrechen</button>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL: DELETE CONFIRMATION --- */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up border border-slate-100">
             <div className="flex justify-center mb-4 text-amber-500">
               <AlertTriangle size={48} />
             </div>
             <h3 className="text-xl font-bold text-center text-slate-800 mb-2">
               {itemToDelete.type === 'TOUR' && 'Tour löschen'}
               {itemToDelete.type === 'ORDER' && 'Auftrag löschen'}
               {itemToDelete.type === 'ALL_TOURS' && 'Alles zurücksetzen'}
               {itemToDelete.type === 'BULK_ORDERS' && 'Massenlöschung'}
             </h3>
             <p className="text-slate-500 text-center mb-6 text-sm">
               {itemToDelete.type === 'TOUR' && 'Wie möchtest du mit den enthaltenen Aufträgen verfahren?'}
               {itemToDelete.type === 'ORDER' && 'Möchtest du diesen Auftrag wirklich löschen?'}
               {itemToDelete.type === 'ALL_TOURS' && 'Warnung: Dies löscht ALLE aktuellen Touren und verschiebt die Aufträge zurück in den Pool.'}
               {itemToDelete.type === 'BULK_ORDERS' && `Warnung: Du bist dabei ${selectedPoolItems.size} Aufträge endgültig zu löschen.`}
             </p>
             
             <div className="space-y-3">
               {itemToDelete.type === 'TOUR' ? (
                 <>
                   <button 
                     onClick={confirmDissolve}
                     className="w-full py-3 px-4 bg-brand-50 text-brand-700 font-bold rounded-xl hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
                   >
                     <ArrowLeft size={18} />
                     Nur Auflösen (Pool)
                   </button>
                   <button 
                     onClick={confirmDeleteAll}
                     className="w-full py-3 px-4 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                   >
                     <Trash2 size={18} />
                     Alles endgültig löschen
                   </button>
                 </>
               ) : itemToDelete.type === 'ALL_TOURS' ? (
                  <button 
                     onClick={confirmDissolve}
                     className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md shadow-red-500/20 transition-colors flex items-center justify-center gap-2"
                   >
                     <RefreshCw size={18} />
                     Ja, alles zurücksetzen
                   </button>
               ) : (
                  <button 
                     onClick={confirmDeleteOrder}
                     className="w-full py-3 px-4 bg-red-50 text-red-700 font-bold rounded-xl hover:bg-red-100 border border-red-100 transition-colors flex items-center justify-center gap-2"
                   >
                     <Trash2 size={18} />
                     {itemToDelete.type === 'BULK_ORDERS' ? 'Ausgewählte löschen' : 'Auftrag löschen'}
                   </button>
               )}
             </div>
             
             <button 
               onClick={() => setItemToDelete(null)}
               className="mt-4 w-full text-slate-400 text-sm font-medium hover:text-slate-600"
             >
               Abbrechen
             </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Planning;
