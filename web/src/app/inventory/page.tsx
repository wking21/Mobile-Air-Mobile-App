import { BranchInventoryTable } from "@/components/BranchInventoryTable";
import { FilterBar } from "@/components/FilterBar";
import { InventoryTable } from "@/components/InventoryTable";
import { OutstandingAssetsTable } from "@/components/OutstandingAssetsTable";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { fetchDashboardData } from "@/lib/data";

// Server Component, fresh on every request — same reasoning as the
// Overview page. No date-range filter here: inventory is a snapshot of
// right now, not a historical window, so only the branch/item drill-down
// (shared URL param names with the Overview page, for consistency) applies.
export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; item?: string }>;
}) {
  const { branch, item } = await searchParams;
  const selectedBranchId = branch ? Number(branch) : undefined;
  const selectedItemId = item ? Number(item) : undefined;

  const data = await fetchDashboardData({ branchId: selectedBranchId, itemId: selectedItemId });
  const totalCurrentlyOut = data.inventory.reduce((sum, row) => sum + row.currentlyOut, 0);
  const totalAvailable = data.inventory.reduce((sum, row) => sum + (row.availableUnits ?? 0), 0);

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
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Live Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            What&apos;s currently out, what&apos;s available, and where — as of right now, not a historical report.
          </p>
        </div>
        <FilterBar drillDownLabel={drillDownLabel} showDateRange={false} />
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Units currently out" value={String(totalCurrentlyOut)} />
        <StatCard label="Serialized units available" value={String(totalAvailable)} />
      </div>

      <Section
        title="By Branch"
        subtitle="Click a branch to scope the whole page to it — same drill-down as the Overview page."
      >
        <BranchInventoryTable rows={data.branchInventory} selectedBranchId={selectedBranchId} />
      </Section>

      <Section
        title="By Item"
        subtitle='"Available" and "In use (scanned)" only exist for serialized/individually-tracked items — there’s no total-fleet-size figure for everything else, so those items only show "Currently out."'
      >
        <InventoryTable rows={data.inventory} selectedItemId={selectedItemId} />
      </Section>

      <Section
        title="Out on Delivery — Serialized Units"
        subtitle="Which specific unit is out and which delivery ticket it's tied to — the closest thing to a contract this app tracks until Infor contract data is connected."
      >
        <OutstandingAssetsTable rows={data.outstandingAssets} selectedBranchId={selectedBranchId} />
      </Section>
    </main>
  );
}
