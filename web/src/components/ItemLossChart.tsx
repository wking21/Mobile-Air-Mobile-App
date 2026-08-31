"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ItemLossSummary } from "@/lib/metrics";
import { HorizontalBarChart } from "./HorizontalBarChart";

// Second sequential context on the same page as the branch chart, so it
// takes the next categorical slot's hue (orange) instead of reusing blue —
// see dataviz skill, palette.md "Sequential hue".
const ORANGE = "#eb6834";
const MAX_BARS = 10;

export function ItemLossChart({ rows, selectedItemId }: { rows: ItemLossSummary[]; selectedItemId?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sorted = [...rows].filter(r => r.timesLost > 0).sort((a, b) => b.timesLost - a.timesLost);
  const data = sorted.slice(0, MAX_BARS).map(r => ({ id: r.itemId, label: r.itemName, value: r.timesLost }));

  function onSelect(itemId: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("branch");
    if (selectedItemId === itemId) params.delete("item");
    else params.set("item", String(itemId));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <HorizontalBarChart
        data={data}
        color={ORANGE}
        selectedId={selectedItemId}
        onSelect={onSelect}
        formatValue={v => `${v}×`}
        emptyMessage="No loss activity recorded yet."
      />
      {sorted.length > MAX_BARS && (
        <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
          Showing top {MAX_BARS} of {sorted.length} items with recorded loss — see the full list below.
        </div>
      )}
    </>
  );
}
