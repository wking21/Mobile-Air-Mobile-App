"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DateRangePicker } from "./DateRangePicker";

export function FilterBar({ drillDownLabel }: { drillDownLabel?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function clearDrillDown() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("branch");
    params.delete("item");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker />
      {drillDownLabel && (
        <button
          type="button"
          onClick={clearDrillDown}
          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          Filtered to {drillDownLabel}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
