"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BranchInventoryRow } from "@/lib/data";
import { useSort } from "@/lib/useSort";
import { SortableTh } from "./SortableTh";

export function BranchInventoryTable({ rows, selectedBranchId }: { rows: BranchInventoryRow[]; selectedBranchId?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { sorted, sort, toggle } = useSort(
    rows,
    {
      branchName: r => r.branchName,
      currentlyOut: r => r.currentlyOut,
      availableUnits: r => r.availableUnits,
      inUseUnits: r => r.inUseUnits,
    },
    { key: "currentlyOut", direction: "desc" }
  );

  function onRowClick(branchId: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("item");
    if (selectedBranchId === branchId) params.delete("branch");
    else params.set("branch", String(branchId));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (rows.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No delivery/pickup activity recorded yet.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <SortableTh active={sort.key === "branchName"} direction={sort.direction} onClick={() => toggle("branchName")}>
            Branch
          </SortableTh>
          <SortableTh
            active={sort.key === "currentlyOut"}
            direction={sort.direction}
            align="right"
            onClick={() => toggle("currentlyOut")}
          >
            Currently out
          </SortableTh>
          <SortableTh
            active={sort.key === "availableUnits"}
            direction={sort.direction}
            align="right"
            onClick={() => toggle("availableUnits")}
          >
            Available (serialized)
          </SortableTh>
          <SortableTh
            active={sort.key === "inUseUnits"}
            direction={sort.direction}
            align="right"
            onClick={() => toggle("inUseUnits")}
          >
            In use (serialized)
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
            <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.currentlyOut}</td>
            <td className="px-4 py-3 text-right">{row.availableUnits}</td>
            <td className="px-4 py-3 text-right">{row.inUseUnits}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
