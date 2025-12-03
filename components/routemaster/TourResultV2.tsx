import React from 'react';
import { Truck, Weight, ArrowRight, Navigation, Map, ExternalLink } from 'lucide-react';
import { RMTour } from '../../types/routemaster';

interface TourResultV2Props {
  tours: RMTour[];
}

export const TourResultV2: React.FC<TourResultV2Props> = ({ tours }) => {
  const generateGoogleMapsLink = (tour: RMTour) => {
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    const origin = encodeURIComponent(tour.startLocation);

    if (!tour.stops.length) return "#";

    const lastStop = tour.stops[tour.stops.length - 1];
    const destination = encodeURIComponent(lastStop.address);

    const waypoints = tour.stops
      .slice(0, tour.stops.length - 1)
      .map((s) => encodeURIComponent(s.address))
      .join('|');

    let url = `${baseUrl}&origin=${origin}&destination=${destination}`;
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints}`;
    }

    return url;
  };

  if (!tours.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center text-slate-400">
        <Navigation className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-slate-600">Warte auf Planung...</h3>
        <p className="max-w-xs mx-auto mt-2">Füge Aufträge hinzu und klicke auf "Touren planen", um die Route zu berechnen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tours.map((tour, index) => (
        <div key={index} className="bg-white rounded-xl shadow-lg border-l-4 border-l-blue-600 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{tour.truckName}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  {tour.stops.length} Stopps • {tour.directionInfo || 'One-Way'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${tour.totalWeight > 1300 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <Weight className="w-4 h-4" />
                <span className="font-bold">
                  {tour.totalWeight} kg
                </span>
                <span className="text-xs opacity-70">/ 1300 kg</span>
              </div>
              
              <a 
                href={generateGoogleMapsLink(tour)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-medium shadow-sm group"
              >
                <Map className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                <span>In Maps öffnen</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

          <div className="p-6">
            <div className="relative border-l-2 border-blue-100 ml-3 space-y-8 pb-2">
              <div className="relative pl-8">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-50"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-blue-600 uppercase mb-1">Start Depot</span>
                  <span className="font-medium text-slate-900">{tour.startLocation}</span>
                </div>
              </div>

              {tour.stops.map((stop, sIndex) => (
                <div key={sIndex} className="relative pl-8 group">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-slate-300 group-hover:border-blue-500 transition-colors"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 group-hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                          {stop.stopNumber}
                        </span>
                        <span className="text-xs font-medium text-slate-400 uppercase">Lieferung</span>
                      </div>
                      <p className="font-medium text-slate-900">{stop.address}</p>
                      {stop.description && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                           <Navigation className="w-3 h-3" />
                           {stop.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-slate-700 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm">
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      Entladen: {stop.weightToUnload} kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
               <div className="text-xs text-slate-500 italic">
                 *Route endet beim letzten Kunden (Keine Rückfahrt).
               </div>
               <a 
                 href={generateGoogleMapsLink(tour)}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
               >
                 Route in Google Maps prüfen <ArrowRight className="w-4 h-4" />
               </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
