import { SortDirection } from "@/lib/useSort";

export function SortableTh({
  active,
  direction,
  align = "left",
  onClick,
  children,
}: {
  active: boolean;
  direction: SortDirection;
  align?: "left" | "right";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <th className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-slate-700 ${align === "right" ? "flex-row-reverse" : ""} ${
          active ? "text-slate-700" : ""
        }`}
      >
        {children}
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="none"
          className={`shrink-0 transition-transform ${active ? "opacity-100" : "opacity-0"} ${
            active && direction === "asc" ? "rotate-180" : ""
          }`}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </th>
  );
}
