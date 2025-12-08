import React, { useMemo, useState } from 'react';
import { OrderInputV2 } from '../components/routemaster/OrderInputV2';
import { TourResultV2 } from '../components/routemaster/TourResultV2';
import { RMOrder, RMPlanningResult, RMTour, RMStop } from '../types/routemaster';
import { planToursV2 } from '../services/routemasterService';
import { useData } from '../context/DataContext';
import { generateCMRBundle } from '../services/pdfService';
import { v4 as uuidv4 } from 'uuid';

const PlanningV2: React.FC = () => {
  const { cmrConfig, orders: globalOrders, addOrders, removeOrders } = useData();
  const orders: RMOrder[] = useMemo(() => {
    return globalOrders
      .filter(o => !o.isPlanned)
      .map(o => ({
        id: o.id,
        customerName: o.customerName1 || 'Kunde',
        address: `${o.shippingStreet ? o.shippingStreet + ', ' : ''}${o.shippingPostcode || ''} ${o.shippingCity || ''}`.trim(),
        weight: Math.round(Number(o.totalWeightKg) || 0),
        referenceNumber: o.documentNumber || o.orderId || undefined,
      }));
  }, [globalOrders]);

  const addRmOrders = (newOrders: RMOrder[]) => {
    if (!newOrders.length) return;
    const toAdd = newOrders.map(o => {
      const postcodeMatch = (o.address || '').match(/\b\d{4,5}\b/);
      const postcode = postcodeMatch ? postcodeMatch[0] : '';
      const city = (o.address || '').replace(postcode, '').replace(',', '').trim();
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
        shippingCity: city || o.address,
        shippingStreet: '',
        totalWeightKg: o.weight,
        isPlanned: false,
        bearing: 0,
        distanceFromDepot: 0,
      };
    });
    addOrders(toAdd);
  };
  const [results, setResults] = useState<RMPlanningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col overflow-hidden font-sans">
      <main className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8 w-full">
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
             />
          </div>

        </div>
      </main>
    </div>
  );
};

export default PlanningV2;
