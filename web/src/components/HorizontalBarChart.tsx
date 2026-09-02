"use client";

import { useState } from "react";

export interface BarDatum {
  id: number;
  label: string;
  value: number;
}

// Sequential (single-hue) horizontal bar chart: one measure, ranked
// low-to-high across categories. No legend — a single series needs none,
// the section title above already says what's plotted. Values are direct
// labels beside every bar (never hover-only), so nothing here is reachable
// only through interaction; hover/focus just adds the "this one responded"
// feedback on top of data that's already fully visible.
export function HorizontalBarChart({
  data,
  color,
  selectedId,
  onSelect,
  formatValue,
  emptyMessage,
}: {
  data: BarDatum[];
  color: string;
  selectedId?: number;
  onSelect: (id: number) => void;
  formatValue: (value: number) => string;
  emptyMessage: string;
}) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (data.length === 0) {
    return <div className="p-6 text-sm text-slate-500">{emptyMessage}</div>;
  }

  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-1 p-5">
      {data.map(d => {
        const widthPct = Math.max((d.value / max) * 100, 2);
        const isSelected = selectedId === d.id;
        const isActive = hoveredId === d.id || isSelected;
        return (
          <button
            key={d.id}
            type="button"
            onMouseEnter={() => setHoveredId(d.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(d.id)}
            onBlur={() => setHoveredId(null)}
            onClick={() => onSelect(d.id)}
            className="grid w-full grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
          >
            <span
              className={`truncate text-sm ${isSelected ? "font-semibold text-slate-900" : "text-slate-600"}`}
              title={d.label}
            >
              {d.label}
            </span>
            <span className="flex min-w-0 items-center">
              <span className="relative h-[22px] min-w-[2px] flex-none rounded-r-[4px]" style={{ width: `${widthPct}%` }}>
                <span
                  className="absolute inset-0 rounded-r-[4px]"
                  style={{
                    backgroundColor: color,
                    filter: isActive ? "brightness(0.88)" : undefined,
                    outline: isSelected ? `2px solid ${color}` : undefined,
                    outlineOffset: 1,
                  }}
                />
              </span>
              <span className="ml-2.5 whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700">
                {formatValue(d.value)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
