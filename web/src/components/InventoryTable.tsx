"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InventoryItemRow } from "@/lib/data";
import { useSort } from "@/lib/useSort";
import { SortableTh } from "./SortableTh";

export function InventoryTable({ rows, selectedItemId }: { rows: InventoryItemRow[]; selectedItemId?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { sorted, sort, toggle } = useSort(
    rows,
    {
      itemName: r => r.itemName,
      category: r => r.category,
      currentlyOut: r => r.currentlyOut,
      availableUnits: r => r.availableUnits ?? -1,
      inUseUnits: r => r.inUseUnits ?? -1,
    },
    { key: "currentlyOut", direction: "desc" }
  );

  function onRowClick(itemId: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("branch");
    if (selectedItemId === itemId) params.delete("item");
    else params.set("item", String(itemId));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (rows.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No delivery/pickup activity recorded yet.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <SortableTh active={sort.key === "itemName"} direction={sort.direction} onClick={() => toggle("itemName")}>
            Item
          </SortableTh>
          <SortableTh active={sort.key === "category"} direction={sort.direction} onClick={() => toggle("category")}>
            Category
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
            Available
          </SortableTh>
          <SortableTh
            active={sort.key === "inUseUnits"}
            direction={sort.direction}
            align="right"
            onClick={() => toggle("inUseUnits")}
          >
            In use (scanned)
          </SortableTh>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {sorted.map(row => (
          <tr
            key={row.itemId}
            onClick={() => onRowClick(row.itemId)}
            className={`cursor-pointer hover:bg-slate-50 ${selectedItemId === row.itemId ? "bg-orange-50/70" : ""}`}
          >
            <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
            <td className="px-4 py-3 text-slate-500">{row.category}</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.currentlyOut}</td>
            <td className="px-4 py-3 text-right">{row.availableUnits ?? <span className="text-slate-300">—</span>}</td>
            <td className="px-4 py-3 text-right">{row.inUseUnits ?? <span className="text-slate-300">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
