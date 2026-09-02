import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill in your Supabase project values (same project the mobile app uses).'
  );
}

// This module is only ever imported by server-side code (Server Components,
// data.ts) — never by a 'use client' file — so it's safe to use the service
// role key here, which is required now that RLS on every table demands an
// authenticated user (see supabase/migrations/007_require_authentication.sql).
// This dashboard has no login of its own; it's a trusted internal reporting
// surface, so it reads with a key that bypasses RLS entirely rather than
// pretending to be a signed-in end user. Never prefix this env var with
// NEXT_PUBLIC_ or import this file from client code — that would ship the
// service role key to every visitor's browser.
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
