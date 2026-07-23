/** Formati supportati: legacy AIza... e nuove auth key AQ.... / Q.... */
export const normalizeApiKey = (raw: string): string => {
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
};

export const getStoredApiKey = (): string => {
  const fromStorage = localStorage.getItem("profplanner_api_key");
  const fromEnv =
    process.env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  return normalizeApiKey(fromStorage || fromEnv || "");
};

export const isLikelyGeminiApiKey = (key: string): boolean => {
  const normalized = normalizeApiKey(key);
  if (normalized.length < 20) return false;

  return (
    normalized.startsWith("AIza") ||
    normalized.startsWith("AQ.") ||
    normalized.startsWith("AQ") ||
    /^Q[A-Za-z0-9._-]/.test(normalized)
  );
};

export const describeApiKeyFormat = (key: string): string => {
  const normalized = normalizeApiKey(key);
  if (normalized.startsWith("AIza")) return "Standard (AIza...)";
  if (normalized.startsWith("AQ.") || normalized.startsWith("AQ")) return "Auth (AQ...)";
  if (/^Q/.test(normalized)) return "Auth (Q...)";
  return "Sconosciuto";
};
