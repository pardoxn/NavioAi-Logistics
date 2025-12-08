import React, { useEffect, useState } from 'react';
import { Route as RouteIcon, Info } from 'lucide-react';
import { OrderInputV2 } from '../components/routemaster/OrderInputV2';
import { TourResultV2 } from '../components/routemaster/TourResultV2';
import { RMOrder, RMPlanningResult, RMTour, RMStop } from '../types/routemaster';
import { planToursV2 } from '../services/routemasterService';
import { useData } from '../context/DataContext';
import { generateCMRBundle } from '../services/pdfService';

const PlanningV2: React.FC = () => {
  const { cmrConfig } = useData();
  const [orders, setOrders] = useState<RMOrder[]>([]);
  const [results, setResults] = useState<RMPlanningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Persist local orders across reloads/tab changes (separate von DataContext)
  useEffect(() => {
    const saved = localStorage.getItem('planningV2_orders');
    if (saved) {
      try {
        const parsed: RMOrder[] = JSON.parse(saved);
        setOrders(parsed);
      } catch (e) {
        console.warn('Konnte gespeicherte PlanningV2 Orders nicht lesen', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('planningV2_orders', JSON.stringify(orders));
  }, [orders]);

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
        const data = await planToursV2(allOrdersToPlan);
        newTours = data.tours;
      }

      const finalTours = [...lockedTours, ...newTours];
      setResults({ tours: finalTours });
      setOrders([]);
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

      setOrders(prev => [...prev, ...restoredOrders]);
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

    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;
    const order = orders[orderIndex];

    const newStop: RMStop = {
      stopNumber: 0,
      customerName: order.customerName,
      address: order.address,
      weightToUnload: order.weight,
      referenceNumber: order.referenceNumber,
      description: "Manuell hinzugefügt"
    };

    const newOrders = [...orders];
    newOrders.splice(orderIndex, 1);
    setOrders(newOrders);

    const newTours = [...results.tours];
    const targetTour = newTours[targetTourIndex];
    targetTour.stops.push(newStop);
    
    targetTour.stops.forEach((s, idx) => s.stopNumber = idx + 1);
    targetTour.totalWeight = targetTour.stops.reduce((sum, s) => sum + s.weightToUnload, 0);

    setResults({ ...results, tours: newTours });
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
      setOrders([...orders, restoredOrder]);
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

  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col overflow-hidden font-sans">
      <main className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8 w-full">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
          
          <div className="xl:col-span-4 h-full flex flex-col min-h-0">
            <OrderInputV2 
              orders={orders} 
              setOrders={setOrders} 
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
             />
          </div>

        </div>
      </main>
    </div>
  );
};

export default PlanningV2;
