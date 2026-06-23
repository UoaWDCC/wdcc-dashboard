export function UtilBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? 0;
  const colorClass =
    value === null
      ? "bg-muted-foreground/20"
      : pct >= 80
        ? "bg-brand-pink"
        : pct >= 60
          ? "bg-brand-orange"
          : "bg-brand-blue";

  return (
    <div className="grid grid-cols-[36px_1fr_44px] gap-2 items-center">
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: value === null ? "0%" : `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-right font-medium tabular-nums">
        {value === null ? <span className="text-muted-foreground">—</span> : `${pct}%`}
      </span>
    </div>
  );
}
