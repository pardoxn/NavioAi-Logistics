import React, { useEffect, useRef } from 'react';
// import L from 'leaflet'; // Removed to avoid module loading issues
import { Tour } from '../types';
import { DEPOT_COORDS, PLZ_REGION_COORDS } from '../constants';

interface TourMapProps {
  tour: Tour;
}

const TourMap: React.FC<TourMapProps> = ({ tour }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null); // Use any for the Leaflet instance

  // Access the global Leaflet object loaded via script tag
  const L = (window as any).L;

  useEffect(() => {
    if (!mapRef.current || !L) return;

    // Initialize Map
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([51.1657, 10.4515], 6); // Center of Germany

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap.current);
    }

    const map = leafletMap.current;

    // Clear existing layers (except tiles)
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Custom Icons
    const depotIcon = L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color: #0ea5e9; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20]
    });

    const stopIcon = L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16]
    });

    const points: any[] = [];

    // 1. Add Depot
    const depotPos = [DEPOT_COORDS.lat, DEPOT_COORDS.lng];
    points.push(depotPos);
    
    L.marker(depotPos, { icon: depotIcon })
      .addTo(map)
      .bindPopup(`<b>Depot (Start)</b><br/>Werny, Bad Wünnenberg`);

    // 2. Add Stops
    tour.stops.forEach((stop, index) => {
      // Lookup Coords by PLZ
      const plzRegion = stop.shippingPostcode.substring(0, 2);
      // Fallback fuzziness if exact coords missing, just add small random offset to avoid overlap
      const baseCoords = PLZ_REGION_COORDS[plzRegion] || { lat: 51.0, lng: 10.0 };
      
      // Slight randomization to separate points in same region visually
      const lat = baseCoords.lat + (Math.random() - 0.5) * 0.05;
      const lng = baseCoords.lng + (Math.random() - 0.5) * 0.05;
      
      const pos = [lat, lng];
      points.push(pos);

      L.marker(pos, { icon: stopIcon })
        .addTo(map)
        .bindPopup(`<b>Stop ${index + 1}: ${stop.shippingCity}</b><br/>${stop.customerName1}<br/>${stop.totalWeightKg}kg`);
    });

    // 3. Draw Line
    if (points.length > 1) {
        const polyline = L.polyline(points, { color: '#0ea5e9', weight: 3, opacity: 0.7, dashArray: '5, 10' });
        polyline.addTo(map);
        
        // Fit bounds
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [tour]);

  return <div ref={mapRef} className="w-full h-full rounded-xl z-0" />;
};

export default TourMap;