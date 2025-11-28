import React from 'react';
import { useData } from '../context/DataContext';
import { Truck, Package, Activity, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { orders, tours } = useData();

  const totalWeight = orders.reduce((sum, o) => sum + o.totalWeightKg, 0);
  const plannedOrders = orders.filter(o => o.isPlanned).length;
  
  const chartData = tours.map(t => ({
    name: t.name.split(' - ')[1] || t.name,
    weight: t.totalWeight,
    stops: t.stops.length
  }));

  // Helper for Bento Card
  const BentoCard = ({ title, value, icon: Icon, colorClass, delay }: any) => (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 animate-fade-in-up ${delay}`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100`}>
          <Icon size={24} />
        </div>
        <div className="text-xs font-bold px-2 py-1 bg-slate-50 rounded-full text-slate-400 flex items-center gap-1">
          +2.4% <ArrowUpRight size={10} />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        <p className="text-sm text-slate-500 font-medium mt-1">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500 mt-1">Überblick über Logistik und Auslastung.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <BentoCard 
          title="Offene Aufträge" 
          value={orders.length - plannedOrders} 
          icon={Package} 
          colorClass="bg-brand-500 text-brand-600"
          delay="" 
        />
        <BentoCard 
          title="Aktive Touren" 
          value={tours.length} 
          icon={Truck} 
          colorClass="bg-green-500 text-green-600"
          delay="animation-delay-200"
        />
        <BentoCard 
          title="Gesamtgewicht (t)" 
          value={(totalWeight / 1000).toFixed(1)} 
          icon={Activity} 
          colorClass="bg-amber-500 text-amber-600"
          delay="animation-delay-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in-up animation-delay-500">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity size={18} className="text-brand-500" /> Auslastung pro Tour
          </h3>
          <div className="h-80">
            {tours.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Bar dataKey="weight" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300">
                 <Truck size={48} className="mb-2 opacity-20" />
                 <span className="text-sm">Keine Tourendaten verfügbar</span>
               </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in-up animation-delay-500 h-[420px] overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Activity Feed</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {orders.length === 0 && tours.length === 0 && (
               <div className="text-center text-slate-400 py-10 text-sm">Keine Aktivitäten</div>
            )}
            {orders.slice(0, 5).map((o, i) => (
               <div key={o.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-colors">
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-400"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Auftrag {o.documentNumber}</p>
                    <p className="text-xs text-slate-500 truncate w-40">{o.customerName1}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-mono text-slate-400">09:41</span>
               </div>
            ))}
            {tours.slice(0, 3).map((t, i) => (
               <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-colors">
                  <div className="mt-1 w-2 h-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="text-sm font-medium text-brand-700">Tour "{t.name}"</p>
                    <p className="text-xs text-slate-500">{t.stops.length} Stopps geplant</p>
                  </div>
                  <span className="ml-auto text-[10px] font-mono text-slate-400">10:15</span>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;