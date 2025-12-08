export interface ArchiveOrder {
  id: string;
  customerName: string;
  zip: string;
  city: string;
  weight: number;
  orderNumber: string;
  note?: string;
  sequence?: number;
  photoUrl?: string;
}

export interface ArchiveTour {
  id: string;
  date: string;
  status: 'planned' | 'loaded' | 'completed';
  driver?: string;
  vehicle?: string;
  totalWeight: number;
  totalDistance: string;
  startLocation: string;
  loadingPhotoUrl?: string;
  stops: ArchiveOrder[];
}
