import React, { useState } from 'react';
import { Plus, Trash2, Package, MapPin } from 'lucide-react';
import { RMOrder } from '../../types/routemaster';

interface OrderInputV2Props {
  orders: RMOrder[];
  onAdd: (order: RMOrder) => void;
  onRemove: (orderId: string) => void;
}

export const OrderInputV2: React.FC<OrderInputV2Props> = ({ orders, onAdd, onRemove }) => {
  const [address, setAddress] = useState('');
  const [weight, setWeight] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !weight) return;

    const newOrder: RMOrder = {
      id: crypto.randomUUID(),
      address: address.trim(),
      weight: Number(weight)
    };

    onAdd(newOrder);
    setAddress('');
    setWeight('');
  };

  const handleRemove = (id: string) => {
    onRemove(id);
  };

  const totalWeight = orders.reduce((sum, order) => sum + order.weight, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Aufträge erfassen
        </h2>
        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          Max 1300kg pro Tour
        </span>
      </div>

      <form onSubmit={handleAdd} className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Zielort (Adresse/PLZ)</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="z.B. Hauptstr. 1, 10115 Berlin"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Gewicht (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              max="1300"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit"
              disabled={!address || !weight}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </div>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto pr-2">
        {orders.length === 0 ? (
          <div className="text-center text-slate-400 py-12 flex flex-col items-center">
            <Package className="w-12 h-12 mb-3 opacity-20" />
            <p>Noch keine Aufträge in der Liste.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-medium text-slate-800 truncate">{order.address}</p>
                  <p className="text-sm text-slate-500">{order.weight} kg</p>
                </div>
                <button 
                  onClick={() => handleRemove(order.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-medium">
        <span className="text-slate-600">Aufträge gesamt: {orders.length}</span>
        <span className="text-slate-800">Gesamtgewicht: {totalWeight} kg</span>
      </div>
    </div>
  );
};
