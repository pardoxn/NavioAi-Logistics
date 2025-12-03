export interface RMOrder {
  id: string;
  address: string;
  weight: number;
}

export interface RMStop {
  stopNumber: number;
  address: string;
  weightToUnload: number;
  description?: string;
}

export interface RMTour {
  truckName: string;
  totalWeight: number;
  stops: RMStop[];
  startLocation: string;
  directionInfo?: string;
}

export interface RMPlanningResult {
  tours: RMTour[];
  unassignedOrders?: RMOrder[];
}
