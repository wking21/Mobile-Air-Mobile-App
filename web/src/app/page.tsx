import { AgingTable } from "@/components/AgingTable";
import { BranchLossTable } from "@/components/BranchLossTable";
import { ItemLossTable } from "@/components/ItemLossTable";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { fetchDashboardData } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { computeMetrics } from "@/lib/metrics";

// Server Component: fetches fresh data from Supabase on every request, so
// the numbers here are always current — no caching or realtime needed for
// a report someone opens to check on things, not a live operational screen.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await fetchDashboardData();
  const metrics = computeMetrics(data);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ancillary Reconciliation
        </div>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Executive Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Equipment loss and cross-branch activity, computed live from the same data the field app uses.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active loss cases" value={String(metrics.activeCaseCount)} tone={metrics.activeCaseCount > 0 ? "bad" : "default"} />
        <StatCard label="Active exposure" value={formatCurrency(metrics.activeExposure)} tone={metrics.activeExposure > 0 ? "bad" : "default"} />
        <StatCard label="Resolved cases" value={String(metrics.resolvedCaseCount)} tone="good" />
        <StatCard label="Resolved cost (written off)" value={formatCurrency(metrics.resolvedCost)} />
        <StatCard label="Deliveries completed" value={String(data.completedDeliveryCount)} />
        <StatCard label="Pickups completed" value={String(data.completedPickupCount)} />
      </div>

      <Section title="Open Cases — Oldest First" subtitle="What's been sitting the longest without a resolution.">
        <AgingTable rows={metrics.aging} />
      </Section>

      <Section title="Loss by Branch" subtitle="Where equipment loss is concentrated.">
        <BranchLossTable rows={metrics.byBranch} />
      </Section>

      <Section title="Most Frequently Lost Items" subtitle="Which items disappear most often, across all branches.">
        <ItemLossTable rows={metrics.byItem} />
      </Section>

      <p className="mt-10 text-xs text-slate-400">
        Revenue and equipment billing aren&apos;t shown here yet — that data lives in Texada/Infor and isn&apos;t
        connected to this reporting yet.
      </p>
    </main>
  );
}
