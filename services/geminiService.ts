import { GoogleGenAI, Type } from "@google/genai";
import { Order } from "../types";

// Helper to simulate "AI" route grouping reasoning
export const getOptimizationAdvice = async (orders: Order[]) => {
  if (!process.env.API_KEY) {
    console.warn("No API KEY for Gemini");
    return "AI-Dienst nicht verfügbar (Kein API Key).";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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