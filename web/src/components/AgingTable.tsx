"use client";

import { AgingCase } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";
import { useSort } from "@/lib/useSort";
import { SortableTh } from "./SortableTh";
import { StatusBadge } from "./StatusBadge";

// `rows` arrives already scoped to whatever date range / branch / item is
// selected — see page.tsx, which fetches from Supabase with those filters
// applied rather than filtering client-side here.
export function AgingTable({ rows }: { rows: AgingCase[] }) {
  const { sorted, sort, toggle } = useSort(
    rows,
    {
      itemName: r => r.itemName,
      branchName: r => r.branchName,
      status: r => r.status,
      assignedTo: r => r.assignedTo ?? "",
      daysOpen: r => r.daysOpen,
      estimatedCost: r => r.estimatedCost,
    },
    { key: "daysOpen", direction: "desc" }
  );

  if (rows.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No open cases — nothing outstanding right now.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <SortableTh active={sort.key === "itemName"} direction={sort.direction} onClick={() => toggle("itemName")}>
            Item
          </SortableTh>
          <SortableTh active={sort.key === "branchName"} direction={sort.direction} onClick={() => toggle("branchName")}>
            Branch
          </SortableTh>
          <SortableTh active={sort.key === "status"} direction={sort.direction} onClick={() => toggle("status")}>
            Status
          </SortableTh>
          <SortableTh active={sort.key === "assignedTo"} direction={sort.direction} onClick={() => toggle("assignedTo")}>
            Assigned to
          </SortableTh>
          <SortableTh active={sort.key === "daysOpen"} direction={sort.direction} align="right" onClick={() => toggle("daysOpen")}>
            Days open
          </SortableTh>
          <SortableTh
            active={sort.key === "estimatedCost"}
            direction={sort.direction}
            align="right"
            onClick={() => toggle("estimatedCost")}
          >
            Cost
          </SortableTh>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {sorted.map(row => (
          <tr key={row.id}>
            <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
            <td className="px-4 py-3 text-slate-600">{row.branchName}</td>
            <td className="px-4 py-3">
              <StatusBadge status={row.status} />
            </td>
            <td className="px-4 py-3 text-slate-600">{row.assignedTo ?? "Unassigned"}</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.daysOpen}</td>
            <td className="px-4 py-3 text-right text-red-600 font-semibold">{formatCurrency(row.estimatedCost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
