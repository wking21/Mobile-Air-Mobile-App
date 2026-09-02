export type PresetId = "today" | "7d" | "30d" | "90d" | "all";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolves a preset to a concrete {from, to} pair, evaluated against "now". */
export function presetRange(id: PresetId): { from?: string; to?: string } {
  const today = new Date();
  const to = toIsoDate(today);
  if (id === "all") return {};
  if (id === "today") return { from: to, to };
  const days = id === "7d" ? 6 : id === "30d" ? 29 : 89;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { from: toIsoDate(from), to };
}

/** Reverse lookup: does this {from, to} pair match one of the fixed presets? */
export function matchingPreset(from?: string, to?: string): PresetId | "custom" {
  for (const preset of PRESETS) {
    const range = presetRange(preset.id);
    if (range.from === from && range.to === to) return preset.id;
  }
  return "custom";
}
