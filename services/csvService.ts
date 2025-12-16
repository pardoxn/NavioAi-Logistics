import Papa from 'papaparse';
import { Order } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const parseCSV = (file: File): Promise<Order[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'Windows-1252', // Fix for German Umlaute (Ä, Ö, Ü, ß) in legacy exports
      complete: (results) => {
        const parsedOrders: Order[] = [];
        
        const pick = (row: any, keys: string[], fallback: string = '') => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
              return row[k];
            }
          }
          return fallback;
        };

        const parseDate = (raw: string) => {
          if (!raw) return '';
          const trimmed = raw.trim();
          if (trimmed.includes('.')) {
            const [d, m, y] = trimmed.split('.');
            // Handle 2-digit year by assuming 20xx
            const year = y && y.length === 2 ? `20${y}` : y;
            return `${year}-${m}-${d}`;
          }
          if (trimmed.includes('-')) return trimmed;
          return '';
        };

        const deriveCity = (row: any, postcode: string) => {
          const rawCity = pick(row, ['Ort Lieferanschrift', 'Ort Lieferanschrift_Bezeichnung', 'Ort', 'Stadt'], '');
          if (rawCity) return rawCity;

          // Fallback: try last part after comma in Auftraggeber/Matchcode
          const fromName = pick(row, ['Matchcode Auftraggeber', 'Auftraggeber'], '');
          if (fromName.includes(',')) {
            const parts = fromName.split(',').map((p: string) => p.trim()).filter(Boolean);
            const last = parts[parts.length - 1];
            // If the last part contains the postcode already, drop it
            if (postcode && last.startsWith(postcode)) {
              return last.replace(postcode, '').trim();
            }
            return last || rawCity;
          }
          return rawCity;
        };

        results.data.forEach((row: any) => {
          // 1. Filter Logic: Only 'Lieferschein' (Delivery Note)
          const docType = (row['Belegart'] || '').toString().toLowerCase();
          if (!docType.includes('lieferschein')) {
            return;
          }

          // 2. Map Fields
          try {
            const weightRaw = pick(row, ['Gesamtgewicht in kg', 'Gewicht', 'Gewicht in kg'], '0');
            const weightString = weightRaw.toString().trim();
            const normalizedWeight = weightString.includes(',')
              ? weightString.replace(/\./g, '').replace(',', '.')
              : weightString.replace(/\./g, '');
            const weight = parseFloat(normalizedWeight);

            const dateRaw = pick(row, ['Belegdatum', 'Datum'], '');
            const isoDate = parseDate(dateRaw);
            let derivedYear = '';
            if (isoDate.includes('-')) {
              derivedYear = isoDate.split('-')[0];
            }

            const order: Order = {
              id: uuidv4(),
              orderId: pick(row, ['Vorgang', 'Auftragsnummer', 'Belegnummer'], uuidv4()),
              documentNumber: pick(row, ['Belegnummer', 'Vorgang'], uuidv4()),
              documentYear: pick(row, ['Jahr'], derivedYear || new Date().getFullYear().toString()),
              documentType: row['Belegart'],
              customerReferenceNumber: pick(row, ['Ihre Belegnummer', 'Kundenreferenz'], ''),
              documentDate: isoDate,
              
              customerNumber: pick(row, ['Kundennummer', 'Kunde', 'Auftraggeber']),
              // Reihenfolge: Falls vorhanden, richtiger Name; sonst Matchcode; als Fallback die Nummer
              customerName1: pick(row, ['Name 1 Auftraggeber', 'Matchcode Auftraggeber', 'Auftraggeber'], 'Kunde'),
              customerName2: pick(row, ['Name 2 Auftraggeber'], ''),
              customerMatchcode: pick(row, ['Matchcode Auftraggeber'], ''),
              customerGroupCode: pick(row, ['Kundengruppe_Wert'], ''),
              customerGroupName: pick(row, ['Kundengruppe_Bezeichnung'], ''),

              shippingCountryCode: pick(row, ['Land Lieferanschrift_Wert'], 'DE'),
              shippingCountryName: pick(row, ['Land Lieferanschrift_Bezeichnung'], 'Deutschland'),
              shippingPostcode: pick(row, ['PLZ Lieferanschrift', 'PLZ', 'Postleitzahl'], ''),
              shippingCity: deriveCity(row, pick(row, ['PLZ Lieferanschrift', 'PLZ', 'Postleitzahl'], '')),
              shippingStreet: pick(row, ['Strasse Lieferanschrift', 'Straße', 'Strasse'], ''), // inferred

              totalWeightKg: isNaN(weight) ? 0 : weight,
              shippingMethodCode: pick(row, ['Versandart_Wert'], ''),
              shippingMethodName: pick(row, ['Versandart_Bezeichnung'], ''),

              isPlanned: false,
              
              // Init defaults for optimization
              bearing: 0,
              distanceFromDepot: 0
            };

            parsedOrders.push(order);
          } catch (e) {
            console.warn('Skipping row due to error', e, row);
          }
        });
        resolve(parsedOrders);
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
};
