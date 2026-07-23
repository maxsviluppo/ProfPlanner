import { GoogleGenAI, Type } from "@google/genai";
import { Course, Modality } from "../types";
import { describeApiKeyFormat, getStoredApiKey, isLikelyGeminiApiKey, normalizeApiKey } from "./apiKeyUtils";

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"] as const;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const requireApiKey = (override?: string): string => {
  const apiKey = normalizeApiKey(override || getStoredApiKey());
  if (!apiKey) {
    throw new Error(
      "API Key mancante. Vai in Impostazioni, incolla la chiave Gemini (formato AQ... o AIza...) e clicca Salva."
    );
  }
  if (!isLikelyGeminiApiKey(apiKey)) {
    throw new Error(
      "La chiave sembra incompleta o non valida. Copia l'intera key da Google AI Studio (inizia con AQ... o AIza...) e salvala di nuovo."
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

const extractApiErrorDetails = (error: unknown): { status?: number; message: string; reason?: string } => {
  if (!(error instanceof Error)) {
    return { message: "Impossibile interpretare i dati." };
  }

  const status = (error as Error & { status?: number }).status;
  let message = error.message;
  let reason: string | undefined;

  try {
    const parsed = JSON.parse(error.message);
    message = parsed?.error?.message || message;
    reason = parsed?.error?.status || parsed?.error?.details?.[0]?.reason;
  } catch {
    // keep original message
  }

  return { status, message, reason };
};

export const formatGeminiApiError = (error: unknown): string => {
  const { status, message, reason } = extractApiErrorDetails(error);
  const combined = `${message} ${reason || ""}`.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    combined.includes("api key") ||
    combined.includes("api_key") ||
    combined.includes("invalid") ||
    combined.includes("unauthorized") ||
    combined.includes("permission_denied")
  ) {
    return [
      "API Key non valida o non autorizzata.",
      "Verifica che:",
      "1) hai copiato l'intera chiave (nuovo formato AQ... o legacy AIza...)",
      "2) hai cliccato Salva nelle Impostazioni",
      "3) la key in AI Studio è attiva e non bloccata",
      "4) se hai restrizioni referrer, aggiungi http://localhost:5173/* e http://127.0.0.1:5173/*",
    ].join(" ");
  }

  if (status === 400) {
    return `Richiesta non valida verso Gemini (${message}). Riprova con un testo più breve o più chiaro.`;
  }
  if (status === 429) {
    return "Limite di richieste Gemini superato. Attendi qualche minuto e riprova.";
  }
  if (status === 500 || status === 503) {
    return "Errore temporaneo del servizio Gemini. Riprova tra poco.";
  }

  return message || "Impossibile interpretare i dati.";
};

const createClient = (apiKey: string) => new GoogleGenAI({ apiKey });

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

/** Chiamata REST nativa Gemini: compatibile con le nuove auth key AQ... */
const requestViaRest = async (apiKey: string, rawData: string, model: string): Promise<string> => {
  const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{
        role: "user",
        parts: [{ text: `Analizza questi dati e rispondi SOLO con JSON nel formato {"courses":[...]}:\n\n${rawData}` }],
      }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(JSON.stringify(payload)) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Risposta Gemini vuota o non valida.");
  }

  return text;
};

const generateWithModel = async (apiKey: string, rawData: string, model: string): Promise<string> => {
  const ai = createClient(apiKey);

  try {
    try {
      const response = await requestStructured(ai, rawData, model);
      return response.text || '{"courses":[]}';
    } catch (structuredError) {
      const status = (structuredError as Error & { status?: number }).status;
      if (status === 400 || status === 500 || status === 503) {
        const response = await requestPlainJson(ai, rawData, model);
        return response.text || '{"courses":[]}';
      }
      throw structuredError;
    }
  } catch (sdkError) {
    const status = (sdkError as Error & { status?: number }).status;
    if (status === 401 || status === 403 || status === 400 || status === 500 || status === 503) {
      return requestViaRest(apiKey, rawData, model);
    }
    throw sdkError;
  }
};

export const testGeminiApiKey = async (apiKeyOverride?: string): Promise<string> => {
  const apiKey = requireApiKey(apiKeyOverride);
  const model = MODELS[0];

  try {
    const ai = createClient(apiKey);
    await ai.models.generateContent({
      model,
      contents: 'Rispondi solo con la parola "OK".',
    });
    return `Connessione riuscita (${describeApiKeyFormat(apiKey)}).`;
  } catch (sdkError) {
    try {
      const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: 'Rispondi solo con "OK".' }] }],
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(JSON.stringify(payload)) as Error & { status?: number };
        err.status = response.status;
        throw err;
      }

      return `Connessione riuscita via REST (${describeApiKeyFormat(apiKey)}).`;
    } catch (restError) {
      console.error("Test API key fallito (SDK):", sdkError);
      console.error("Test API key fallito (REST):", restError);
      throw new Error(formatGeminiApiError(restError));
    }
  }
};

export const parseScheduleData = async (rawData: string): Promise<Course[]> => {
  const apiKey = requireApiKey();
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      const responseText = await generateWithModel(apiKey, rawData, model);
      return toCourses(parseAiJson(responseText));
    } catch (error) {
      lastError = error;
      console.error(`Errore parsing AI con modello ${model}:`, error);
    }
  }

  if (lastError instanceof SyntaxError) {
    throw new Error("L'AI ha generato un formato dati non valido. Riprova.");
  }

  throw new Error(formatGeminiApiError(lastError));
};
