import React, { useState, useRef, useEffect } from 'react';
import { Bell, Truck, CheckSquare, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  isMobile?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ isMobile = false }) => {
  const { notifications, markNotificationsRead } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Grouping Logic ---
  const unreadNotifications = notifications.filter(n => !n.read);
  
  const tourNotifications = unreadNotifications.filter(n => n.category === 'TOUR');
  const taskNotifications = unreadNotifications.filter(n => n.category === 'TASK');
  const otherNotifications = unreadNotifications.filter(n => !n.category);

  const handleGroupClick = (category: string, items: typeof notifications) => {
    const ids = items.map(n => n.id);
    markNotificationsRead(ids);
    setIsOpen(false);

    if (category === 'TOUR') {
        const refIds = items.map(n => n.referenceId).filter(Boolean) as string[];
        navigate('/planning', { state: { highlightIds: refIds } });
    } else if (category === 'TASK') {
        navigate('/team');
    }
  };

  const handleMarkAllRead = () => {
    markNotificationsRead();
    setIsOpen(false);
  };

  return (
    <div className={`relative ${isMobile ? '' : ''}`} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f172a] animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <>
          {/* MOBILE BOTTOM SHEET OVERLAY */}
          {isMobile && (
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]" onClick={() => setIsOpen(false)}></div>
          )}

          <div 
            className={`
              bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden z-[100]
              ${isMobile 
                ? 'fixed bottom-[64px] left-0 right-0 h-[50vh] rounded-t-2xl border-t animate-slide-up w-full mx-0 mb-0' // MOBILE: Fixed Bottom Sheet
                : 'absolute top-full mt-2 left-0 w-80 rounded-2xl animate-fade-in-up origin-top-left' // DESKTOP: Left-aligned Dropdown
              }
            `}
          >
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                <h3 className="font-bold text-slate-800 text-sm">Benachrichtigungen</h3>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wide">
                        Alles gelesen
                    </button>
                )}
             </div>

             <div className="overflow-y-auto custom-scrollbar h-full pb-10">
                {unreadCount === 0 && (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Keine neuen Nachrichten.</p>
                    </div>
                )}

                {/* Group: Tours */}
                {tourNotifications.length > 0 && (
                    <div 
                      onClick={() => handleGroupClick('TOUR', tourNotifications)}
                      className="p-4 border-b border-slate-50 hover:bg-brand-50/50 cursor-pointer group transition-colors"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                                <Truck size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800 group-hover:text-brand-700 transition-colors">
                                    {tourNotifications.length} Touren Updates
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                    {tourNotifications[0].text}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-400 mt-2" />
                        </div>
                    </div>
                )}

                {/* Group: Tasks */}
                {taskNotifications.length > 0 && (
                    <div 
                      onClick={() => handleGroupClick('TASK', taskNotifications)}
                      className="p-4 border-b border-slate-50 hover:bg-amber-50/50 cursor-pointer group transition-colors"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                <CheckSquare size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors">
                                    {taskNotifications.length} Neue Aufgaben
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                    {taskNotifications[0].text}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-400 mt-2" />
                        </div>
                    </div>
                )}

                {/* Individual / Other Notifications */}
                {otherNotifications.map(note => (
                    <div key={note.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3">
                        <div className="mt-0.5 text-slate-400"><Info size={16}/></div>
                        <div>
                            <p className="text-xs text-slate-600 leading-snug">{note.text}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;