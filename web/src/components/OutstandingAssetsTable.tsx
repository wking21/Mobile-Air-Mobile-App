"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OutstandingAssetRow } from "@/lib/data";
import { useSort } from "@/lib/useSort";
import { SortableTh } from "./SortableTh";

function daysOut(deliveryDate: string | null): string {
  if (!deliveryDate) return "—";
  const days = Math.floor((Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24));
  return days <= 0 ? "Today" : `${days}d`;
}

export function OutstandingAssetsTable({ rows, selectedBranchId }: { rows: OutstandingAssetRow[]; selectedBranchId?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { sorted, sort, toggle } = useSort(
    rows,
    {
      assetNumber: r => r.assetNumber,
      itemName: r => r.itemName,
      branchName: r => r.branchName,
      deliveryDate: r => r.deliveryDate ?? "",
    },
    { key: "deliveryDate", direction: "asc" }
  );

  function onRowClick(branchId: number | null) {
    if (branchId === null) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("item");
    if (selectedBranchId === branchId) params.delete("branch");
    else params.set("branch", String(branchId));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (rows.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No serialized units are currently out on delivery.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <SortableTh active={sort.key === "assetNumber"} direction={sort.direction} onClick={() => toggle("assetNumber")}>
            Asset
          </SortableTh>
          <SortableTh active={sort.key === "itemName"} direction={sort.direction} onClick={() => toggle("itemName")}>
            Item
          </SortableTh>
          <SortableTh active={sort.key === "branchName"} direction={sort.direction} onClick={() => toggle("branchName")}>
            Out from branch
          </SortableTh>
          <SortableTh
            active={sort.key === "deliveryDate"}
            direction={sort.direction}
            align="right"
            onClick={() => toggle("deliveryDate")}
          >
            Out since
          </SortableTh>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {sorted.map(row => (
          <tr
            key={row.assetId}
            onClick={() => onRowClick(row.branchId)}
            className={`cursor-pointer hover:bg-slate-50 ${selectedBranchId === row.branchId ? "bg-blue-50/70" : ""}`}
          >
            <td className="px-4 py-3 font-medium text-slate-900">{row.assetNumber}</td>
            <td className="px-4 py-3 text-slate-500">{row.itemName}</td>
            <td className="px-4 py-3 text-slate-500">{row.branchName}</td>
            <td className="px-4 py-3 text-right">
              {row.deliveryDate ?? "—"} <span className="text-slate-400">({daysOut(row.deliveryDate)})</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
