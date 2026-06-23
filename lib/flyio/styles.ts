import type { DisplayState } from "./types";

export const STATE_META: Record<
  DisplayState,
  { label: string; barClass: string; badgeClass: string; accentClass: string }
> = {
  started:   { label: "Running",   barClass: "bg-brand-green",         badgeClass: "bg-brand-green/10 text-brand-green border-brand-green/20",       accentClass: "bg-brand-green" },
  created:   { label: "Created",   barClass: "bg-brand-orange",        badgeClass: "bg-brand-orange/10 text-brand-orange border-brand-orange/20",     accentClass: "bg-brand-orange" },
  suspended: { label: "Suspended", barClass: "bg-brand-blue/50",       badgeClass: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",           accentClass: "bg-brand-blue/50" },
  stopped:   { label: "Stopped",   barClass: "bg-muted-foreground/40", badgeClass: "bg-secondary text-muted-foreground border-border",                accentClass: "bg-muted-foreground/40" },
  failed:    { label: "Failed",    barClass: "bg-brand-pink",          badgeClass: "bg-brand-pink/10 text-brand-pink border-brand-pink/20",           accentClass: "bg-brand-pink" },
  other:     { label: "Other",     barClass: "bg-muted-foreground/20", badgeClass: "bg-secondary text-muted-foreground border-border",                accentClass: "bg-muted-foreground/20" },
};
