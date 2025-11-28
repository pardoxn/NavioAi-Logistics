
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { History, Undo2, Trash2, XCircle, FileWarning, Clock } from 'lucide-react';
import { ActivityLog } from '../types';

const Activities = () => {
  const { activities, restoreActivity } = useData();
  const [now, setNow] = useState(Date.now());

  // Update timer every minute to refresh "expired" status
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRestore = (id: string) => {
    const success = restoreActivity(id);
    if (!success) {
      alert("Aktion kann nicht mehr rückgängig gemacht werden (Zeit abgelaufen).");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'DELETE_ORDER': return <Trash2 size={16} />;
      case 'DISSOLVE_TOUR': return <XCircle size={16} />;
      case 'DELETE_TOUR_FULL': return <FileWarning size={16} />;
      default: return <History size={16} />;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-slate-50 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-white border border-slate-200 rounded-xl text-brand-600 shadow-sm">
           <History size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Aktivitäten & Wiederherstellung</h2>
          <p className="text-sm text-slate-500">Protokoll der letzten Aktionen. Änderungen können 10 Minuten lang rückgängig gemacht werden.</p>
        </div>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
           <div className="text-center py-20 text-slate-400">
             <Clock size={48} className="mx-auto mb-4 opacity-20" />
             <p>Keine aufgezeichneten Aktivitäten.</p>
           </div>
        ) : (
          activities.map((activity) => {
            const timeDiff = now - activity.timestamp;
            const isExpired = timeDiff > 10 * 60 * 1000; // 10 minutes
            const canRestore = !activity.isRestored && !isExpired;

            return (
              <div 
                key={activity.id} 
                className={`bg-white rounded-xl border p-4 flex flex-col md:flex-row items-center gap-4 transition-all hover:shadow-md ${activity.isRestored ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}
              >
                {/* Time */}
                <div className="flex flex-col items-center justify-center min-w-[80px] text-xs font-mono text-slate-400 border-r border-slate-100 pr-4">
                  <span className="font-bold text-slate-700 text-sm">{formatTime(activity.timestamp)}</span>
                  <span>{formatDate(activity.timestamp)}</span>
                </div>

                {/* Icon & User */}
                <div className="flex items-center gap-4 min-w-[200px]">
                   <div className={`p-2.5 rounded-full ${
                      activity.type === 'DELETE_ORDER' ? 'bg-orange-50 text-orange-600' :
                      activity.type === 'DELETE_TOUR_FULL' ? 'bg-red-50 text-red-600' :
                      'bg-slate-100 text-slate-600'
                   }`}>
                      {getIcon(activity.type)}
                   </div>
                   <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">User</p>
                      <p className="text-sm font-semibold text-slate-700">{activity.userName}</p>
                   </div>
                </div>

                {/* Details */}
                <div className="flex-1 text-sm text-slate-600">
                  <p className="font-medium">{activity.description}</p>
                  {activity.isRestored && <span className="text-xs text-green-600 font-bold flex items-center gap-1 mt-1">● Wiederhergestellt</span>}
                </div>

                {/* Action */}
                <div className="ml-auto">
                  {canRestore ? (
                    <button 
                      onClick={() => handleRestore(activity.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg hover:bg-brand-100 transition-colors shadow-sm"
                    >
                      <Undo2 size={14} /> Rückgängig
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 px-4 py-2 bg-slate-50 rounded-lg cursor-not-allowed">
                      {activity.isRestored ? 'Erledigt' : 'Zeit abgelaufen'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Activities;
