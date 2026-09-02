import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project values (same project the mobile app uses).'
  );
}

// One client per request, bound to that request's session cookie — RLS then
// enforces branch/role scoping as this specific signed-in user, the same
// way the mobile app already works. This replaces the single module-level
// service-role client this file used to export: that bypassed RLS
// entirely, which was fine when the dashboard had no login at all but
// defeats the point now that access is scoped per user.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component during render, which can't set
          // cookies — safe to ignore since proxy.ts refreshes the session
          // on every request before any page renders.
        }
      },
    },
  });
}
