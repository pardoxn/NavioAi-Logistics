import { createClient } from '@supabase/supabase-js';

// SAFE MODE:
// Returns null if no valid keys are provided, preventing the app from crashing.
const getSupabase = () => {
  try {
    const env = (import.meta as any).env;
    if (!env) return null;

    const url = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_ANON_KEY;

    if (url && key && url.startsWith('http')) {
      return createClient(url, key);
    }
  } catch (e) {
    // Ignore errors in environments where import.meta is not available
    console.warn("Supabase Init Skipped:", e);
  }
  
  console.warn("Supabase Keys missing. Running in Offline/Demo Mode.");
  return null;
};

export const supabase = getSupabase();