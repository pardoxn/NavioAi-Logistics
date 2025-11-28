
import jsPDF from 'jspdf';
import { Tour, Order, CmrConfig } from '../types';

// Shared drawing logic for both real CMRs and the Preview
const createCmrDocument = (doc: jsPDF, config: CmrConfig, order: any, tour: any) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Helper to draw text if visible
  const drawField = (fieldKey: keyof CmrConfig, text: string | undefined) => {
    const field = config[fieldKey];
    if (field && field.visible && text) {
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
  consigneeText += `\n${order.shippingCountryName || "Deutschland"}`;
  drawField('consignee', consigneeText);

  // Feld 3: Auslieferungsort
  drawField('deliveryPlace', `${order.shippingPostcode} ${order.shippingCity}\n${order.shippingCountryCode || "DE"}`);

  // Feld 4: Ladeort
  let loadingText = config.loadingPlace.value || '';
  // Append date if it's the real deal, or dummy date for preview
  loadingText += `\nDatum: ${new Date().toLocaleDateString('de-DE')}`;
  drawField('loadingPlace', loadingText);

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

  // Feld 21: Footer Ort/Datum
  const footerText = `${config.footerPlace.value || ''}   ${new Date().toLocaleDateString('de-DE')}`;
  drawField('footerPlace', footerText);

  // Feld 24: Palettentausch (X)
  if (config.footerSignature.visible) {
     drawField('footerSignature', config.footerSignature.value);
     // Optional: Second X logic could be here if needed
     if (config.footerSignature.value === 'X') {
        doc.text("X", config.footerSignature.x + 45, config.footerSignature.y); 
     }
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

export const generatePreviewURL = (config: CmrConfig): string => {
  const doc = new jsPDF();
  
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
