import { GoogleGenAI, Type } from "@google/genai";
import { Course, Modality } from "../types";

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"] as const;

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const getApiKey = (): string => {
  const fromStorage = localStorage.getItem("profplanner_api_key");
  const fromEnv =
    process.env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  const apiKey = (fromStorage || fromEnv || "").trim().replace(/\s+/g, "");
  if (!apiKey) {
    throw new Error(
      "API Key mancante. Vai in Impostazioni e inserisci la tua Google Gemini API Key, oppure crea un file .env.local con GEMINI_API_KEY=..."
    );
  }
  return apiKey;
};

const SYSTEM_INSTRUCTION = `
Sei un assistente intelligente per un docente.
Il tuo compito è analizzare del testo grezzo (copiato da Excel, PDF o email) contenente orari di lezione.
Devi estrarre le informazioni e strutturarle in un oggetto JSON con chiave "courses" (array di lezioni).

Regole di estrazione:
1. 'date': formato YYYY-MM-DD. Se la data è relativa (es. "Lunedì"), assumi la prossima occorrenza di quel giorno rispetto a oggi.
2. 'startTime' e 'endTime': formato HH:mm (24h).
3. 'modality': esattamente 'PRESENZA' o 'DAD'. Default: 'PRESENZA'.
4. 'name': nome della materia o del corso.
5. 'code': codice del corso se presente, altrimenti stringa vuota.

Ignora righe che non sembrano lezioni.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    courses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          date: { type: Type.STRING },
          startTime: { type: Type.STRING },
          endTime: { type: Type.STRING },
          modality: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
        required: ["name", "date", "startTime", "endTime", "modality"],
      },
    },
  },
  required: ["courses"],
};

const normalizeModality = (value: unknown): Modality => {
  const modality = String(value || "").toUpperCase();
  return modality === "DAD" ? "DAD" : "PRESENZA";
};

const parseAiJson = (text: string): unknown[] => {
  const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleanText || '{"courses":[]}');

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { courses?: unknown[] }).courses)) {
    return (parsed as { courses: unknown[] }).courses;
  }

  throw new SyntaxError("Formato JSON non valido");
};

const toCourses = (items: unknown[]): Course[] =>
  items.map((item) => {
    const course = item as Partial<Course>;
    return {
      id: generateId(),
      name: String(course.name || "").trim(),
      code: String(course.code || "").trim(),
      date: String(course.date || "").trim(),
      startTime: String(course.startTime || "").trim(),
      endTime: String(course.endTime || "").trim(),
      modality: normalizeModality(course.modality),
      notes: String(course.notes || "").trim(),
    };
  });

const formatApiError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Impossibile interpretare i dati.";
  }

  const status = (error as Error & { status?: number }).status;
  let apiMessage = error.message;

  try {
    const parsed = JSON.parse(error.message);
    apiMessage =
      parsed?.error?.message ||
      parsed?.error?.status ||
      error.message;
  } catch {
    // keep original message
  }

  if (status === 400) {
    return `Richiesta non valida verso Gemini (${apiMessage}). Riprova con un testo più breve o più chiaro.`;
  }
  if (status === 401 || status === 403) {
    return "API Key non valida o non autorizzata. Controlla la chiave in Impostazioni (deve provenire da Google AI Studio).";
  }
  if (status === 429) {
    return "Limite di richieste Gemini superato. Attendi qualche minuto e riprova.";
  }
  if (status === 500 || status === 503) {
    return "Errore temporaneo del servizio Gemini. Riprova tra poco. Se persiste, verifica la API Key e il modello.";
  }
  if (error.message.includes("API Key")) {
    return "Errore API Key: verifica la chiave nelle impostazioni.";
  }

  return apiMessage || "Impossibile interpretare i dati.";
};

const requestStructured = async (ai: GoogleGenAI, rawData: string, model: string) => {
  return ai.models.generateContent({
    model,
    contents: `Analizza questi dati e convertili in JSON:\n\n${rawData}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });
};

const requestPlainJson = async (ai: GoogleGenAI, rawData: string, model: string) => {
  return ai.models.generateContent({
    model,
    contents: `Analizza questi dati e rispondi SOLO con JSON valido nel formato {"courses":[...]}.\n\n${rawData}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    },
  });
};

export const parseScheduleData = async (rawData: string): Promise<Course[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      let response;
      try {
        response = await requestStructured(ai, rawData, model);
      } catch (structuredError) {
        const status = (structuredError as Error & { status?: number }).status;
        if (status === 400 || status === 500 || status === 503) {
          response = await requestPlainJson(ai, rawData, model);
        } else {
          throw structuredError;
        }
      }

      const courses = toCourses(parseAiJson(response.text || '{"courses":[]}'));
      return courses;
    } catch (error) {
      lastError = error;
      console.error(`Errore parsing AI con modello ${model}:`, error);
    }
  }

  if (lastError instanceof SyntaxError) {
    throw new Error("L'AI ha generato un formato dati non valido. Riprova.");
  }

  throw new Error(formatApiError(lastError));
};
