"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BranchLossSummary } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";
import { useSort } from "@/lib/useSort";
import { SortableTh } from "./SortableTh";

export function BranchLossTable({ rows, selectedBranchId }: { rows: BranchLossSummary[]; selectedBranchId?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { sorted, sort, toggle } = useSort(
    rows,
    {
      branchName: r => r.branchName,
      openCount: r => r.openCount,
      openCost: r => r.openCost,
      resolvedCount: r => r.resolvedCount,
      resolvedCost: r => r.resolvedCost,
    },
    { key: "openCost", direction: "desc" }
  );

  function onRowClick(branchId: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("item");
    if (selectedBranchId === branchId) params.delete("branch");
    else params.set("branch", String(branchId));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (rows.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No loss activity recorded yet.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <SortableTh active={sort.key === "branchName"} direction={sort.direction} onClick={() => toggle("branchName")}>
            Branch
          </SortableTh>
          <SortableTh active={sort.key === "openCount"} direction={sort.direction} align="right" onClick={() => toggle("openCount")}>
            Open cases
          </SortableTh>
          <SortableTh active={sort.key === "openCost"} direction={sort.direction} align="right" onClick={() => toggle("openCost")}>
            Active exposure
          </SortableTh>
          <SortableTh
            active={sort.key === "resolvedCount"}
            direction={sort.direction}
            align="right"
            onClick={() => toggle("resolvedCount")}
          >
            Resolved cases
          </SortableTh>
          <SortableTh
            active={sort.key === "resolvedCost"}
            direction={sort.direction}
            align="right"
            onClick={() => toggle("resolvedCost")}
          >
            Resolved cost
          </SortableTh>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {sorted.map(row => (
          <tr
            key={row.branchId}
            onClick={() => onRowClick(row.branchId)}
            className={`cursor-pointer hover:bg-slate-50 ${selectedBranchId === row.branchId ? "bg-blue-50/70" : ""}`}
          >
            <td className="px-4 py-3 font-medium text-slate-900">{row.branchName}</td>
            <td className="px-4 py-3 text-right">{row.openCount}</td>
            <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(row.openCost)}</td>
            <td className="px-4 py-3 text-right">{row.resolvedCount}</td>
            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.resolvedCost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
