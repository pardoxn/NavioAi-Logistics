import React, { useState } from 'react';
import { Truck, Navigation, Map, ExternalLink, FileText, GripVertical, Trash2, X, RotateCcw, Lock, Unlock, MapPin, ThumbsUp, ThumbsDown } from 'lucide-react';
import { RMTour, RMStop } from '../../types/routemaster';

interface TourResultProps {
  tours: RMTour[];
  isLoading: boolean;
  onToursUpdate?: (tours: RMTour[]) => void;
  onMoveOrderToTour?: (orderId: string, tourIndex: number) => void;
  onMoveStopToTour?: (sourceTourIndex: number, stopIndex: number, targetTourIndex: number) => void;
  onRemoveStop?: (tourIndex: number, stopIndex: number, action: 'restore' | 'delete') => void;
  onToggleLock?: (tourIndex: number) => void;
  onPrintCMR?: (tour: RMTour) => void;
  onFeedback?: (tour: RMTour, rating: 'UP' | 'DOWN') => void;
}

export const TourResultV2: React.FC<TourResultProps> = ({ 
  tours, 
  isLoading, 
  onToursUpdate,
  onMoveOrderToTour,
  onMoveStopToTour,
  onRemoveStop,
  onToggleLock,
  onPrintCMR,
  onFeedback
}) => {
  const [draggedStop, setDraggedStop] = useState<{ tourIndex: number; stopIndex: number } | null>(null);
  const [dragOverTourIndex, setDragOverTourIndex] = useState<number | null>(null);
  
  const [deleteModal, setDeleteModal] = useState<{tourIndex: number, stopIndex: number} | null>(null);

  const START_GEO = { lat: 51.516, lng: 8.698 };

  const getZip = (input?: string) => {
    if (!input) return '';
    const match = input.match(/\b\d{4,5}\b/);
    return match ? match[0] : '';
  };

  const generateGoogleMapsLink = (tour: RMTour) => {
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    const origin = encodeURIComponent(getZip(tour.startLocation) || tour.startLocation);
    
    if (tour.stops.length === 0) return "#";

    const lastStop = tour.stops[tour.stops.length - 1];
    const destination = encodeURIComponent(getZip(lastStop.address) || lastStop.address);

    const waypoints = tour.stops
      .slice(0, tour.stops.length - 1)
      .map(s => encodeURIComponent(getZip(s.address) || s.address))
      .filter(Boolean)
      .join('|');

    let url = `${baseUrl}&origin=${origin}&destination=${destination}`;
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints}`;
    }
    
    return url;
  };

  const getWeightColor = (weight: number) => {
    if (weight > 1300) return 'bg-red-500';
    if (weight > 650) return 'bg-emerald-500';
    return 'bg-amber-400';
  };

  const getWeightPercentage = (weight: number) => {
    return Math.min((weight / 1300) * 100, 100);
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
  };

  const calculateRouteDistance = (stops: RMStop[]) => {
    let totalDist = 0;
    let currentPos = START_GEO;

    stops.forEach((stop, idx) => {
      if (stop.geo && typeof stop.geo.lat === 'number' && typeof stop.geo.lng === 'number') {
        const dist = getDistanceFromLatLonInKm(currentPos.lat, currentPos.lng, stop.geo.lat, stop.geo.lng);
        totalDist += dist * 1.3;
        currentPos = stop.geo;
      } else {
        // Fallback: grob 15km für ersten Sprung, danach 10km je weiterer Stopp
        totalDist += idx === 0 ? 15 : 10;
      }
    });

    return Math.round(totalDist);
  };

  const handleDragStart = (e: React.DragEvent, tourIndex: number, stopIndex: number) => {
    if (tours[tourIndex].isLocked) {
        e.preventDefault();
        return;
    }

    setDraggedStop({ tourIndex, stopIndex });
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'STOP_FROM_TOUR',
      sourceTourIndex: tourIndex,
      stopIndex: stopIndex
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverStop = (e: React.DragEvent, tourIndex: number, stopIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedStop || draggedStop.tourIndex !== tourIndex || draggedStop.stopIndex === stopIndex) return;
    if (tours[tourIndex].isLocked) return;

    const newTours = JSON.parse(JSON.stringify(tours)) as RMTour[];
    const currentTour = newTours[tourIndex];
    
    const [movedStop] = currentTour.stops.splice(draggedStop.stopIndex, 1);
    currentTour.stops.splice(stopIndex, 0, movedStop);

    currentTour.stops.forEach((stop, idx) => {
        stop.stopNumber = idx + 1;
    });

    if (onToursUpdate) {
        onToursUpdate(newTours);
    }
    setDraggedStop({ tourIndex, stopIndex });
  };

  const handleTourDragOver = (e: React.DragEvent, tourIndex: number) => {
    e.preventDefault();
    if (tours[tourIndex].isLocked) return;
    setDragOverTourIndex(tourIndex);
  };

  const handleTourDragLeave = () => {
    setDragOverTourIndex(null);
  };

  const handleTourDrop = (e: React.DragEvent, targetTourIndex: number) => {
    e.preventDefault();
    setDragOverTourIndex(null);
    
    if (tours[targetTourIndex].isLocked) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.type === 'ORDER_FROM_LIST' && onMoveOrderToTour) {
        onMoveOrderToTour(data.orderId, targetTourIndex);
      } 
      else if (data.type === 'STOP_FROM_TOUR' && onMoveStopToTour) {
        if (data.sourceTourIndex !== targetTourIndex) {
          onMoveStopToTour(data.sourceTourIndex, data.stopIndex, targetTourIndex);
        }
      }
    } catch (err) {
      console.error("Drop failed", err);
    }
  };

  const handleDragEnd = () => {
    setDraggedStop(null);
    setDragOverTourIndex(null);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Ergebnis & Routen
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {tours.length > 0 
                ? `${tours.length} optimierte ${tours.length === 1 ? 'Tour' : 'Touren'} bereit.` 
                : 'Warte auf Berechnung...'}
            </p>
          </div>
          {tours.length > 0 && !isLoading && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               Optimierung erfolgreich
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-50/30 relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] transition-all animate-in fade-in duration-300">
               <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6 shadow-lg"></div>
               <div className="bg-white px-6 py-4 rounded-2xl shadow-xl border border-slate-100 text-center">
                 <p className="font-bold text-slate-800">KI optimiert Routen...</p>
                 <p className="text-xs text-slate-500 mt-1">Neue Aufträge werden integriert & sortiert.</p>
               </div>
            </div>
          )}

          {!isLoading && tours.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <Navigation className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-base font-semibold text-slate-600">Keine Planung vorhanden</h3>
              <p className="text-sm mt-2 max-w-xs mx-auto text-slate-500">
                Klicken Sie links auf "Touren optimieren", um die Berechnung zu starten.
              </p>
            </div>
          )}

          {tours.length > 0 && (
            <div className={`space-y-6 ${isLoading ? 'opacity-40 pointer-events-none filter blur-[1px]' : ''} transition-all duration-500`}>
              {tours.map((tour, tourIndex) => (
                <div 
                  key={tour.id || tourIndex} 
                  onDragOver={(e) => handleTourDragOver(e, tourIndex)}
                  onDragLeave={handleTourDragLeave}
                  onDrop={(e) => handleTourDrop(e, tourIndex)}
                  className={`rounded-xl shadow-sm border overflow-hidden group transition-all relative
                    ${tour.isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}
                    ${!tour.isLocked && dragOverTourIndex === tourIndex ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xl' : ''}
                    ${!tour.isLocked ? 'hover:border-blue-300 hover:shadow-md' : ''}
                  `}
                >
                  <div className={`p-4 border-b border-slate-100 transition-colors relative
                     ${tour.isLocked ? 'bg-slate-100/50' : 'bg-gradient-to-r from-slate-50 to-white'}
                  `}>
                    <div className="flex flex-wrap gap-4 justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 text-white rounded-lg flex items-center justify-center shadow-lg transition-all
                          ${tour.isLocked ? 'bg-slate-400 shadow-slate-400/20' : 'bg-blue-600 shadow-blue-600/20'}
                        `}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className={`font-bold ${tour.isLocked ? 'text-slate-500' : 'text-slate-800'}`}>
                            {tour.truckName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/50 text-slate-600 font-medium">
                              {tour.stops.length} Stopps
                            </span>
                            {tour.stops.length > 0 && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    ~{calculateRouteDistance(tour.stops)} km
                                </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                         <button 
                          onClick={() => onPrintCMR && onPrintCMR(tour)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          title="Frachtbrief erstellen"
                          disabled={!onPrintCMR}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          CMR
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </button>

                        <a 
                          href={generateGoogleMapsLink(tour)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Map className="w-3.5 h-3.5" />
                          Maps
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                        
                        <button 
                          onClick={() => onToggleLock && onToggleLock(tourIndex)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 border transition-all
                            ${tour.isLocked 
                                ? 'bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-300' 
                                : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
                          `}
                        >
                          {tour.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          {tour.isLocked ? 'Locked' : 'Lock'}
                        </button>
                        <button
                          onClick={() => onFeedback && onFeedback(tour, 'UP')}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          title="Positive Rückmeldung"
                          disabled={!onFeedback}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onFeedback && onFeedback(tour, 'DOWN')}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                          title="Negative Rückmeldung"
                          disabled={!onFeedback}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                       <Navigation className="w-3 h-3" />
                       Start: <span className="font-medium text-slate-700">{tour.startLocation}</span>
                       {tour.directionInfo && (
                         <span className="text-slate-400 mx-1">• {tour.directionInfo}</span>
                       )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100">
                        <div 
                            className={`h-full transition-all duration-500 ${tour.isLocked ? 'bg-slate-300' : getWeightColor(tour.totalWeight)}`}
                            style={{ width: `${getWeightPercentage(tour.totalWeight)}%` }}
                        />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/50 min-h-[100px]">
                    {tour.stops.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        <p className="text-xs">Ziehen Sie Aufträge hierher</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tour.stops.map((stop, stopIndex) => {
                          const number = stop.stopNumber || stopIndex + 1;
                          return (
                          <div 
                            key={`${tourIndex}-${stopIndex}`}
                            draggable={!tour.isLocked}
                            onDragStart={(e) => handleDragStart(e, tourIndex, stopIndex)}
                            onDragOver={(e) => handleDragOverStop(e, tourIndex, stopIndex)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-start gap-3 p-3 bg-white rounded-lg border transition-all relative group
                              ${draggedStop?.tourIndex === tourIndex && draggedStop?.stopIndex === stopIndex ? 'opacity-40 border-dashed border-blue-400' : 'border-slate-200 shadow-sm'}
                              ${!tour.isLocked ? 'hover:border-blue-300' : ''}
                            `}
                          >
                            {!tour.isLocked && (
                                <div className="mt-1 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500">
                                <GripVertical className="w-4 h-4" />
                                </div>
                            )}

                            <div className="flex-none flex flex-col items-center gap-1 min-w-[24px] mt-0.5">
                              <span className="text-xs font-bold text-slate-600">{number}</span>
                              <div className="w-0.5 h-full bg-slate-100 min-h-[10px] last:hidden" />
                            </div>

                            <div className="flex-1 min-w-0 pb-1">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 leading-tight mb-0.5">
                                        {stop.customerName || 'Kunde'}
                                    </p>
                                    <p className="text-xs text-slate-500 leading-snug">
                                        {stop.address}
                                    </p>
                                    
                                    {stop.referenceNumber && (
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <FileText className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                {stop.referenceNumber}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap`}>
                                        {stop.weightToUnload} kg
                                    </span>
                                    
                                    {!tour.isLocked && (
                                        <button 
                                            onClick={() => setDeleteModal({tourIndex, stopIndex})}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Entfernen"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                              </div>
                              {stop.description && (
                                <p className="text-[10px] text-blue-600/70 mt-1 italic">
                                    {stop.description}
                                </p>
                              )}
                            </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteModal && onRemoveStop && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Stop entfernen?</h3>
                <button onClick={() => setDeleteModal(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Möchten Sie den Stopp aus der Tour entfernen oder zurück in die Auftragsliste legen?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onRemoveStop(deleteModal.tourIndex, deleteModal.stopIndex, 'restore');
                      setDeleteModal(null);
                    }}
                    className="px-4 py-3 rounded-xl border border-blue-200 text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Zur Liste
                  </button>
                  <button
                    onClick={() => {
                      onRemoveStop(deleteModal.tourIndex, deleteModal.stopIndex, 'delete');
                      setDeleteModal(null);
                    }}
                    className="px-4 py-3 rounded-xl border border-red-200 text-red-700 font-semibold bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                </div>
             </div>
           </div>
        </div>
      )}
    </>
  );
};
