import { GoogleGenAI, Type } from "@google/genai";
import { Course } from "../types";

// Helper for ID generation locally to avoid external dependencies like uuid
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const parseScheduleData = async (rawData: string): Promise<Course[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key mancante");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    Sei un assistente intelligente per un docente.
    Il tuo compito è analizzare del testo grezzo (copiato da Excel, PDF o email) contenente orari di lezione.
    Devi estrarre le informazioni e strutturarle in un array JSON.
    
    Regole di estrazione:
    1. 'date': formato YYYY-MM-DD. Se la data è relativa (es. "Lunedì"), assumi che si riferisca alla prossima occorrenza di quel giorno rispetto a oggi (o alla settimana corrente se specificato).
    2. 'startTime' e 'endTime': formato HH:mm (24h).
    3. 'modality': Deve essere esattamente 'PRESENZA' o 'DAD'. Se non specificato, cerca indizi come "Aula" (PRESENZA) o "Online/Zoom/Meet" (DAD). Default: 'PRESENZA'.
    4. 'name': Il nome della materia o del corso.
    5. 'code': Codice del corso se presente (es. A12, CORSO-01), altrimenti stringa vuota.
    
    Ignora righe che non sembrano lezioni.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analizza questi dati e convertili in JSON:\n\n${rawData}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              code: { type: Type.STRING },
              date: { type: Type.STRING },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              modality: { type: Type.STRING, enum: ["PRESENZA", "DAD"] },
              notes: { type: Type.STRING },
            },
            required: ["name", "date", "startTime", "endTime", "modality"],
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text || "[]");
    
    // Add IDs locally
    return parsedData.map((item: any) => ({
      ...item,
      id: generateId(),
      code: item.code || '',
      notes: item.notes || ''
    }));

  } catch (error) {
    console.error("Errore durante il parsing AI:", error);
    throw new Error("Impossibile interpretare i dati. Assicurati che il testo contenga date e orari chiari.");
  }
};