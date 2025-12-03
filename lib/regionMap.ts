// Generated from "Kopie von Kopie von Tourenplan ab 07.2025 2.xlsx" (Tabelle1)
// Map: Region/Richtung -> array of { postcode, name }
import regionData from '../public/region_map.json';

export interface RegionStop {
  postcode: string;
  name: string;
}

export const REGION_MAP: Record<string, RegionStop[]> = regionData as any;

// Helper: find region for a given postcode prefix (exact match first)
export const findRegionForPostcode = (postcode: string): string | null => {
  if (!postcode) return null;
  const exact = Object.entries(REGION_MAP).find(([, stops]) =>
    stops.some(s => s.postcode === postcode)
  );
  if (exact) return exact[0];
  // fallback: match first 3 digits
  const p3 = postcode.replace(/\\D/g, '').slice(0,3);
  if (!p3) return null;
  const partial = Object.entries(REGION_MAP).find(([, stops]) =>
    stops.some(s => s.postcode.replace(/\\D/g, '').startswith(p3))
  );
  return partial ? partial[0] : null;
};
