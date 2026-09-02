import { LossCase } from "@/lib/data";

const LABEL: Record<LossCase["status"], string> = {
  open: "Open",
  pending_approval: "Pending Approval",
  resolved: "Resolved",
};

const CLASSES: Record<LossCase["status"], string> = {
  open: "bg-red-100 text-red-700",
  pending_approval: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ status }: { status: LossCase["status"] }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${CLASSES[status]}`}>
      {LABEL[status]}
    </span>
  );
}
