const STYLES = {
  confirmed: "border-[var(--line)] text-ivory",
  cancelled: "border-[var(--line-soft)] text-ivory-dim line-through",
  no_show: "border-[#f0a3a3] text-[#f0a3a3]",
} as const;
const LABELS = { confirmed: "Confirmed", cancelled: "Cancelled", no_show: "No-show" } as const;

export function StatusChip({ status }: { status: keyof typeof STYLES }) {
  return <span className={`inline-block border px-2 py-0.5 text-[.65rem] uppercase tracking-[.15em] ${STYLES[status]}`}>{LABELS[status]}</span>;
}
