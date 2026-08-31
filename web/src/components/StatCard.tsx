interface Props {
  label: string;
  value: string;
  tone?: "default" | "bad" | "good";
}

const TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-slate-900",
  bad: "text-red-600",
  good: "text-emerald-600",
};

export function StatCard({ label, value, tone = "default" }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${TONE_CLASSES[tone]}`}>{value}</div>
    </div>
  );
}
