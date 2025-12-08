import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Package, MapPin, Zap, RefreshCw, AlertCircle, User, FileText, GripVertical, X, FileSpreadsheet, Upload } from 'lucide-react';
import { RMOrder } from '../../types/routemaster';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { parseCSV } from '../../services/csvService';

interface OrderInputProps {
  orders: RMOrder[];
  onAddOrders: (orders: RMOrder[]) => void;
  onRemoveOrder: (orderId: string) => void;
  onClearOrders: () => void;
  onPlan: () => void;
  onReset: () => void;
  isLoading: boolean;
  hasResults: boolean;
  error: string | null;
}

export const OrderInputV2: React.FC<OrderInputProps> = ({ 
  orders, 
  onAddOrders,
  onRemoveOrder,
  onClearOrders,
  onPlan, 
  onReset,
  isLoading,
  hasResults,
  error
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<RMOrder[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localOrders, setLocalOrders] = useState<RMOrder[]>(orders);
  const handleClearOrders = () => {
    if (isLoading) return;
    if (!localOrders.length) return;
    setShowClearModal(true);
  };
  const [showClearModal, setShowClearModal] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [weight, setWeight] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  
  const listEndRef = useRef<HTMLDivElement>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !weight || !customerName) return;

    const newOrder: RMOrder = {
      id: crypto.randomUUID(),
      customerName,
      address,
      weight: Number(weight),
      referenceNumber: referenceNumber || undefined
    };

    onAddOrders([newOrder]);
    
    setCustomerName('');
    setAddress('');
    setWeight('');
    setReferenceNumber('');
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (localOrders.length > 0 && !draggedItemIndex) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localOrders.length]); 

  const handleRemove = (id: string) => {
    setLocalOrders(localOrders.filter(o => o.id !== id));
    onRemoveOrder(id);
  };
  
  const handleDragStart = (e: React.DragEvent, index: number, order: RMOrder) => {
    setDraggedItemIndex(index);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'ORDER_FROM_LIST',
      orderId: order.id
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newOrders = [...localOrders];
    const draggedItem = newOrders[draggedItemIndex];
    newOrders.splice(draggedItemIndex, 1);
    newOrders.splice(index, 0, draggedItem);

    setLocalOrders(newOrders);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const totalWeight = localOrders.reduce((sum, order) => sum + order.weight, 0);

  // --- CSV Import ---
  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      // reuse existing CSV parser (same Spalten-Logik wie alter Import)
      const parsedOrders = await parseCSV(file);
      if (!parsedOrders.length) {
        setImportError('Keine gültigen Zeilen gefunden. Bitte die gleiche CSV wie beim Import-Tab nutzen (Lieferschein-CSV).');
        setImportPreview([]);
        setIsImportModalOpen(true);
      } else {
        // map to RMOrder
        // Duplikate erkennen: vorhandene Bestellungen (referenceNumber) + innerhalb der neuen CSV
        const existingRefSet = new Set(
          orders
            .map(o => (o.referenceNumber || '').toString().trim().toLowerCase())
            .filter(Boolean)
        );
        const seenBatchRefs = new Set<string>();
        const batchDuplicateIds = new Set<string>();

        const mapped: RMOrder[] = parsedOrders.map(o => {
          const refRaw = (o.documentNumber || o.orderId || '').toString().trim();
          const refNorm = refRaw.toLowerCase();
          const rm: RMOrder = {
            id: o.id || uuidv4(),
            customerName: o.customerName1 || o.customerName2 || (o as any).customerName || 'Kunde',
            address: `${o.shippingStreet ? o.shippingStreet + ', ' : ''}${o.shippingPostcode || ''} ${o.shippingCity || ''}`.trim(),
            weight: Math.round(Number(o.totalWeightKg) || 0),
            referenceNumber: refRaw || undefined,
          };
          if (refNorm) {
            if (seenBatchRefs.has(refNorm)) {
              batchDuplicateIds.add(rm.id);
            } else {
              seenBatchRefs.add(refNorm);
            }
          }
          return rm;
        }).filter(o => o.address && o.weight > 0);

        if (!mapped.length) {
          setImportError('Keine gültigen Zeilen nach Mapping. Prüfe Adressen/Gewicht.');
          setImportPreview([]);
          setIsImportModalOpen(true);
        } else {
          const dupSet = new Set<string>(batchDuplicateIds);
          mapped.forEach(o => {
            const ref = (o.referenceNumber || '').toString().trim().toLowerCase();
            if (ref && existingRefSet.has(ref)) {
              dupSet.add(o.id);
            }
          });
          setDuplicateIds(dupSet);
          setImportPreview(mapped);
          setIsImportModalOpen(true);
        }
      }
    } catch (err: any) {
      setImportError('CSV konnte nicht gelesen werden: ' + (err?.message || 'Unbekannter Fehler'));
      setImportPreview([]);
      setIsImportModalOpen(true);
    }
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview.length) {
      setImportError('Keine Aufträge zum Importieren.');
      return;
    }
    const filtered = importPreview.filter(o => !duplicateIds.has(o.id));
    onAddOrders(filtered);
    setImportPreview([]);
    setDuplicateIds(new Set());
    setIsImportModalOpen(false);
  };

  const removeFromImportPreview = (id: string) => {
    setImportPreview(prev => prev.filter(o => o.id !== id));
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden relative">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Auftragsliste
            </h2>
            <p className="text-xs text-slate-500 mt-1">Erfassen Sie alle Lieferziele.</p>
          </div>
          {importError && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1">
              {importError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportClick}
              disabled={isLoading}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="CSV importieren"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={isLoading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Neuen Auftrag hinzufügen"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={handleClearOrders}
              disabled={isLoading || localOrders.length === 0}
              className="p-2 text-white rounded-lg shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed bg-[#ff0000] hover:bg-[#e00000]"
              style={{ boxShadow: '0 10px 25px -12px rgba(255,0,0,0.45)' }}
              title="Auftragsliste leeren"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/30 relative">
          {localOrders.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <Package className="w-8 h-8 opacity-40" />
              </div>
              <p className="font-medium text-slate-600">Liste ist leer</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-sm mt-2 text-blue-600 font-medium hover:underline"
              >
                Ersten Auftrag hinzufügen
              </button>
            </div>
          ) : (
            <ul className="p-4 space-y-2">
              {localOrders.map((order, index) => (
                <li 
                  key={order.id} 
                  draggable={!isLoading}
                  onDragStart={(e) => handleDragStart(e, index, order)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3.5 bg-white rounded-xl border transition-all group
                    ${draggedItemIndex === index ? 'opacity-50 border-blue-400 bg-blue-50' : 'border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'}
                    ${!isLoading ? 'cursor-grab active:cursor-grabbing' : ''}
                  `}
                >
                  <div className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] items-center gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{order.customerName}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5" title={order.address}>{order.address}</p>
                      {order.referenceNumber && (
                         <div className="flex items-center gap-1 mt-1.5">
                           <FileText className="w-3 h-3 text-slate-400" />
                           <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{order.referenceNumber}</span>
                         </div>
                      )}
                    </div>
                    <div className="text-right">
                       <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 min-w-[60px]">
                         {order.weight} kg
                       </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleRemove(order.id)}
                    disabled={isLoading}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="Entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
              <div ref={listEndRef} />
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-3 z-10">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex justify-between items-center text-xs font-medium text-slate-500 px-1">
            <span>{localOrders.length} Positionen</span>
            <span>Gesamt: <span className="text-slate-900 font-bold">{totalWeight} kg</span></span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onPlan}
              disabled={isLoading || localOrders.length === 0}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Berechne Route...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  Touren optimieren
                </>
              )}
            </button>
            
            {hasResults && (
              <button
                onClick={onReset}
                disabled={isLoading}
                className="px-4 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-medium transition-colors shadow-sm"
                title="Zurücksetzen"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800">Neuen Auftrag erfassen</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kunde / Empfänger *</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="z.B. Müller GmbH"
                        autoFocus
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Zielort *</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="PLZ Ort"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Beleg-Nr.</label>
                      <div className="relative group">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="Optional"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gewicht (kg) *</label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="0"
                        max="1300"
                        className="w-full px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={!address || !weight || !customerName}
                      className="w-full px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Auftrag hinzufügen
                    </button>
                  </div>
                </form>
              </div>
           </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">CSV Vorschau</h3>
                <p className="text-xs text-slate-500">Prüfen und ggf. Einträge entfernen.</p>
              </div>
              <button onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {importError}
                </div>
              )}
              {importPreview.length === 0 ? (
                <p className="text-sm text-slate-500">Keine Einträge geladen.</p>
              ) : (
                <ul className="space-y-3">
                  {importPreview.map((order) => (
                    <li 
                      key={order.id} 
                      className={`flex items-center gap-3 p-3.5 rounded-xl border ${duplicateIds.has(order.id) ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{order.customerName}</p>
                        <p className="text-xs text-slate-500 truncate">{order.address}</p>
                        {order.referenceNumber && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              {order.referenceNumber}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 min-w-[60px]">
                          {order.weight} kg
                        </span>
                        {duplicateIds.has(order.id) && (
                          <div className="text-[10px] text-amber-700 mt-1">Duplikat, wird übersprungen</div>
                        )}
                      </div>
                      <button 
                        onClick={() => removeFromImportPreview(order.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                {importPreview.length} Positionen in der Vorschau
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={!importPreview.length}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Importieren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Liste wirklich leeren?</h3>
              <button onClick={() => setShowClearModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600">
                Alle derzeitigen Aufträge in der Liste werden entfernt. Dies betrifft nur die linke Liste, nicht bereits geplante Touren.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={() => { onClearOrders(); setShowClearModal(false); }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Clear modal appended at bottom of component for confirmation
// (placed here to avoid restructuring; uses same styles as other modals)
