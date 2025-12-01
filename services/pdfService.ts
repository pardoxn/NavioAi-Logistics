
import jsPDF from 'jspdf';
import { Tour, Order, CmrConfig } from '../types';

// Shared drawing logic for both real CMRs and the Preview
const createCmrDocument = (doc: jsPDF, config: CmrConfig, order: any, tour: any) => {
  doc.setFont("helvetica", "normal");
  const baseFontSize = 10;
  doc.setFontSize(baseFontSize);

  // Helper to draw text if visible
  const drawField = (fieldKey: keyof CmrConfig, text: string | undefined) => {
    const field = config[fieldKey];
    if (field && field.visible && text) {
      doc.setFontSize(field.fontSize || baseFontSize);
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        doc.text(line, field.x, field.y + (i * 5));
      });
    }
  };

  // --- FIELDS ---

  // Feld 1: Absender
  drawField('sender', config.sender.value);

  // Feld 2: Empfänger
  let consigneeText = order.customerName1;
  if (order.customerName2) consigneeText += `\n${order.customerName2}`;
  consigneeText += `\n${order.shippingPostcode} ${order.shippingCity}`;
  drawField('consignee', consigneeText);

  // Feld 3: Auslieferungsort
  drawField('deliveryPlace', `${order.shippingPostcode} ${order.shippingCity}\n${order.shippingCountryCode || "DE"}`);

  // Feld 4: Ladeort (getrennt)
  const loadingCityField = (config as any).loadingPlaceCity || (config as any).loadingPlace;
  const loadingCountryField = (config as any).loadingPlaceCountry;
  const loadingDateField = (config as any).loadingPlaceDate;
  drawField('loadingPlaceCity', loadingCityField?.value);
  drawField('loadingPlaceCountry', loadingCountryField?.value);
  const loadingDateText = (loadingDateField?.value as string) || new Date().toLocaleDateString('de-DE');
  drawField('loadingPlaceDate', loadingDateText);

  // Feld 5: Dokumente (Format: Lieferschein: YEAR-NUMBER)
  // "Lieferschein: " prefix is hardcoded per request logic, but position is dynamic
  const fullDocId = `Lieferschein: ${order.documentYear}-${order.documentNumber}`;
  drawField('documents', fullDocId);

  // Feld 6: Kennzeichen
  drawField('marks', config.marks.value);

  // Feld 7: Anzahl Packstücke
  drawField('packCount', config.packCount.value);

  // Feld 8: Verpackung
  drawField('packaging', config.packaging.value);

  // Feld 9: Bezeichnung
  drawField('goodsDesc', config.goodsDesc.value);

  // Feld 11: Gewicht (Rounded)
  const roundedWeight = Math.round(order.totalWeightKg || 0);
  drawField('weight', `${roundedWeight} kg`);

  // Feld 13: Anweisungen
  drawField('remarks', config.remarks.value);

  // Feld 16: Frachtführer
  let carrierText = config.carrier.value || '';
  if (tour.vehiclePlate) carrierText += `\nKz: ${tour.vehiclePlate}`;
  drawField('carrier', carrierText);

  // Feld 21: Footer Ort/Datum (getrennt)
  drawField('footerPlace', config.footerPlace?.value);
  const footerDateText = (config as any)?.footerDate?.value || new Date().toLocaleDateString('de-DE');
  drawField('footerDate', footerDateText);

  // Feld 24: Palettentausch (X)
  if (config.footerSignature.visible) {
     drawField('footerSignature', config.footerSignature.value);
     // Optional: Second X logic could be here if needed
     if (config.footerSignature.value === 'X') {
        doc.text("X", config.footerSignature.x + 45, config.footerSignature.y); 
     }
  }

  // Custom Fields (optional)
  if (config.customFields && Array.isArray(config.customFields)) {
    config.customFields.forEach((field, idx) => {
      if (field.visible && field.value) {
        doc.setFontSize(field.fontSize || baseFontSize);
        const lines = (field.value || '').split('\n');
        lines.forEach((line, i) => {
          doc.text(line, field.x, field.y + (i * 5));
        });
      }
    });
  }
};

export const generateCMR = (tour: Tour, order: Order, config: CmrConfig) => {
  const doc = new jsPDF();
  createCmrDocument(doc, config, order, tour);
  
  // Output to Blob URL and Open in New Tab
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
};

// Generate one PDF containing multiple CMR pages (one per stop)
export const generateCMRBundle = (tour: Tour, stops: Order[], config: CmrConfig) => {
  const doc = new jsPDF();
  stops.forEach((stop, idx) => {
    if (idx > 0) doc.addPage();
    createCmrDocument(doc, config, stop, tour);
  });

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
};

export const generatePreviewURL = (config: CmrConfig): string => {
  const doc = new jsPDF();

  // Optional Editor-Background (nur für Preview, nicht im echten Export)
  if (config.previewBackground && config.previewBackground.startsWith('data:')) {
    try {
      doc.addImage(config.previewBackground, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    } catch (e) {
      console.warn('Preview background konnte nicht geladen werden', e);
    }
  }
  
  // Dummy Data for Preview
  const dummyOrder = {
    customerName1: 'Max Mustermann GmbH',
    customerName2: 'z.Hd. Hr. Beispiel',
    shippingPostcode: '57462',
    shippingCity: 'Musterort',
    shippingCountryName: 'Deutschland',
    shippingCountryCode: 'DE',
    documentYear: '2025',
    documentNumber: '123456',
    totalWeightKg: 1250.5
  };
  
  const dummyTour = {
    vehiclePlate: 'PB-XY 123'
  };

  createCmrDocument(doc, config, dummyOrder, dummyTour);
  
  // FIXED: Use createObjectURL with a Blob instead of output('bloburl')
  // This is required for <embed> to work correctly in modern browsers without security blocks
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};

export const generateTourManifest = (tour: Tour) => {
    console.log("Generating manifest for", tour.name);
};
