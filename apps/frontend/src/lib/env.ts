export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function validateEnvironment(): EnvConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const missingVars: string[] = [];

  if (!supabaseUrl) {
    missingVars.push('VITE_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    missingVars.push('VITE_SUPABASE_ANON_KEY');
  }

  if (missingVars.length > 0) {
    const errorMessage = `
❌ Missing required environment variables:
${missingVars.map(v => `   • ${v}`).join('\n')}

📋 Setup Instructions:
1. Create a .env file in the root directory
2. Add the following variables:

   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

3. Get these values from your Supabase project dashboard:
   • Project URL: Settings → API → Project URL
   • Anon Key: Settings → API → Project API keys → anon/public

4. Restart the development server after adding the .env file
`;
    
    throw new Error(errorMessage);
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`);
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}