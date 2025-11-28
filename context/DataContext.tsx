
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Order, Tour, TourStatus, ActivityLog, ActivityType, ChatMessage, Notification, FreightStatus, NotificationCategory, CmrConfig } from '../types';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

// Fallback to LocalStorage for Demo purposes since Supabase keys might be missing
// In a real deployment with keys, one would switch this back to Supabase logic.

interface DataContextType {
  orders: Order[];
  tours: Tour[];
  activities: ActivityLog[];
  chatMessages: ChatMessage[];
  notifications: Notification[];
  unreadNotificationsCount: number;
  cmrConfig: CmrConfig;
  
  addOrders: (newOrders: Order[]) => void;
  addTour: (tour: Tour) => void;
  setTours: (tours: Tour[]) => void;
  updateTourStatus: (tourId: string, status: TourStatus) => void;
  setTourFreightStatus: (tourId: string, status: FreightStatus) => void;
  completeTourLoading: (tourId: string, imageFile: File, note: string) => Promise<void>;
  updateOrderPlannedStatus: (orderIds: string[], planned: boolean) => void;
  deleteTour: (tourId: string) => void; 
  deleteTourAndOrders: (tourId: string) => void;
  removeOrder: (orderId: string) => void;
  removeOrders: (orderIds: string[]) => void; // Bulk delete
  dissolveAllTours: () => void; // Reset everything
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  moveOrderToTour: (orderId: string, targetTourId: string, targetIndex?: number) => void;
  moveOrderToPool: (orderId: string) => void;
  reorderTourStops: (tourId: string, startIndex: number, endIndex: number) => void;
  restoreActivity: (activityId: string) => boolean;
  
  updateCmrConfig: (config: CmrConfig) => void;

  // Team Features
  sendChatMessage: (text: string, isTask: boolean, assignee?: { id: string; name: string }) => Promise<void>;
  toggleTaskDone: (messageId: string) => void;
  markNotificationsRead: (ids?: string[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Initialize State from LocalStorage
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('navio_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [tours, setToursState] = useState<Tour[]>(() => {
    const saved = localStorage.getItem('navio_tours');
    return saved ? JSON.parse(saved) : [];
  });

  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('navio_activities');
    return saved ? JSON.parse(saved) : [];
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('navio_chat');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('navio_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [cmrConfig, setCmrConfig] = useState<CmrConfig>(() => {
    const saved = localStorage.getItem('navio_cmr_config');
    // Init with detailed structure if not found or if old structure detected
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.sender && typeof parsed.sender === 'object') return parsed;
    }
    
    // Default CMR Standard Coordinates (Approximate mm)
    return {
      sender: { x: 15, y: 28, visible: true, label: 'Feld 1: Absender', value: 'Werny-Handel GmbH & Co. KG\nOstring 3\n33181 Bad Wünnenberg-Fürstenberg' },
      consignee: { x: 15, y: 60, visible: true, label: 'Feld 2: Empfänger', value: '' },
      deliveryPlace: { x: 15, y: 88, visible: true, label: 'Feld 3: Auslieferungsort', value: '' },
      loadingPlace: { x: 15, y: 105, visible: true, label: 'Feld 4: Ort/Tag Übernahme', value: '33181 Bad Wünnenberg\nDeutschland' },
      documents: { x: 15, y: 115, visible: true, label: 'Feld 5: Beigefügte Dokumente', value: '' },
      marks: { x: 15, y: 135, visible: true, label: 'Feld 6: Kennzeichen', value: '' },
      packCount: { x: 35, y: 135, visible: true, label: 'Feld 7: Anzahl Packstücke', value: '1' },
      packaging: { x: 50, y: 135, visible: true, label: 'Feld 8: Art der Verpackung', value: 'Einweg' },
      goodsDesc: { x: 75, y: 135, visible: true, label: 'Feld 9: Bezeichnung', value: 'Stalleinrichtung' },
      weight: { x: 150, y: 135, visible: true, label: 'Feld 11: Bruttogewicht', value: '' },
      remarks: { x: 15, y: 160, visible: true, label: 'Feld 13: Anweisungen', value: 'Telefonnummer:' },
      carrier: { x: 110, y: 28, visible: false, label: 'Feld 16: Frachtführer', value: '' }, // Hidden by request
      footerPlace: { x: 15, y: 235, visible: true, label: 'Feld 21: Ausgestellt in', value: '33181 Bad Wünnenberg' },
      footerSignature: { x: 145, y: 250, visible: true, label: 'Feld 24: Palettentausch (X)', value: 'X' },
    };
  });

  // Persist Changes
  useEffect(() => {
    localStorage.setItem('navio_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('navio_tours', JSON.stringify(tours));
  }, [tours]);

  useEffect(() => {
    localStorage.setItem('navio_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('navio_chat', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // --- Supabase Chat Sync ---
  const mapRowToChat = (row: any): ChatMessage => ({
    id: row.id,
    userId: row.user_id ?? row.userId,
    userName: row.user_name ?? row.userName ?? 'User',
    text: row.text,
    timestamp: Number(row.timestamp),
    isTask: Boolean(row.is_task ?? row.isTask),
    isDone: Boolean(row.is_done ?? row.isDone),
    assigneeId: row.assignee_id ?? row.assigneeId ?? null,
    assigneeName: row.assignee_name ?? row.assigneeName ?? null,
  });

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(500);
      if (!error && data) {
        setChatMessages((data as any[]).map(mapRowToChat));
      }
    };
    load();

    const channel = supabase
      .channel('chat_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = mapRowToChat(payload.new);
          setChatMessages(prev => prev.find(p => p.id === msg.id) ? prev : [...prev, msg]);
        } else if (payload.eventType === 'UPDATE') {
          const msg = mapRowToChat(payload.new);
          setChatMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('navio_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('navio_cmr_config', JSON.stringify(cmrConfig));
  }, [cmrConfig]);

  // --- Helper: Add Notification ---
  const addNotification = (text: string, type: 'INFO' | 'WARNING' | 'SUCCESS' = 'INFO', category?: NotificationCategory, referenceId?: string) => {
    const newNotif: Notification = {
      id: uuidv4(),
      text,
      type,
      category,
      referenceId,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationsRead = (ids?: string[]) => {
    if (ids) {
        // Mark specific notifications as read (e.g. those clicked)
        setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    } else {
        // Mark all
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // --- Activity Logging ---
  const logActivity = (type: ActivityType, description: string, snapshot: any) => {
    const newActivity: ActivityLog = {
      id: uuidv4(),
      timestamp: Date.now(),
      userId: user?.id || 'unknown',
      userName: user?.username || 'System',
      type,
      description,
      snapshot,
      isRestored: false
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  const restoreActivity = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity || activity.isRestored) return false;

    if (Date.now() - activity.timestamp > 10 * 60 * 1000) return false;

    if (activity.type === 'DELETE_ORDER') {
      if (Array.isArray(activity.snapshot)) {
         setOrders(prev => [...prev, ...activity.snapshot]);
      } else {
         const order = activity.snapshot as Order;
         setOrders(prev => [...prev, order]);
      }
    } else if (activity.type === 'DISSOLVE_TOUR') {
      if (Array.isArray(activity.snapshot)) {
         const toursToRestore = activity.snapshot as Tour[];
         setToursState(prev => [...prev, ...toursToRestore]);
         const allOrderIds = toursToRestore.flatMap(t => t.stops.map(s => s.id));
         updateOrderPlannedStatus(allOrderIds, true);
      } else {
         const tour = activity.snapshot as Tour;
         setToursState(prev => [...prev, tour]);
         const orderIds = tour.stops.map(s => s.id);
         updateOrderPlannedStatus(orderIds, true);
      }
    } else if (activity.type === 'DELETE_TOUR_FULL') {
       const { tour, orders: tOrders } = activity.snapshot as { tour: Tour, orders: Order[] };
       setOrders(prev => [...prev, ...tOrders]);
       setToursState(prev => [...prev, tour]);
    }

    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, isRestored: true } : a));
    return true;
  };

  // --- ACTIONS ---

  const addOrders = (newOrders: Order[]) => {
    const existingIds = new Set(orders.map(o => o.documentNumber));
    const filtered = newOrders.filter(o => !existingIds.has(o.documentNumber));
    if (filtered.length > 0) {
      setOrders(prev => [...prev, ...filtered]);
      addNotification(`${filtered.length} neue Aufträge importiert.`);
    }
  };

  const addTour = (tour: Tour) => {
    setToursState(prev => [...prev, tour]);
    // Tag with Category TOUR and reference ID
    addNotification(`Neue Tour "${tour.name}" geplant.`, 'INFO', 'TOUR', tour.id);
  };

  const setTours = (newTours: Tour[]) => {
    setToursState(newTours);
  };

  const updateTourStatus = (tourId: string, status: TourStatus) => {
    setToursState(prev => prev.map(t => t.id === tourId ? { ...t, status } : t));
    
    const tour = tours.find(t => t.id === tourId);
    if (tour && status === TourStatus.LOCKED) {
        addNotification(`Tour "${tour.name}" wurde gesperrt und ist bereit zum Verladen.`, 'WARNING', 'TOUR', tour.id);
    }
  };

  const setTourFreightStatus = (tourId: string, status: FreightStatus) => {
    setToursState(prev => prev.map(t => t.id === tourId ? { ...t, freightStatus: status } : t));
    
    const tour = tours.find(t => t.id === tourId);
    if (tour && status === 'CONFIRMED') {
        addNotification(`FAHRER BESTÄTIGT: Für Tour "${tour.name}" ist ein Fahrzeug unterwegs!`, 'SUCCESS', 'TOUR', tour.id);
    }
  };

  const completeTourLoading = (tourId: string, imageFile: File, note: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setToursState(prev => prev.map(t => t.id === tourId ? { 
                ...t, 
                status: TourStatus.LOADED,
                loadedImageUrl: base64String,
                loadedNote: note
            } : t));
            
            const tour = tours.find(t => t.id === tourId);
            addNotification(`Tour "${tour?.name || 'Unbekannt'}" wurde erfolgreich verladen.`, 'SUCCESS', 'TOUR', tourId);
            resolve();
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
    });
  };

  const updateOrderPlannedStatus = (orderIds: string[], planned: boolean) => {
    const idSet = new Set(orderIds);
    setOrders(prev => prev.map(o => idSet.has(o.id) ? { ...o, isPlanned: planned } : o));
  };

  const deleteTour = (tourId: string) => {
    const tourToDelete = tours.find(t => t.id === tourId);
    if (!tourToDelete) return;

    logActivity('DISSOLVE_TOUR', `Tour aufgelöst: ${tourToDelete.name}`, tourToDelete);

    const orderIdsToRelease = tourToDelete.stops.map(s => s.id);
    updateOrderPlannedStatus(orderIdsToRelease, false);
    
    // Remove tour and re-number remaining active tours
    setToursState(prev => {
        const remaining = prev.filter(t => t.id !== tourId);
        return remaining.map((t, index) => {
            // Only rename if it follows the "Number. City" pattern
            const newName = t.name.replace(/^\d+\./, `${index + 1}.`);
            return { ...t, name: newName };
        });
    });
    
    addNotification(`Tour "${tourToDelete.name}" wurde aufgelöst.`);
  };

  const dissolveAllTours = () => {
    if (tours.length === 0) return;
    
    logActivity('DISSOLVE_TOUR', `Alle Touren aufgelöst (${tours.length})`, tours);
    setOrders(prev => prev.map(o => ({ ...o, isPlanned: false })));
    setToursState([]);
    addNotification(`Alle Touren wurden zurückgesetzt.`);
  };

  const deleteTourAndOrders = (tourId: string) => {
    const tourToDelete = tours.find(t => t.id === tourId);
    if (!tourToDelete) return;

    logActivity('DELETE_TOUR_FULL', `Tour & Aufträge gelöscht: ${tourToDelete.name}`, {
      tour: tourToDelete,
      orders: tourToDelete.stops
    });

    const orderIdsToRemove = new Set(tourToDelete.stops.map(s => s.id));
    setOrders(prev => prev.filter(o => !orderIdsToRemove.has(o.id)));
    
    // Remove tour and re-number remaining active tours
    setToursState(prev => {
        const remaining = prev.filter(t => t.id !== tourId);
        return remaining.map((t, index) => {
            // Only rename if it follows the "Number. City" pattern
            const newName = t.name.replace(/^\d+\./, `${index + 1}.`);
            return { ...t, name: newName };
        });
    });

    addNotification(`Tour "${tourToDelete.name}" komplett gelöscht.`);
  };

  const removeOrder = (orderId: string) => {
    const orderToRemove = orders.find(o => o.id === orderId);
    if (!orderToRemove) return;

    logActivity('DELETE_ORDER', `Auftrag gelöscht: ${orderToRemove.documentNumber}`, orderToRemove);
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const removeOrders = (orderIds: string[]) => {
    const ordersToRemove = orders.filter(o => orderIds.includes(o.id));
    if (ordersToRemove.length === 0) return;

    logActivity('DELETE_ORDER', `${ordersToRemove.length} Aufträge gelöscht`, ordersToRemove);
    
    const idsSet = new Set(orderIds);
    setOrders(prev => prev.filter(o => !idsSet.has(o.id)));
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    setToursState(prev => prev.map(t => {
      const hasOrder = t.stops.some(s => s.id === orderId);
      if (hasOrder) {
        const newStops = t.stops.map(s => s.id === orderId ? { ...s, ...updates } : s);
        const newWeight = newStops.reduce((sum, s) => sum + s.totalWeightKg, 0);
        return {
          ...t,
          stops: newStops,
          totalWeight: newWeight,
          utilization: Math.round((newWeight / t.maxWeight) * 100)
        };
      }
      return t;
    }));
  };

  const moveOrderToTour = (orderId: string, targetTourId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setToursState(prev => prev.map(t => {
      if (t.id === targetTourId) {
        const newStops = [...t.stops, order];
        const weight = newStops.reduce((sum, s) => sum + s.totalWeightKg, 0);
        return {
          ...t,
          stops: newStops,
          totalWeight: weight,
          utilization: Math.round((weight / t.maxWeight) * 100)
        };
      }
      return t;
    }));

    updateOrderPlannedStatus([orderId], true);
  };

  const moveOrderToPool = (orderId: string) => {
     setToursState(prev => prev.map(t => {
       if (t.stops.some(s => s.id === orderId)) {
         const newStops = t.stops.filter(s => s.id !== orderId);
         const weight = newStops.reduce((sum, s) => sum + s.totalWeightKg, 0);
         return {
           ...t,
           stops: newStops,
           totalWeight: weight,
           utilization: Math.round((weight / t.maxWeight) * 100)
         };
       }
       return t;
     }));
     updateOrderPlannedStatus([orderId], false);
  };

  const reorderTourStops = (tourId: string, startIndex: number, endIndex: number) => {
    setToursState(prev => prev.map(t => {
      if (t.id === tourId) {
        const newStops = [...t.stops];
        const [removed] = newStops.splice(startIndex, 1);
        newStops.splice(endIndex, 0, removed);
        return { ...t, stops: newStops };
      }
      return t;
    }));
  };

  const updateCmrConfig = (config: CmrConfig) => {
    setCmrConfig(config);
  };

  // --- Team Features ---
  const sendChatMessage = async (text: string, isTask: boolean, assignee?: { id: string; name: string }) => {
    const msg: ChatMessage = {
      id: uuidv4(),
      userId: user?.id || 'sys',
      userName: user?.username || 'Gast',
      text,
      isTask,
      isDone: false,
      timestamp: Date.now(),
      assigneeId: assignee?.id,
      assigneeName: assignee?.name,
    };

    // Optimistic update
    setChatMessages(prev => [...prev, msg]);

    if (supabase) {
      await supabase.from('chat_messages').insert({
        id: msg.id,
        user_id: msg.userId,
        user_name: msg.userName,
        text: msg.text,
        is_task: msg.isTask,
        is_done: msg.isDone,
        timestamp: msg.timestamp,
        assignee_id: msg.assigneeId || null,
        assignee_name: msg.assigneeName || null,
      });
    }

    if (isTask) {
        addNotification(`Neue Aufgabe von ${user?.username}: ${text}`, 'INFO', 'TASK');
    }
  };

  const toggleTaskDone = (messageId: string) => {
    setChatMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isDone: !m.isDone } : m
    ));
    if (supabase) {
      const msg = chatMessages.find(m => m.id === messageId);
      if (msg) {
        supabase.from('chat_messages').update({ is_done: !msg.isDone }).eq('id', messageId);
      }
    }
  };

  return (
    <DataContext.Provider value={{ 
      orders, tours, activities, chatMessages, notifications, unreadNotificationsCount, cmrConfig,
      addOrders, addTour, setTours, 
      updateTourStatus, setTourFreightStatus, completeTourLoading, updateOrderPlannedStatus, 
      deleteTour, deleteTourAndOrders, dissolveAllTours, removeOrder, removeOrders, updateOrder,
      moveOrderToTour, moveOrderToPool, reorderTourStops,
      restoreActivity, updateCmrConfig,
      sendChatMessage, toggleTaskDone, markNotificationsRead
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
