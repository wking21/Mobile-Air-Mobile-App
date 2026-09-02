import { DashboardData, LossCase } from './data';

export interface BranchLossSummary {
  branchId: number;
  branchName: string;
  openCount: number;
  openCost: number;
  resolvedCount: number;
  resolvedCost: number;
}

export interface ItemLossSummary {
  itemId: number;
  itemName: string;
  category: string;
  timesLost: number;
  totalQtyMissing: number;
  totalCost: number;
}

export interface AgingCase extends LossCase {
  branchName: string;
  itemName: string;
  daysOpen: number;
}

export interface DashboardMetrics {
  activeCaseCount: number;
  activeExposure: number;
  resolvedCaseCount: number;
  resolvedCost: number;
  byBranch: BranchLossSummary[];
  byItem: ItemLossSummary[];
  aging: AgingCase[];
}

function isActive(status: LossCase['status']): boolean {
  return status === 'open' || status === 'pending_approval';
}

export function computeMetrics(data: DashboardData): DashboardMetrics {
  const branchName = (id: number) => data.branches.find(b => b.id === id)?.name ?? 'Unknown branch';
  const item = (id: number) => data.items.find(i => i.id === id);

  const active = data.lossCases.filter(l => isActive(l.status));
  const resolved = data.lossCases.filter(l => l.status === 'resolved');

  const byBranchMap = new Map<number, BranchLossSummary>();
  data.lossCases.forEach(loss => {
    const existing = byBranchMap.get(loss.branchId) ?? {
      branchId: loss.branchId,
      branchName: branchName(loss.branchId),
      openCount: 0,
      openCost: 0,
      resolvedCount: 0,
      resolvedCost: 0,
    };
    if (isActive(loss.status)) {
      existing.openCount += 1;
      existing.openCost += loss.estimatedCost;
    } else {
      existing.resolvedCount += 1;
      existing.resolvedCost += loss.estimatedCost;
    }
    byBranchMap.set(loss.branchId, existing);
  });

  const byItemMap = new Map<number, ItemLossSummary>();
  data.lossCases.forEach(loss => {
    const master = item(loss.itemId);
    const existing = byItemMap.get(loss.itemId) ?? {
      itemId: loss.itemId,
      itemName: master?.name ?? 'Unknown item',
      category: master?.category ?? '',
      timesLost: 0,
      totalQtyMissing: 0,
      totalCost: 0,
    };
    existing.timesLost += 1;
    existing.totalQtyMissing += loss.quantityMissing;
    existing.totalCost += loss.estimatedCost;
    byItemMap.set(loss.itemId, existing);
  });

  const now = Date.now();
  const aging: AgingCase[] = active
    .map(loss => ({
      ...loss,
      branchName: branchName(loss.branchId),
      itemName: item(loss.itemId)?.name ?? 'Unknown item',
      daysOpen: Math.floor((now - new Date(loss.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.daysOpen - a.daysOpen);

  return {
    activeCaseCount: active.length,
    activeExposure: active.reduce((sum, l) => sum + l.estimatedCost, 0),
    resolvedCaseCount: resolved.length,
    resolvedCost: resolved.reduce((sum, l) => sum + l.estimatedCost, 0),
    byBranch: Array.from(byBranchMap.values()).sort((a, b) => b.openCost - a.openCost),
    byItem: Array.from(byItemMap.values()).sort((a, b) => b.timesLost - a.timesLost),
    aging,
  };
}
