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
        
        results.data.forEach((row: any) => {
          // 1. Filter Logic: Only 'Lieferschein' (Delivery Note)
          const docType = row['Belegart'] || '';
          if (!docType.toLowerCase().includes('lieferschein')) {
            return;
          }

          // 2. Map Fields
          try {
            const weightRaw = row['Gesamtgewicht in kg'] || '0';
            const weight = parseFloat(weightRaw.toString().replace(',', '.'));

            const dateRaw = row['Belegdatum'] || '';
            // Simple date parsing assuming DD.MM.YYYY which is common in DACH CSVs
            let isoDate = dateRaw;
            if (dateRaw.includes('.')) {
              const [d, m, y] = dateRaw.split('.');
              isoDate = `${y}-${m}-${d}`;
            }

            const order: Order = {
              id: uuidv4(),
              orderId: row['Vorgang'],
              documentNumber: row['Belegnummer'],
              documentYear: row['Jahr'],
              documentType: row['Belegart'],
              customerReferenceNumber: row['Ihre Belegnummer'],
              documentDate: isoDate,
              
              customerNumber: row['Auftraggeber'],
              customerName1: row['Name 1 Auftraggeber'],
              customerName2: row['Name 2 Auftraggeber'],
              customerMatchcode: row['Matchcode Auftraggeber'],
              customerGroupCode: row['Kundengruppe_Wert'],
              customerGroupName: row['Kundengruppe_Bezeichnung'],

              shippingCountryCode: row['Land Lieferanschrift_Wert'],
              shippingCountryName: row['Land Lieferanschrift_Bezeichnung'],
              shippingPostcode: row['PLZ Lieferanschrift'],
              shippingCity: row['Ort Lieferanschrift'],
              shippingStreet: row['Strasse Lieferanschrift'] || '', // inferred

              totalWeightKg: isNaN(weight) ? 0 : weight,
              shippingMethodCode: row['Versandart_Wert'],
              shippingMethodName: row['Versandart_Bezeichnung'],

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