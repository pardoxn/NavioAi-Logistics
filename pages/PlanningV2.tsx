import React, { useMemo, useState } from 'react';
import { Route as RouteIcon, Zap, Info, RefreshCw } from 'lucide-react';
import { OrderInputV2 } from '../components/routemaster/OrderInputV2';
import { TourResultV2 } from '../components/routemaster/TourResultV2';
import { RMOrder, RMPlanningResult } from '../types/routemaster';
import { planToursV2 } from '../services/routemasterService';
import { useData } from '../context/DataContext';
import { Order } from '../types';

const PlanningV2: React.FC = () => {
  const { orders: ctxOrders } = useData();
  const [manualOrders, setManualOrders] = useState<RMOrder[]>([]);
  const [ignoredOrderIds, setIgnoredOrderIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<RMPlanningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mappedContextOrders = useMemo(() => {
    const mapAddress = (o: Order) => {
      const street = o.shippingStreet ? `${o.shippingStreet}, ` : '';
      const cityLine = `${o.shippingPostcode} ${o.shippingCity}`.trim();
      const country = o.shippingCountryName && o.shippingCountryName !== 'Deutschland' ? `, ${o.shippingCountryName}` : '';
      return `${street}${cityLine}${country}`.trim();
    };

    return ctxOrders
      .filter((o) => !o.isPlanned)
      .map((o) => ({
        id: o.id,
        address: mapAddress(o),
        weight: Math.round(Number(o.totalWeightKg) || 0)
      })) as RMOrder[];
  }, [ctxOrders]);

  const orders: RMOrder[] = useMemo(() => {
    const ctx = mappedContextOrders.filter(o => !ignoredOrderIds.has(o.id));
    return [...ctx, ...manualOrders];
  }, [mappedContextOrders, ignoredOrderIds, manualOrders]);

  const handlePlanTours = async () => {
    if (!orders.length) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await planToursV2(orders);
      setResults(data);
    } catch (err: any) {
      setError(err?.message || "Fehler bei der Planung. Bitte Eingaben prüfen.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
  };

  const handleAddManualOrder = (order: RMOrder) => {
    setManualOrders((prev) => [...prev, order]);
  };

  const handleRemoveOrder = (orderId: string) => {
    const manualExists = manualOrders.some((o) => o.id === orderId);
    if (manualExists) {
      setManualOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setIgnoredOrderIds((prev) => {
        const next = new Set(prev);
        next.add(orderId);
        return next;
      });
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full w-fit mb-2">
            <RefreshCw className="w-3 h-3" />
            Beta: KI-Planung
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <RouteIcon className="w-7 h-7 text-emerald-500" />
            Tourenplanung V2
          </h1>
          <p className="text-slate-600 mt-1">
            RouteMaster AI plant One-Way-Touren ab Ostring 3, 33181 Bad Wünnenberg (max. 1300kg pro Tour).
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <Info className="w-5 h-5 text-slate-500" />
          <div className="text-sm text-slate-700">
            <div className="font-semibold text-slate-900">One-Way · Depot → letzter Kunde</div>
            <div className="text-slate-500">Stopps werden in Fahrtrichtung sortiert.</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 lg:sticky lg:top-20 h-fit">
          <OrderInputV2 orders={orders} onAdd={handleAddManualOrder} onRemove={handleRemoveOrder} />
          <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-slate-800 mb-1">Importierte Aufträge</div>
            <div>Ungeplante Aufträge aus der CSV erscheinen hier automatisch: {mappedContextOrders.length} gefunden.</div>
            {ignoredOrderIds.size > 0 && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-amber-700">
                  {ignoredOrderIds.size} Auftrag/Aufträge ausgeblendet.
                </span>
                <button
                  onClick={() => setIgnoredOrderIds(new Set())}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  Alle wieder einblenden
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <button
              onClick={handlePlanTours}
              disabled={loading || orders.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-md font-semibold text-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Optimiere Route...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Touren planen
                </>
              )}
            </button>
            
            {results && (
              <button
                onClick={handleReset}
                className="w-full py-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
              >
                Ergebnisse zurücksetzen
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Tourenplan</h2>
            <p className="text-slate-500">
              {results
                ? `Die KI hat ${results.tours.length} Tour(en) für ${orders.length} Auftrag/Aufträge berechnet.`
                : 'Erstellen Sie einen optimalen Fahrplan für Ihre LKW-Flotte.'}
            </p>
            {results?.unassignedOrders?.length ? (
              <p className="mt-2 text-sm text-amber-600">
                {results.unassignedOrders.length} Auftrag/Aufträge konnten nicht zugeordnet werden (zu schwer allein?).
              </p>
            ) : null}
          </div>

          <TourResultV2 tours={results?.tours || []} />
        </div>
      </div>
    </div>
  );
};

export default PlanningV2;
