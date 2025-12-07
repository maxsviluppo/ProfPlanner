import { createClient } from '@supabase/supabase-js';

// Credenziali di fallback estratte dalla richiesta originale per garantire il funzionamento
// anche se il file .env non viene caricato correttamente dall'ambiente.
const FALLBACK_URL = "https://zhgpccmzgyertwnvyiaz.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZ3BjY216Z3llcnR3bnZ5aWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTU4NDQsImV4cCI6MjA3OTU3MTg0NH0.A0WxSn-8JKpd4tXTxSxLQIoq3M-654vGpw_guAHpQQc";

// Helper per leggere le variabili d'ambiente in modo sicuro su Vite
const getEnvVar = (key: string): string => {
  // 1. Prova il metodo standard di Vite (import.meta.env)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  
  // 2. Prova il metodo legacy (process.env)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignora errori se process non è definito
  }
  
  return '';
};

// Usa le variabili d'ambiente se presenti, altrimenti usa i fallback hardcoded
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ ERRORE CRITICO: Credenziali Supabase mancanti.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);