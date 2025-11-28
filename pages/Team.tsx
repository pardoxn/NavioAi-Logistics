
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Send, CheckSquare, Square, Bell, MessageSquare, Clock, CheckCircle2, User, AlertTriangle, Info } from 'lucide-react';

const Team = () => {
  const { chatMessages, notifications, sendChatMessage, toggleTaskDone, markNotificationsRead } = useData();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isTask, setIsTask] = useState(false);
  const [assignee, setAssignee] = useState<string>('');
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Mark notifications as read when entering the page
  useEffect(() => {
    markNotificationsRead();
  }, []);

  // Load user list from API (for assignment)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) return;
        const data = await res.json();
        const mapped = (data.users || []).map((u: any) => ({
          id: u.id,
          name: u.fullName || u.email || 'User'
        }));
        setUserOptions(mapped);
      } catch (e) {
        // ignore, fallback to participants from chat
      }
    };
    loadUsers();
  }, []);

  const participants = Array.from(
    new Map(
      chatMessages.map(m => [m.userId, { id: m.userId, name: m.userName }])
    ).values()
  );
  const assigneeOptions = [
    ...participants,
    ...userOptions
  ].filter(Boolean).reduce((acc: { id: string; name: string }[], curr) => {
    if (!acc.find(a => a.id === curr.id)) acc.push(curr);
    return acc;
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const selected = assignee ? JSON.parse(assignee) as { id: string; name: string } : undefined;
    sendChatMessage(newMessage, isTask, selected);
    setNewMessage('');
    setIsTask(false);
    setAssignee('');
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 lg:pt-4 overflow-hidden">
      
      {/* LEFT: CHAT & TASKS */}
      <div className="flex-1 flex flex-col w-full lg:max-w-4xl border-b lg:border-b-0 lg:border-r border-slate-200/60 bg-white lg:bg-white/50 backdrop-blur-sm">
        
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
             <div className="p-2 bg-brand-50 rounded-lg text-brand-600"><MessageSquare size={24} /></div>
             Team Chat
           </h2>
           <div className="text-xs font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-500">
             {user?.username} (Online)
           </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
           {chatMessages.length === 0 && (
             <div className="text-center text-slate-400 py-20">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20"/>
                <p>Noch keine Nachrichten. Starte eine Unterhaltung!</p>
             </div>
           )}
           
           {chatMessages.map(msg => {
             const isMe = msg.userId === user?.id;
             return (
               <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0 ${isMe ? 'bg-brand-500' : 'bg-slate-400'}`}>
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>
                  
                     <div className={`max-w-[85%] lg:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                     <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-bold text-slate-600">{msg.userName}</span>
                        <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
                     </div>
                     
                     <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed relative group ${
                       isMe ? 'bg-brand-50 text-brand-900 rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                     }`}>
                        {msg.isTask && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/5">
                             <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-white/50 px-2 py-0.5 rounded">Aufgabe</span>
                             {msg.assigneeName && (
                               <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                 <User size={12} className="text-brand-600" /> {msg.assigneeName}
                               </span>
                             )}
                          </div>
                        )}
                        <p className={msg.isTask && msg.isDone ? 'line-through opacity-50' : ''}>{msg.text}</p>
                        
                        {msg.isTask && (
                          <button 
                            onClick={() => toggleTaskDone(msg.id)}
                            className={`mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors w-full justify-center ${
                              msg.isDone 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
                            {msg.isDone ? <CheckSquare size={14}/> : <Square size={14}/>}
                            {msg.isDone ? 'Erledigt' : 'Als erledigt markieren'}
                          </button>
                        )}
                     </div>
                  </div>
               </div>
             );
           })}
        </div>

        {/* Input Area */}
        <div className="p-3 lg:p-4 bg-white border-t border-slate-100 sticky bottom-0">
           <form onSubmit={handleSend} className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch lg:items-end max-w-3xl mx-auto">
              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-brand-100 focus-within:border-brand-300 transition-all flex items-center p-1">
                 <button
                   type="button"
                   onClick={() => setIsTask(!isTask)}
                   className={`p-2 rounded-lg transition-colors ${isTask ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-200'}`}
                   title="Als Aufgabe markieren"
                 >
                   <CheckCircle2 size={20} />
                 </button>
                 <input 
                   type="text"
                   value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isTask ? "Neue Aufgabe erstellen..." : "Nachricht schreiben..."}
                  className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-3 text-sm text-slate-800 placeholder-slate-400"
                />
              </div>
              {isTask && (
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="text-sm bg-transparent border-none focus:outline-none"
                  >
                    <option value="">Zuweisen (optional)</option>
                    {assigneeOptions.map(p => (
                      <option key={p.id} value={JSON.stringify(p)}>
                        {p.name}
                      </option>
                    ))}
                    {user && !assigneeOptions.find(p => p.id === user.id) && (
                      <option value={JSON.stringify({ id: user.id, name: user.username })}>
                        {user.username}
                      </option>
                    )}
                  </select>
                </div>
              )}
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/30 transition-all active:scale-95 lg:self-end"
              >
                <Send size={20} />
              </button>
           </form>
        </div>
      </div>

      {/* RIGHT: NOTIFICATIONS */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col hidden xl:flex shadow-xl shadow-slate-200/50 z-10">
         <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Bell size={18} className="text-slate-400" />
              Meldungen
            </h3>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
            {notifications.length === 0 ? (
               <div className="text-center text-slate-400 mt-10 text-sm">Keine neuen Meldungen.</div>
            ) : (
               notifications.map(note => (
                 <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-3 animate-fade-in-up">
                    <div className={`mt-0.5 ${
                       note.type === 'SUCCESS' ? 'text-green-500' : 
                       note.type === 'WARNING' ? 'text-amber-500' : 'text-blue-500'
                    }`}>
                       {note.type === 'SUCCESS' ? <CheckCircle2 size={16}/> : 
                        note.type === 'WARNING' ? <AlertTriangle size={16}/> : <Info size={16}/>}
                    </div>
                    <div>
                       <p className="text-sm text-slate-700 leading-snug">{note.text}</p>
                       <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                         <Clock size={10} /> {formatTime(note.timestamp)}
                       </p>
                    </div>
                 </div>
               ))
            )}
         </div>
      </div>

    </div>
  );
};

export default Team;
