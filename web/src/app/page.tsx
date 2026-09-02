import { AgingTable } from "@/components/AgingTable";
import { BranchLossChart } from "@/components/BranchLossChart";
import { BranchLossTable } from "@/components/BranchLossTable";
import { FilterBar } from "@/components/FilterBar";
import { ItemLossChart } from "@/components/ItemLossChart";
import { ItemLossTable } from "@/components/ItemLossTable";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { fetchDashboardData } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { computeMetrics } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";

// Server Component: fetches fresh data from Supabase on every request, so
// the numbers here are always current — no caching or realtime needed for
// a report someone opens to check on things, not a live operational screen.
// The date range and branch/item drill-down all live in the URL's search
// params, so every filtered view here is a shareable/bookmarkable link and
// a browser back/forward step un-filters exactly like the user expects.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branch?: string; item?: string }>;
}) {
  const { from, to, branch, item } = await searchParams;
  const selectedBranchId = branch ? Number(branch) : undefined;
  const selectedItemId = item ? Number(item) : undefined;

  const supabase = await createClient();
  const data = await fetchDashboardData(supabase, { from, to, branchId: selectedBranchId, itemId: selectedItemId });
  const metrics = computeMetrics(data);

  const drillDownLabel = selectedBranchId
    ? data.branches.find(b => b.id === selectedBranchId)?.name
    : selectedItemId
      ? data.items.find(i => i.id === selectedItemId)?.name
      : undefined;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ancillary Reconciliation</div>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Executive Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Equipment loss and cross-branch activity, computed live from the same data the field app uses. See the
            Inventory tab for what&apos;s currently out and available.
          </p>
        </div>
        <FilterBar drillDownLabel={drillDownLabel} />
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active loss cases" value={String(metrics.activeCaseCount)} tone={metrics.activeCaseCount > 0 ? "bad" : "default"} />
        <StatCard label="Active exposure" value={formatCurrency(metrics.activeExposure)} tone={metrics.activeExposure > 0 ? "bad" : "default"} />
        <StatCard label="Resolved cases" value={String(metrics.resolvedCaseCount)} tone="good" />
        <StatCard label="Resolved cost (written off)" value={formatCurrency(metrics.resolvedCost)} />
        <StatCard label="Deliveries completed" value={String(data.completedDeliveryCount)} />
        <StatCard label="Pickups completed" value={String(data.completedPickupCount)} />
      </div>

      <Section
        title="Loss by Branch"
        subtitle={
          selectedItemId
            ? "Which branches this item has gone missing at — click a branch or a bar to scope the whole page to it."
            : "Where equipment loss is concentrated — click a branch or a bar to scope the whole page to it."
        }
      >
        <BranchLossChart rows={metrics.byBranch} selectedBranchId={selectedBranchId} />
        <div className="border-t border-slate-100">
          <BranchLossTable rows={metrics.byBranch} selectedBranchId={selectedBranchId} />
        </div>
      </Section>

      <Section
        title="Most Frequently Lost Items"
        subtitle={
          selectedBranchId
            ? "Which items this branch has lost most often — click an item or a bar to scope the whole page to it."
            : "Which items disappear most often, across all branches — click an item or a bar to scope the whole page to it."
        }
      >
        <ItemLossChart rows={metrics.byItem} selectedItemId={selectedItemId} />
        <div className="border-t border-slate-100">
          <ItemLossTable rows={metrics.byItem} selectedItemId={selectedItemId} />
        </div>
      </Section>

      <Section title="Open Cases — Oldest First" subtitle="What's been sitting the longest without a resolution.">
        <AgingTable rows={metrics.aging} />
      </Section>

      <p className="mt-10 text-xs text-slate-400">
        Revenue and equipment billing aren&apos;t shown here yet — that data lives in Texada/Infor and isn&apos;t
        connected to this reporting yet.
      </p>
    </main>
  );
}
