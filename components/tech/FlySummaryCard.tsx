export function FlySummaryCard({
  label,
  value,
  unit,
  sub,
  subClass,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  subClass?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3.5">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>

      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="font-heading text-2xl font-semibold tracking-tight">
          {value}
        </span>

        {unit && (
          <span className="text-[13px] text-muted-foreground font-medium">
            {unit}
          </span>
        )}
      </div>

      <div
        className={`text-[12px] mt-0.5 ${subClass ?? "text-muted-foreground"}`}
      >
        {sub}
      </div>
    </div>
  );
}
