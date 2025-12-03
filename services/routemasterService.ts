import { GoogleGenAI, Schema, Type } from "@google/genai";
import { RMOrder, RMPlanningResult } from "../types/routemaster";

const START_LOCATION = "Ostring 3, 33181 Bad Wünnenberg";
const MAX_WEIGHT = 1300;

// Reuse the same env lookup convention as the bestehende Tourenplanung
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
          truckName: { type: Type.STRING, description: "Name des LKWs oder der Tour" },
          totalWeight: { type: Type.NUMBER, description: "Summiertes Gewicht aller Aufträge in dieser Tour" },
          startLocation: { type: Type.STRING, description: "Immer der Depot-Startpunkt" },
          directionInfo: { type: Type.STRING, description: "Kurze Info zur Richtung der Tour" },
          stops: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stopNumber: { type: Type.INTEGER },
                address: { type: Type.STRING },
                weightToUnload: { type: Type.NUMBER },
                description: { type: Type.STRING, description: "Begründung für diesen Stopp" }
              },
              required: ["stopNumber", "address", "weightToUnload"]
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
  if (!orders.length) return { tours: [] };

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Kein Gemini API Key konfiguriert. Bitte VITE_GEMINI_API_KEY (oder VITE_API_KEY/API_KEY) setzen und Dev-Server neu starten.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Du bist ein Senior Logistik-Planer.
    Deine Aufgabe ist es, Lieferaufträge auf LKWs zu verteilen und die effizienteste Route zu planen.
    
    REGELN (Streng befolgen!):
    1. STARTPUNKT: Alle Touren starten bei "${START_LOCATION}".
    2. ONE-WAY LOGIK (KEIN RÜCKWEG): Die LKWs fahren NICHT zum Depot zurück. Die Tour endet beim letzten Kunden.
    3. GEWICHTSLIMIT: Ein LKW darf MAXIMAL ${MAX_WEIGHT} kg laden.
       - Wenn die Summe der Gewichte > ${MAX_WEIGHT}kg ist, MUSST du mehrere Touren/LKWs erstellen.
    4. ROUTING-LOGIK (STRAHL-PRINZIP):
       - Sortiere die Stopps strikt nach Entfernung vom Startpunkt.
       - Stopp 1: Am nächsten an Bad Wünnenberg.
       - Stopp 2: Weiter weg, aber in der gleichen groben Himmelsrichtung.
       - Letzter Stopp: Am weitesten entfernt.
       - VERMEIDE ZICK-ZACK: Gruppiere Ziele, die in einer Linie liegen.

    AUFTRAGSLISTE:
    ${JSON.stringify(orders.map((o, i) => ({ id: i + 1, address: o.address, weight: o.weight })))}

    DENKPROZESS (Chain of Thought):
    1. Analysiere die Himmelsrichtung aller Adressen relativ zum Start.
    2. Gruppiere Adressen, die in der gleichen Richtung liegen (Cluster).
    3. Prüfe das Gesamtgewicht pro Cluster. Wenn > ${MAX_WEIGHT}, teile das Cluster intelligent auf.
    4. Sortiere innerhalb der Tour die Stopps aufsteigend nach Distanz zum Startpunkt.

    Generiere JSON Output exakt nach Schema.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: tourSchema,
      temperature: 0.2
    },
  });

  const text = response.text;
  if (!text) throw new Error("Keine Antwort von der KI erhalten.");

  return JSON.parse(text) as RMPlanningResult;
};
