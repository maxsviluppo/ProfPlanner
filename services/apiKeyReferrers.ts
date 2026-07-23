/** Domini da autorizzare nelle restrizioni referrer della Gemini API Key (Google AI Studio). */
export const GEMINI_API_KEY_REFERRERS = [
  "https://prof-planner.vercel.app/*",
  "http://localhost:5173/*",
  "http://127.0.0.1:5173/*",
] as const;

export const GEMINI_API_KEY_REFERRERS_HINT = GEMINI_API_KEY_REFERRERS.join("\n");
