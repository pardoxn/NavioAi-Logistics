
import { Order, Tour, TourStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DEPOT_COORDS, PLZ_REGION_COORDS } from '../constants';

const MIN_UTILIZATION_THRESHOLD = 0.6; // 60%
const MAX_CONE_ANGLE = 40; // Degrees. Maximum spread of a tour sector.

// --- Math Helpers ---

const toRad = (val: number) => (val * Math.PI) / 180;
const toDeg = (val: number) => (val * 180) / Math.PI;

// Calculate distance (Haversine formula) in km
const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate initial bearing (0-360 degrees) from point A to B
const calcBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const startLat = toRad(lat1);
  const startLng = toRad(lon1);
  const destLat = toRad(lat2);
  const destLng = toRad(lon2);

  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x =
    Math.cos(startLat) * Math.sin(destLat) -
    Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
};

// --- Optimization Logic ---

export const optimizeTours = (orders: Order[], maxVehicleCapacity: number = 1300): Tour[] => {
  const generatedTours: Tour[] = [];
  
  // 1. Filter valid orders (ignore orders > vehicle capacity, though unlikely for single items)
  const validOrders = orders.filter(o => o.totalWeightKg <= maxVehicleCapacity);
  
  // 2. Enrich orders with Geo Data
  const enrichedOrders = validOrders.map(order => {
    // Get approximate coords from PLZ first 2 digits
    const plzRegion = order.shippingPostcode.substring(0, 2);
    const coords = PLZ_REGION_COORDS[plzRegion] || { lat: 51.0, lng: 10.0 }; // Default center of Germany if unknown
    
    const dist = calcDistance(DEPOT_COORDS.lat, DEPOT_COORDS.lng, coords.lat, coords.lng);
    const bearing = calcBearing(DEPOT_COORDS.lat, DEPOT_COORDS.lng, coords.lat, coords.lng);
    
    return {
      ...order,
      bearing,
      distanceFromDepot: dist
    };
  });

  // 3. Sort by Bearing (Compass Sweep)
  enrichedOrders.sort((a, b) => (a.bearing || 0) - (b.bearing || 0));

  // 4. Clustering Loop (Cone Check)
  let index = 0;
  while (index < enrichedOrders.length) {
    let currentTourStops: Order[] = [];
    let currentWeight = 0;
    let minBearing = 361;
    let maxBearing = -1;
    
    let i = index;
    
    while (i < enrichedOrders.length) {
      const order = enrichedOrders[i];
      const bearing = order.bearing || 0;
      
      // Check Weight against dynamic Capacity
      if (currentWeight + order.totalWeightKg > maxVehicleCapacity) {
        break; 
      }

      // Check Angle Cone
      if (currentTourStops.length > 0) {
        const newMin = Math.min(minBearing, bearing);
        const newMax = Math.max(maxBearing, bearing);
        const coneSize = newMax - newMin;
        
        if (coneSize > MAX_CONE_ANGLE) {
           break;
        }
        
        minBearing = newMin;
        maxBearing = newMax;
      } else {
        minBearing = bearing;
        maxBearing = bearing;
      }

      currentTourStops.push(order);
      currentWeight += order.totalWeightKg;
      i++;
    }

    // Check Efficiency
    // Minimum load logic: 60% of capacity OR total weight > 60% of standard sprinter (fallback safety)
    const utilization = currentWeight / maxVehicleCapacity;
    const isHeavyEnough = currentWeight > (maxVehicleCapacity * 0.6);

    if (utilization >= MIN_UTILIZATION_THRESHOLD || isHeavyEnough) {
      generatedTours.push(createTour(generatedTours.length + 1, currentTourStops, currentWeight, maxVehicleCapacity));
      index = i; // Advance
    } else {
      index++; // Skip order
    }
  }

  return generatedTours;
};

const createTour = (num: number, stops: Order[], weight: number, capacity: number): Tour => {
  // 5. Final Sorting: Distance from Depot
  const sortedStops = [...stops].sort((a, b) => (a.distanceFromDepot || 0) - (b.distanceFromDepot || 0));

  // Calculate Cumulative Distance (Depot -> Stop 1 -> Stop 2 ...)
  let totalDist = 0;
  let prevLat = DEPOT_COORDS.lat;
  let prevLng = DEPOT_COORDS.lng;

  sortedStops.forEach(stop => {
    const plzRegion = stop.shippingPostcode.substring(0, 2);
    const coords = PLZ_REGION_COORDS[plzRegion] || { lat: 51.0, lng: 10.0 };
    
    const segmentDist = calcDistance(prevLat, prevLng, coords.lat, coords.lng);
    totalDist += segmentDist;
    
    prevLat = coords.lat;
    prevLng = coords.lng;
  });

  // Apply Road Factor (approx 1.3x for highway/roads vs air distance)
  const estimatedRealDistance = Math.round(totalDist * 1.3);

  const utilization = Math.round((weight / capacity) * 100);
  const lastStop = sortedStops[sortedStops.length - 1];
  
  const regionName = `${lastStop.shippingCity} (${lastStop.shippingPostcode.substring(0, 2)}...)`;

  return {
    id: uuidv4(),
    name: `${num}. ${regionName}`,
    date: new Date().toISOString().split('T')[0],
    status: TourStatus.PLANNING,
    stops: sortedStops,
    totalWeight: weight,
    maxWeight: capacity, // Store the capacity used for planning
    utilization: utilization,
    estimatedDistanceKm: estimatedRealDistance,
    vehiclePlate: '' 
  };
};
