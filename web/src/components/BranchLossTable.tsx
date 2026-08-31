import { BranchLossSummary } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";

export function BranchLossTable({ rows }: { rows: BranchLossSummary[] }) {
  if (rows.length === 0) {
    return <div className="p-6 text-sm text-slate-500">No loss activity recorded yet.</div>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-3 font-semibold">Branch</th>
          <th className="px-4 py-3 font-semibold text-right">Open cases</th>
          <th className="px-4 py-3 font-semibold text-right">Active exposure</th>
          <th className="px-4 py-3 font-semibold text-right">Resolved cases</th>
          <th className="px-4 py-3 font-semibold text-right">Resolved cost</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(row => (
          <tr key={row.branchId}>
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
