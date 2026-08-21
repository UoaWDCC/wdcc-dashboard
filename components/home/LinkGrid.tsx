import type { QuickLink } from "@/lib/quick-links";

export function LinkGrid({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {links.map((link) => {
        const Icon = link.icon;
        const external = link.href.startsWith("http");
        return (
          <a
            key={link.href}
            href={link.href}
            {...(external
              ? { target: "_blank", rel: "noreferrer noopener" }
              : {})}
            className="ring-foreground/10 hover:ring-brand-blue/40 hover:bg-brand-blue/5 flex items-center gap-2 rounded-lg px-3 py-2 ring-1 transition"
          >
            <Icon className="text-brand-blue size-4 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-sm">{link.label}</span>
              {link.hint && (
                <span className="text-muted-foreground block truncate text-[10px]">
                  {link.hint}
                </span>
              )}
            </span>
          </a>
        );
      })}
    </div>
  );
}
