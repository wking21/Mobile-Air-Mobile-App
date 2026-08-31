import { AgingCase } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function AgingTable({ rows }: { rows: AgingCase[] }) {
  if (rows.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No open cases — nothing outstanding right now.</div>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-3 font-semibold">Item</th>
          <th className="px-4 py-3 font-semibold">Branch</th>
          <th className="px-4 py-3 font-semibold">Status</th>
          <th className="px-4 py-3 font-semibold">Assigned to</th>
          <th className="px-4 py-3 font-semibold text-right">Days open</th>
          <th className="px-4 py-3 font-semibold text-right">Cost</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(row => (
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
