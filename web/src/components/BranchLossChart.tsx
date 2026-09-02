"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BranchLossSummary } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";
import { HorizontalBarChart } from "./HorizontalBarChart";

// Sequential blue — the palette's default single hue for a "compare
// magnitude across categories" chart (see dataviz skill, choosing-a-form).
const BLUE = "#2a78d6";

export function BranchLossChart({ rows, selectedBranchId }: { rows: BranchLossSummary[]; selectedBranchId?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const data = [...rows]
    .filter(r => r.openCost > 0)
    .sort((a, b) => b.openCost - a.openCost)
    .map(r => ({ id: r.branchId, label: r.branchName, value: r.openCost }));

  function onSelect(branchId: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("item");
    if (selectedBranchId === branchId) params.delete("branch");
    else params.set("branch", String(branchId));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <HorizontalBarChart
      data={data}
      color={BLUE}
      selectedId={selectedBranchId}
      onSelect={onSelect}
      formatValue={formatCurrency}
      emptyMessage="No active exposure right now."
    />
  );
}
