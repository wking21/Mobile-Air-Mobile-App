"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/inventory", label: "Inventory" },
];

export function NavTabs() {
  const pathname = usePathname();
  const router = useRouter();

  // No nav on the login page itself — nothing there is reachable before
  // signing in anyway (proxy.ts redirects straight back).
  if (pathname.startsWith("/login")) return null;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
        <div className="flex gap-6">
          {TABS.map(tab => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-1 py-3 text-sm font-medium ${
                  active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <button type="button" onClick={signOut} className="text-sm font-medium text-slate-500 hover:text-slate-700">
          Sign Out
        </button>
      </div>
    </nav>
  );
}
