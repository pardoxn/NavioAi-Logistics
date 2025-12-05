export interface RMOrder {
  id: string;
  customerName: string;
  address: string;
  weight: number;
  referenceNumber?: string;
}

export interface RMStop {
  stopNumber: number;
  customerName?: string;
  address: string;
  weightToUnload: number;
  referenceNumber?: string;
  description?: string;
  geo?: {
    lat: number;
    lng: number;
  };
}

export interface RMTour {
  id: string;
  truckName: string;
  totalWeight: number;
  stops: RMStop[];
  startLocation: string;
  directionInfo?: string;
  isLocked?: boolean;
}

export interface RMPlanningResult {
  tours: RMTour[];
  unassignedOrders?: RMOrder[];
}
