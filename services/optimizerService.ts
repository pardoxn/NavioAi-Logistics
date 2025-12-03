
import { Order, Tour, TourStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DEPOT_COORDS, PLZ_REGION_COORDS } from '../constants';
import { REGION_MAP, findRegionForPostcode } from '../lib/regionMap';

const MIN_UTILIZATION_THRESHOLD = 0.4; // 40% Mindestauslastung (weniger strikt, sonst fallen kleine Ladungen raus)

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
  
  // 1. Filter valid orders (ignore orders > vehicle capacity)
  const validOrders = orders.filter(o => o.totalWeightKg <= maxVehicleCapacity);
  
  // 2. Enrich orders with Geo Data + Region aus Referenz
  const enriched = validOrders.map(order => {
    const plzRegion = order.shippingPostcode.substring(0, 2);
    const coords = PLZ_REGION_COORDS[plzRegion] || { lat: 51.0, lng: 10.0 };
    const regionHint = findRegionForPostcode(order.shippingPostcode) || 'Unbekannt';
    return { ...order, coords, regionHint };
  });

  // 3. Cluster nach RegionHint (Tabelle1) – gruppiert das, was ihr in Excel habt
  const byRegion: Record<string, any[]> = {};
  enriched.forEach(o => {
    byRegion[o.regionHint] = byRegion[o.regionHint] || [];
    byRegion[o.regionHint].push(o);
  });

  const depot = { lat: DEPOT_COORDS.lat, lng: DEPOT_COORDS.lng };
  let tourNumber = 1;

  const buildRoute = (stops: any[]) => {
    // Nearest neighbor + 2-opt innerhalb eines Clusters
    const unvisited = stops.map((_, i) => i);
    const route: number[] = [];
    let cur = depot;
    while (unvisited.length) {
      let bestIdx = 0, bestD = Infinity;
      for (let ix = 0; ix < unvisited.length; ix++) {
        const i = unvisited[ix];
        const d = calcDistance(cur.lat, cur.lng, stops[i].coords.lat, stops[i].coords.lng);
        if (d < bestD) { bestD = d; bestIdx = ix; }
      }
      const pick = unvisited.splice(bestIdx, 1)[0];
      route.push(pick);
      cur = stops[pick].coords;
    }
    // 2-opt
    const dist = (i: number, j: number) => {
      const a = stops[route[i]].coords;
      const b = stops[route[j]].coords;
      return calcDistance(a.lat, a.lng, b.lat, b.lng);
    };
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 1; i < route.length - 2; i++) {
        for (let k = i + 1; k < route.length - 1; k++) {
          const delta = (dist(i - 1, i) + dist(k, k + 1)) - (dist(i - 1, k) + dist(i, k + 1));
          if (delta > 0.05) {
            const rev = route.slice(i, k + 1).reverse();
            route.splice(i, k - i + 1, ...rev);
            improved = true;
          }
        }
      }
    }
    return route.map(idx => stops[idx]);
  };

  Object.values(byRegion).forEach(group => {
    if (!group.length) return;
    // Bei Bedarf nach Gewicht splitten
    let remaining = [...group];
    while (remaining.length) {
      let bucket: any[] = [];
      let w = 0;
      // sortiere grob nach Nähe zum Depot
      remaining.sort((a, b) => calcDistance(depot.lat, depot.lng, a.coords.lat, a.coords.lng) - calcDistance(depot.lat, depot.lng, b.coords.lat, b.coords.lng));
      for (const o of [...remaining]) {
        if (w + o.totalWeightKg <= maxVehicleCapacity || bucket.length === 0) {
          bucket.push(o);
          w += o.totalWeightKg;
        }
      }
      // remove bucket from remaining
      remaining = remaining.filter(o => !bucket.includes(o));

      const route = buildRoute(bucket);
      const totalW = route.reduce((s, o) => s + (o.totalWeightKg || 0), 0);
      const estKm = route.reduce((sum, o, idx) => {
        const prev = idx === 0 ? depot : route[idx - 1].coords;
        return sum + calcDistance(prev.lat, prev.lng, o.coords.lat, o.coords.lng);
      }, 0) * 1.3;

      const last = route[route.length - 1];
      const regionName = `${last.shippingCity || last.shippingPostcode}`;

      generatedTours.push({
        id: uuidv4(),
        name: `${tourNumber}. ${regionName}`,
        date: new Date().toISOString().split('T')[0],
        status: TourStatus.PLANNING,
        stops: route,
        totalWeight: totalW,
        maxWeight: maxVehicleCapacity,
        utilization: Math.round((totalW / maxVehicleCapacity) * 100),
        estimatedDistanceKm: Math.round(estKm),
        vehiclePlate: ''
      });
      tourNumber++;
    }
  });

  // Fallback: wenn nichts generiert wurde
  if (generatedTours.length === 0 && validOrders.length > 0) {
    const sortedByWeight = [...validOrders].sort((a, b) => b.totalWeightKg - a.totalWeightKg);
    let bucket: Order[] = [];
    let w = 0;
    let tourNum = 1;
    const flush = () => {
      if (!bucket.length) return;
      generatedTours.push(createTour(tourNum++, bucket, w, maxVehicleCapacity));
      bucket = [];
      w = 0;
    };
    sortedByWeight.forEach(o => {
      if (w + o.totalWeightKg > maxVehicleCapacity) {
        flush();
      }
      bucket.push(o);
      w += o.totalWeightKg;
    });
    flush();
  }

  return generatedTours;
};

const createTour = (num: number, stops: Order[], weight: number, capacity: number): Tour => {
  if (!stops.length) {
    return {
      id: uuidv4(),
      name: `${num}. Leer`,
      date: new Date().toISOString().split('T')[0],
      status: TourStatus.PLANNING,
      stops: [],
      totalWeight: 0,
      maxWeight: capacity,
      utilization: 0,
      estimatedDistanceKm: 0,
      vehiclePlate: ''
    };
  }

  // Build coords from PLZ regions
  const withCoords = stops.map(s => {
    const plzRegion = s.shippingPostcode.substring(0, 2);
    const coords = PLZ_REGION_COORDS[plzRegion] || { lat: 51.0, lng: 10.0 };
    return { stop: s, coords };
  });

  // Nearest neighbor order + simple 2-opt
  const unvisited = withCoords.map((_, i) => i);
  const route: number[] = [];
  let curLat = DEPOT_COORDS.lat;
  let curLng = DEPOT_COORDS.lng;
  while (unvisited.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let ix = 0; ix < unvisited.length; ix++) {
      const i = unvisited[ix];
      const d = calcDistance(curLat, curLng, withCoords[i].coords.lat, withCoords[i].coords.lng);
      if (d < bestD) { bestD = d; bestIdx = ix; }
    }
    const pick = unvisited.splice(bestIdx, 1)[0];
    route.push(pick);
    curLat = withCoords[pick].coords.lat;
    curLng = withCoords[pick].coords.lng;
  }

  const twoOptRoute = (order: number[]) => {
    const dist = (i: number, j: number) => {
      const a = withCoords[order[i]].coords;
      const b = withCoords[order[j]].coords;
      return calcDistance(a.lat, a.lng, b.lat, b.lng);
    };
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 1; i < order.length - 2; i++) {
        for (let k = i + 1; k < order.length - 1; k++) {
          const delta = (dist(i - 1, i) + dist(k, k + 1)) - (dist(i - 1, k) + dist(i, k + 1));
          if (delta > 0.05) {
            const rev = order.slice(i, k + 1).reverse();
            order = [...order.slice(0, i), ...rev, ...order.slice(k + 1)];
            improved = true;
          }
        }
      }
    }
    return order;
  };

  const optimizedOrder = twoOptRoute(route);
  const sortedStops = optimizedOrder.map(idx => withCoords[idx].stop);

  // Distance estimation
  let totalDist = 0;
  let prev = { lat: DEPOT_COORDS.lat, lng: DEPOT_COORDS.lng };
  optimizedOrder.forEach(idx => {
    const c = withCoords[idx].coords;
    totalDist += calcDistance(prev.lat, prev.lng, c.lat, c.lng);
    prev = c;
  });
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
    maxWeight: capacity,
    utilization,
    estimatedDistanceKm: estimatedRealDistance,
    vehiclePlate: '' 
  };
};
