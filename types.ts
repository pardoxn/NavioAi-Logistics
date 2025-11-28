
export enum UserRole {
  ADMIN = 'ADMIN',
  DISPO = 'DISPO',
  LAGER = 'LAGER',
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
}

export interface Order {
  id: string; // Internal UUID
  
  // Identifikation
  orderId: string; // Vorgang
  documentNumber: string; // Belegnummer
  documentYear: string; // Jahr
  documentType: string; // Belegart
  customerReferenceNumber: string; // Ihre Belegnummer
  documentDate: string; // ISO Date YYYY-MM-DD

  // Kunde
  customerNumber: string; // Auftraggeber
  customerName1: string;
  customerName2?: string;
  customerMatchcode?: string;
  customerGroupCode?: string;
  customerGroupName?: string;

  // Lieferadresse
  shippingCountryCode: string;
  shippingCountryName: string;
  shippingPostcode: string;
  shippingCity: string;
  shippingStreet?: string;

  // Logistik
  totalWeightKg: number;
  shippingMethodCode?: string;
  shippingMethodName?: string;

  // Status
  isPlanned: boolean; // Assigned to a tour?
  tourId?: string;

  // Optimization Metrics
  bearing?: number; // 0-360 degrees from depot
  distanceFromDepot?: number; // km from depot
}

export enum TourStatus {
  PLANNING = 'PLANNING', // Offen
  LOCKED = 'LOCKED', // Gesperrt für Änderungen
  LOADED = 'LOADED', // Verladen
  ARCHIVED = 'ARCHIVED',
}

export type FreightStatus = 'OPEN' | 'OFFERED' | 'CONFIRMED';

export interface Tour {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  status: TourStatus;
  freightStatus?: FreightStatus; // Status for Timocom/Freight
  stops: Order[]; // Ordered list of stops
  totalWeight: number;
  maxWeight: number; // e.g. 1300 or 3000
  utilization: number; // percentage 0-100
  estimatedDistanceKm: number;
  driverName?: string;
  vehiclePlate?: string;
  
  // Warehouse Data
  loadedImageUrl?: string; // Base64 string of the loaded cargo photo
  loadedNote?: string; // Optional note from warehouse staff
}

// CMR Configuration for Coordinate Editor
export interface CmrFieldConfig {
  x: number;      // mm from left
  y: number;      // mm from top
  visible: boolean;
  label: string;  // For the Settings UI
  value?: string; // Static text content (if applicable)
}

export interface CmrConfig {
  [key: string]: CmrFieldConfig;
  sender: CmrFieldConfig;       // Feld 1
  consignee: CmrFieldConfig;    // Feld 2
  deliveryPlace: CmrFieldConfig;// Feld 3
  loadingPlace: CmrFieldConfig; // Feld 4
  documents: CmrFieldConfig;    // Feld 5
  marks: CmrFieldConfig;        // Feld 6
  packCount: CmrFieldConfig;    // Feld 7
  packaging: CmrFieldConfig;    // Feld 8
  goodsDesc: CmrFieldConfig;    // Feld 9
  weight: CmrFieldConfig;       // Feld 11
  remarks: CmrFieldConfig;      // Feld 13
  carrier: CmrFieldConfig;      // Feld 16
  footerPlace: CmrFieldConfig;  // Feld 21 (Ort/Datum)
  footerSignature: CmrFieldConfig; // Feld 22/23 (Unterschriften/Kreuze)
}

// --- Activity Log System ---

export type ActivityType = 'DELETE_ORDER' | 'DISSOLVE_TOUR' | 'DELETE_TOUR_FULL';

export interface ActivityLog {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  type: ActivityType;
  description: string;
  snapshot: any; // Data required to restore state
  isRestored: boolean;
}

// --- Team Hub System ---

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isTask: boolean;
  isDone: boolean;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

export type NotificationCategory = 'TOUR' | 'TASK' | 'SYSTEM';

export interface Notification {
  id: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS';
  category?: NotificationCategory; // Grouping (e.g. TOUR)
  referenceId?: string; // ID to link to (e.g. Tour ID)
  text: string;
  timestamp: number;
  read: boolean;
}
