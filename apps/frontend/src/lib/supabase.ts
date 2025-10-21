import { createClient } from '@supabase/supabase-js';

// Direct environment variable usage for debugging
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('Supabase URL:', JSON.stringify(supabaseUrl));
console.log('Supabase URL length:', supabaseUrl?.length);
console.log('Supabase Key present:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Trim any whitespace
const cleanUrl = supabaseUrl.trim();
const cleanKey = supabaseAnonKey.trim();

console.log('Clean URL:', JSON.stringify(cleanUrl));

export const supabase = createClient(cleanUrl, cleanKey);

// Re-export types for convenience
export * from '../types';
