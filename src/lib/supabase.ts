import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read Supabase credentials from client environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Initialize Supabase Client if configured, or null
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Helper to check Supabase connection health
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message: 'Supabase credentials not configured in .env (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY)'
    };
  }

  try {
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      return {
        connected: false,
        message: `Supabase returned: ${error.message}`
      };
    }
    return {
      connected: true,
      message: 'Connected to Supabase PostgreSQL database successfully!'
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Connection to Supabase failed'
    };
  }
}

// Supabase Auth Integration Helpers
export async function supabaseSignIn(email: string, pass: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignUp(email: string, pass: string, displayName?: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        display_name: displayName || email.split('@')[0]
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
