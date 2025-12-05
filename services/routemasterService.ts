import { GoogleGenAI, Schema, Type } from "@google/genai";
import { RMOrder, RMPlanningResult } from "../types/routemaster";

const START_LOCATION = "Ostring 3, 33181 Bad Wünnenberg";
const MAX_WEIGHT = 1300;

const getApiKey = () => {
  const metaEnv = (import.meta as any)?.env || {};
  return (
    metaEnv.VITE_GEMINI_API_KEY ||
    metaEnv.VITE_API_KEY ||
    (typeof process !== 'undefined' ? (process as any).env?.VITE_GEMINI_API_KEY : undefined) ||
    (typeof process !== 'undefined' ? (process as any).env?.API_KEY : undefined)
  );
};

const tourSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tours: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          truckName: { type: Type.STRING, description: "Name des LKWs oder der Tour (z.B. Tour Nord)" },
          totalWeight: { type: Type.NUMBER, description: "Summiertes Gewicht aller Aufträge in dieser Tour" },
          startLocation: { type: Type.STRING, description: "Immer der Depot-Startpunkt" },
          directionInfo: { type: Type.STRING, description: "Kurze Info zur Himmelsrichtung der Tour (z.B. 'Fährt Richtung Nord-West nach Paderborn')" },
          stops: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stopNumber: { type: Type.INTEGER },
                customerName: { type: Type.STRING, description: "Name des Kunden aus dem Auftrag" },
                address: { type: Type.STRING, description: "Vollständige Adresse (Straße, PLZ Ort). Wenn nur PLZ gegeben war, Ort ergänzen!" },
                weightToUnload: { type: Type.NUMBER },
                referenceNumber: { type: Type.STRING, description: "Belegnummer aus dem Auftrag (falls vorhanden)" },
                description: { type: Type.STRING, description: "Begründung für diesen Stopp (z.B. 'Liegt direkt auf dem Weg zu Stopp 2')" },
                geo: {
                  type: Type.OBJECT,
                  properties: {
                    lat: { type: Type.NUMBER, description: "Breitengrad der Zieladresse" },
                    lng: { type: Type.NUMBER, description: "Längengrad der Zieladresse" }
                  },
                  required: ["lat", "lng"]
                }
              },
              required: ["stopNumber", "address", "weightToUnload", "geo"]
            }
          }
        },
        required: ["truckName", "totalWeight", "stops", "startLocation", "directionInfo"]
      }
    }
  },
  required: ["tours"]
};

export const planToursV2 = async (orders: RMOrder[]): Promise<RMPlanningResult> => {
  if (orders.length === 0) {
    return { tours: [] };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Kein Gemini API Key konfiguriert. Bitte VITE_GEMINI_API_KEY (oder VITE_API_KEY/API_KEY) setzen und Dev-Server neu starten.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Du bist ein Senior Logistik-Planer für eine Spedition in Bad Wünnenberg.
    Deine Aufgabe ist es, Lieferaufträge auf LKWs zu verteilen und die effizienteste Route zu planen.
    
    REGELN (Streng befolgen!):
    1. STARTPUNKT: Alle Touren starten bei "${START_LOCATION}".
    2. ONE-WAY LOGIK (KEIN RÜCKWEG): Die LKWs fahren NICHT zum Depot zurück. Die Tour endet beim letzten Kunden.
    3. GEWICHTSLIMIT: Ein LKW darf MAXIMAL ${MAX_WEIGHT} kg laden. Das ist gesetzlich vorgeschrieben.
       - Wenn die Summe der Gewichte > ${MAX_WEIGHT}kg ist, MUSST du mehrere Touren/LKWs erstellen.
    4. ROUTING-LOGIK (STRAHL-PRINZIP):
       - Sortiere die Stopps strikt nach Entfernung vom Startpunkt.
       - Stopp 1: Am nächsten an Bad Wünnenberg.
       - Stopp 2: Weiter weg, aber in der gleichen groben Himmelsrichtung.
       - Letzter Stopp: Am weitesten entfernt.
       - VERMEIDE ZICK-ZACK: Fahre nicht von Nord nach Süd und wieder nach Nord. Gruppiere Ziele, die in einer Linie liegen.
    5. DATENÜBERNAHME:
       - Übernimm exakt den "customerName" und "referenceNumber" (falls vorhanden) in die Stopp-Daten.
    6. ADRESS-FORMATIERUNG (WICHTIG):
       - Falls eine Adresse im Input unvollständig ist (z.B. nur PLZ "33100" oder nur Ort "Paderborn"), MUSST du sie vervollständigen.
       - Das Ziel-Format ist immer: "Straße (opt), PLZ Ort". Mindestens aber "PLZ Ort".
       - Beispiel: Input "33181" -> Output "33181 Bad Wünnenberg".
    7. GEODATEN:
       - Schätze/Generiere für jeden Stopp die ungefähren GPS-Koordinaten (lat/lng), damit wir die Distanzen berechnen können.

    AUFTRAGSLISTE:
    ${JSON.stringify(orders.map((o, i) => ({ 
      id: i + 1, 
      customerName: o.customerName,
      address: o.address, 
      weight: o.weight,
      referenceNumber: o.referenceNumber
    })))}

    DENKPROZESS (Chain of Thought):
    1. Analysiere die Himmelsrichtung aller Adressen relativ zu Bad Wünnenberg.
    2. Korrigiere unvollständige Adressen (PLZ -> PLZ + Ort) und ermittle Koordinaten.
    3. Gruppiere Adressen, die in der gleichen Richtung liegen (Cluster).
    4. Prüfe das Gesamtgewicht pro Cluster. Wenn > ${MAX_WEIGHT}, teile das Cluster intelligent auf.
    5. Sortiere innerhalb der Tour die Stopps aufsteigend nach Distanz zum Startpunkt (Luftlinie oder Straßenlogik).

    Generiere JSON Output exakt nach Schema.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: tourSchema,
      temperature: 0.2, // Low temperature for deterministic logic
    },
  });

  const text = response.text;
  if (!text) throw new Error("Keine Antwort von der KI erhalten.");

  const parsed = JSON.parse(text);
  const toursWithIds = parsed.tours.map((t: any) => ({
    ...t,
    id: crypto.randomUUID(),
    isLocked: false
  }));

  return { tours: toursWithIds };
};
