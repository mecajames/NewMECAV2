import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const cleanUrl = supabaseUrl.trim();
const cleanKey = supabaseAnonKey.trim();

export const supabase = createClient(cleanUrl, cleanKey, {
  realtime: {
    params: {
      eventsPerSecond: 0
    }
  },
  global: {
    headers: {}
  }
});

// Re-export types for convenience
export * from '../types';
