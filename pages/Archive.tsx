import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { TourStatus } from '../types';
import { Archive as ArchiveIcon, RefreshCw, MapPin, Truck, Calendar, Package, Image as ImageIcon, FileText, X } from 'lucide-react';

const Archive = () => {
  const { tours, updateTourStatus } = useData();
  const { isAdmin } = useAuth();
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Show both LOADED and explicitly ARCHIVED tours here.
  const archivedTours = tours.filter(
    t => t.status === TourStatus.ARCHIVED || t.status === TourStatus.LOADED
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRestore = (tourId: string) => {
    updateTourStatus(tourId, TourStatus.PLANNING);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-slate-200 rounded-xl text-slate-500">
           <ArchiveIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Touren-Archiv</h2>
          <p className="text-sm text-slate-500">Historie verladener und archivierter Touren</p>
        </div>
      </div>

      {archivedTours.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-6">
            <ArchiveIcon className="text-slate-300" size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Archiv ist leer</h3>
          <p className="text-slate-500 mt-2">Verladene oder manuell archivierte Touren erscheinen hier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 pb-20">
          {archivedTours.map((tour, index) => (
            <div 
              key={tour.id} 
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row hover:shadow-lg hover:border-slate-300 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              
              {/* Left Color Bar */}
              <div className={`h-2 md:h-auto md:w-3 ${tour.status === TourStatus.LOADED ? 'bg-green-500' : 'bg-slate-400'}`}></div>

              <div className="p-6 flex-1 flex flex-col md:flex-row gap-8">
                
                {/* Main Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-slate-900">{tour.name}</h3>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border ${
                      tour.status === TourStatus.LOADED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {tour.status === TourStatus.LOADED ? 'Verladen' : 'Archiviert'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                      <Calendar size={14} className="text-slate-400"/> {new Date(tour.date).toLocaleDateString('de-DE')}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                      <Truck size={14} className="text-slate-400"/> {tour.stops.length} Stopps
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                      <Package size={14} className="text-slate-400"/> {tour.totalWeight} kg
                    </div>
                  </div>

                  {/* Warehouse Data (Image & Note) */}
                  {(tour.loadedImageUrl || tour.loadedNote) && (
                    <div className="mt-6 pt-5 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Lager Protokoll
                      </p>
                      <div className="flex gap-4 items-start">
                        {tour.loadedImageUrl && (
                           <div 
                             className="relative group cursor-pointer"
                             onClick={() => setViewImage(tour.loadedImageUrl || null)}
                           >
                             <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                               <img src={tour.loadedImageUrl} alt="Ladung" className="w-full h-full object-cover" />
                             </div>
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
                               <ImageIcon size={20} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md transform scale-75 group-hover:scale-100 transition-all" />
                             </div>
                           </div>
                        )}
                        {tour.loadedNote && (
                          <div className="flex-1 bg-amber-50/50 p-3 rounded-xl text-sm text-amber-900 border border-amber-100">
                             <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-700 text-xs uppercase tracking-wide">
                               <FileText size={12} /> Notiz
                             </div>
                             <p className="leading-relaxed">{tour.loadedNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stops Preview (Text) */}
                <div className="flex-1 text-sm text-slate-600 md:border-l md:border-slate-100 md:pl-8">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                     <MapPin size={12} /> Route Verlauf
                  </p>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium leading-relaxed text-slate-700">
                    {tour.stops.map(s => s.shippingCity).join(' → ')}
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full md:w-auto flex flex-col justify-center border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                  {isAdmin && (
                    <button 
                      onClick={() => handleRestore(tour.id)}
                      className="whitespace-nowrap flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-all shadow-sm hover:shadow-brand-100"
                      title="Tour wieder aktivieren"
                    >
                      <RefreshCw size={18} />
                      <span className="md:hidden">Wiederherstellen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {viewImage && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button 
              onClick={() => setViewImage(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <img src={viewImage} alt="Ladung Großansicht" className="w-full h-full object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Archive;