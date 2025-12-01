import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

// Helper to simulate "AI" route grouping reasoning
export const getOptimizationAdvice = async (orders: Order[]) => {
  const apiKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API KEY for Gemini");
    return "AI-Dienst nicht verfügbar (Kein API Key).";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // We send a simplified list to save tokens
  const orderSummary = orders.map(o => 
    `- Order ${o.documentNumber}: PLZ ${o.shippingPostcode} ${o.shippingCity}, ${o.totalWeightKg}kg`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Du bist ein Logistik-Disponent für 'Navio AI'.
        
        RAHMENBEDINGUNGEN:
        1. Startpunkt aller Touren: "Ostring 3, 33181 Bad Wünnenberg" (Firma Werny).
        2. Fahrzeug: "Polensprinter" (Max 1300kg).
        3. One-Way: Der Fahrer muss NICHT zurück zum Depot. Die Tour endet beim letzten Kunden.
        4. Ziel: Logische Linien vom Startpunkt weg. Keine Zick-Zack-Fahrten.
        
        Hier ist eine Liste von offenen Aufträgen ("Pool"):
        ${orderSummary}
        
        Deine Aufgabe:
        1. Analysiere, welche Aufträge zusammen eine logische One-Way-Linie ab 33181 bilden.
        2. Prüfe auf 1300kg Limit.
        3. Gib eine konkrete Empfehlung für 1-2 Touren.
        
        Antworte sehr kurz und prägnant (max 4 Sätze).
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error", error);
    return "Fehler bei der KI-Analyse.";
  }
};

export const askBenni = async (prompt: string, orders: Order[] = []) => {
  const apiKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return "Benni hat keinen API-Key konfiguriert.";
  const ai = new GoogleGenAI({ apiKey });
  const orderSummary = orders.slice(0, 20).map(o =>
    `- ${o.documentNumber} ${o.shippingCity} (${o.shippingPostcode}) ${o.totalWeightKg}kg`
  ).join('\n');
  const contents = `
    Du bist Benni, ein freundlicher Logistik-Assistent. Antworte kurz und prägnant.
    Falls der Nutzer Tourenplanung möchte, schlage 1-2 sinnvolle Touren vor.
    Aufträge (Pool, max 20 gezeigt):
    ${orderSummary || 'Keine Aufträge übergeben.'}

    Nutzerfrage:
    ${prompt}
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents
    });
    return response.text;
  } catch (e) {
    console.error("Benni Error", e);
    return "Benni konnte keine Antwort liefern.";
  }
};
