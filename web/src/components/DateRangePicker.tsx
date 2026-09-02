"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { matchingPreset, PRESETS, presetRange } from "@/lib/dateRange";

function label(from?: string, to?: string): string {
  const preset = matchingPreset(from, to);
  if (preset !== "custom") return PRESETS.find(p => p.id === preset)!.label;
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Through ${to}`;
  return "All time";
}

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");
  const rootRef = useRef<HTMLDivElement>(null);

  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const selected = matchingPreset(from, to);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pushRange(next: { from?: string; to?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.from) params.set("from", next.from);
    else params.delete("from");
    if (next.to) params.set("to", next.to);
    else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-slate-400">
          <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {label(from, to)}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-slate-400">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="py-1">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => pushRange(presetRange(preset.id))}
                className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {preset.label}
                {selected === preset.id && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-600">
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Custom range</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
            </div>
            <button
              type="button"
              disabled={!customFrom && !customTo}
              onClick={() => pushRange({ from: customFrom || undefined, to: customTo || undefined })}
              className="mt-2 w-full rounded-lg bg-slate-900 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
