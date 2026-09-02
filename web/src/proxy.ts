import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Named `proxy.ts`, not `middleware.ts` — Next 16 renamed the file
// convention (middleware.js is deprecated; see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// Runs before every matched request: refreshes the session cookie and
// gates every route except /login behind having one. RLS (see
// supabase/migrations/008_role_based_access.sql) is still the real
// enforcement for WHAT a signed-in user can see — this only enforces THAT
// they're signed in at all.
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() verifies the JWT locally rather than trusting whatever's in
  // the cookie — the secure replacement for the old getSession()-in-middleware
  // advice (see @supabase/ssr's own bundled guidance on this).
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = !!data?.claims;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  if (!isSignedIn && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isSignedIn && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
