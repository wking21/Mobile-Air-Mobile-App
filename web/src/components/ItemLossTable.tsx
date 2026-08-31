import { ItemLossSummary } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";

export function ItemLossTable({ rows }: { rows: ItemLossSummary[] }) {
  if (rows.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No loss activity recorded yet.</div>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-3 font-semibold">Item</th>
          <th className="px-4 py-3 font-semibold">Category</th>
          <th className="px-4 py-3 font-semibold text-right">Times lost</th>
          <th className="px-4 py-3 font-semibold text-right">Units missing (total)</th>
          <th className="px-4 py-3 font-semibold text-right">Total cost</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(row => (
          <tr key={row.itemId}>
            <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
            <td className="px-4 py-3 text-slate-500">{row.category}</td>
            <td className="px-4 py-3 text-right">{row.timesLost}</td>
            <td className="px-4 py-3 text-right">{row.totalQtyMissing}</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(row.totalCost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
