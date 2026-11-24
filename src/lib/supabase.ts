import { createClient, SupabaseClient } from '@supabase/supabase-js';

const RUNTIME_CONFIG_STORAGE_KEY = 'errorex_supabase_runtime_config';

function isValidSupabaseConfig(url?: string | null, anonKey?: string | null): boolean {
  const cleanUrl = (url || '').trim();
  const cleanKey = (anonKey || '').trim();
  return Boolean(
    cleanUrl &&
      cleanKey &&
      cleanUrl.startsWith('http') &&
      !cleanUrl.includes('your-project') &&
      !cleanKey.includes('your-anon')
  );
}

function readStoredRuntimeConfig(): { url: string; anonKey: string } {
  try {
    if (typeof localStorage === 'undefined') return { url: '', anonKey: '' };
    const raw = localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
    if (!raw) return { url: '', anonKey: '' };
    const parsed = JSON.parse(raw);
    return {
      url: typeof parsed?.url === 'string' ? parsed.url.trim() : '',
      anonKey: typeof parsed?.anonKey === 'string' ? parsed.anonKey.trim() : ''
    };
  } catch {
    return { url: '', anonKey: '' };
  }
}

function resolveInitialCredentials(): { url: string; anonKey: string } {
  const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const envUrl = (viteEnv.VITE_SUPABASE_URL || '').trim();
  const envKey = (viteEnv.VITE_SUPABASE_ANON_KEY || '').trim();
  if (isValidSupabaseConfig(envUrl, envKey)) {
    return { url: envUrl, anonKey: envKey };
  }
  const stored = readStoredRuntimeConfig();
  if (isValidSupabaseConfig(stored.url, stored.anonKey)) {
    return stored;
  }
  return { url: '', anonKey: '' };
}

let activeCredentials = resolveInitialCredentials();

function buildClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 15
      }
    }
  });
}

export let isSupabaseConfigured: boolean = isValidSupabaseConfig(
  activeCredentials.url,
  activeCredentials.anonKey
);

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? buildClient(activeCredentials.url, activeCredentials.anonKey)
  : null;

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  return { ...activeCredentials };
}

export function setRuntimeSupabaseConfig(url: string, anonKey: string, persist = true): boolean {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanKey = anonKey.trim();
  if (!isValidSupabaseConfig(cleanUrl, cleanKey)) {
    return false;
  }
  const changed =
    activeCredentials.url !== cleanUrl || activeCredentials.anonKey !== cleanKey || !supabase;
  activeCredentials = { url: cleanUrl, anonKey: cleanKey };
  isSupabaseConfigured = true;
  if (changed) {
    supabase = buildClient(cleanUrl, cleanKey);
  }
  if (persist && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(
        RUNTIME_CONFIG_STORAGE_KEY,
        JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
      );
    } catch {
      // quiet
    }
  }
  return true;
}

export function clearRuntimeSupabaseConfig(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
    }
  } catch {
    // quiet
  }
  const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const envUrl = (viteEnv.VITE_SUPABASE_URL || '').trim();
  const envKey = (viteEnv.VITE_SUPABASE_ANON_KEY || '').trim();
  if (isValidSupabaseConfig(envUrl, envKey)) {
    activeCredentials = { url: envUrl, anonKey: envKey };
    isSupabaseConfigured = true;
    supabase = buildClient(envUrl, envKey);
  } else {
    activeCredentials = { url: '', anonKey: '' };
    isSupabaseConfigured = false;
    supabase = null;
  }
}

let runtimeInitPromise: Promise<boolean> | null = null;

/**
 * Ensures Supabase is initialized even if Netlify env vars were added after Vite build
 * or configured under SUPABASE_URL / SUPABASE_ANON_KEY (via /api/public-config).
 */
export async function initSupabaseRuntime(): Promise<boolean> {
  if (isSupabaseConfigured && supabase) return true;
  if (runtimeInitPromise) return runtimeInitPromise;

  runtimeInitPromise = (async () => {
    try {
      const res = await fetch('/api/public-config', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (isValidSupabaseConfig(data?.supabaseUrl, data?.supabaseAnonKey)) {
          setRuntimeSupabaseConfig(data.supabaseUrl, data.supabaseAnonKey, true);
          return true;
        }
      }
    } catch {
      // quiet if offline or endpoint unavailable
    }
    return isSupabaseConfigured;
  })();

  const result = await runtimeInitPromise;
  runtimeInitPromise = null;
  return result;
}

const CORE_TABLES = [
  'user_profiles',
  'user_credentials',
  'conversations',
  'messages',
  'friend_requests',
  'friendships',
  'statuses'
] as const;

export interface SupabaseDiagnostics {
  connected: boolean;
  message: string;
  missingTables?: string[];
  tableStatus?: Record<string, boolean>;
}

// Helper to check Supabase connection & verify all core tables
export async function testSupabaseConnection(): Promise<SupabaseDiagnostics> {
  if (!isSupabaseConfigured || !supabase) {
    await initSupabaseRuntime();
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message:
        'Supabase URL/Anon Key not found. Add VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in Netlify and redeploy, or connect below.'
    };
  }

  try {
    const checks = await Promise.all(
      CORE_TABLES.map(async table => {
        const { error } = await supabase!.from(table).select('count', { count: 'exact', head: true });
        const ok = !error || error.code === 'PGRST116';
        return { table, ok, error };
      })
    );

    const tableStatus: Record<string, boolean> = {};
    const missingTables: string[] = [];
    let firstErrMsg = '';

    for (const c of checks) {
      tableStatus[c.table] = c.ok;
      if (!c.ok) {
        missingTables.push(c.table);
        if (!firstErrMsg && c.error?.message) firstErrMsg = c.error.message;
      }
    }

    if (missingTables.length > 0) {
      return {
        connected: false,
        missingTables,
        tableStatus,
        message: `Supabase connected, but missing/blocked tables (${missingTables.join(', ')}). Run supabase_schema.sql in Supabase SQL Editor. (${firstErrMsg})`
      };
    }

    return {
      connected: true,
      missingTables: [],
      tableStatus,
      message: 'All 7 Supabase PostgreSQL tables connected & synced!'
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
