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

        results.data.forEach((row: any) => {
          // 1. Filter Logic: Only 'Lieferschein' (Delivery Note)
          const docType = (row['Belegart'] || '').toString().toLowerCase();
          if (!docType.includes('lieferschein')) {
            return;
          }

          // 2. Map Fields
          try {
            const weightRaw = pick(row, ['Gesamtgewicht in kg', 'Gewicht', 'Gewicht in kg'], '0');
            const weight = parseFloat(weightRaw.toString().replace(',', '.'));

            const dateRaw = pick(row, ['Belegdatum', 'Datum'], '');
            // Simple date parsing assuming DD.MM.YYYY which is common in DACH CSVs
            let isoDate = dateRaw;
            let derivedYear = '';
            if (dateRaw.includes('.')) {
              const [d, m, y] = dateRaw.split('.');
              isoDate = `${y}-${m}-${d}`;
              derivedYear = y;
            } else if (dateRaw.includes('-')) {
              derivedYear = dateRaw.split('-')[0];
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
              shippingCity: pick(row, ['Ort Lieferanschrift', 'Ort Lieferanschrift_Bezeichnung', 'Ort', 'Stadt'], ''),
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
