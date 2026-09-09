import { createClient } from '@supabase/supabase-js';

const sanitizeUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
};

// Use import.meta.glob to optionally load dev-keys.ts without breaking if it's deleted
const devKeysModules = import.meta.glob('./dev-keys.ts', { eager: true });
const devKeys: any = devKeysModules['./dev-keys.ts'] || {};

const supabaseUrl = sanitizeUrl(
  import.meta.env.VITE_SUPABASE_URL || devKeys.SUPABASE_URL
);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || devKeys.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials are missing. Please check your .env file or dev-keys.ts.");
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key');
