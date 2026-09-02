"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

/**
 * Generic client-side table sort. `columns` maps a column key to how to pull
 * a comparable value out of a row; `initial` sets the default sort so each
 * table opens showing what matters most (highest cost, most days open, etc.)
 * rather than raw insertion order.
 */
export function useSort<Row, Columns extends Record<string, (row: Row) => string | number>>(
  rows: Row[],
  columns: Columns,
  initial: { key: keyof Columns; direction: SortDirection }
) {
  const [sort, setSort] = useState(initial);

  const sorted = useMemo(() => {
    const accessor = columns[sort.key];
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort.key, sort.direction]);

  function toggle(key: keyof Columns) {
    setSort(prev => (prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "desc" }));
  }

  return { sorted, sort, toggle };
}
