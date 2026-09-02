import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project values (same project the mobile app uses).'
  );
}

// Only for the login form and sign-out (the only client-side auth calls
// this dashboard makes) — everything else runs server-side via
// lib/supabase/server.ts.
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}
