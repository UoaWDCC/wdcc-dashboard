import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GLOBAL_QUICK_LINKS, teamQuickLinks } from "@/lib/quick-links";
import type { QuickLink } from "@/lib/quick-links";
import type { Team } from "@/lib/types";

function LinkGrid({ links }: { links: QuickLink[] }) {
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

export function QuickLinks({ team }: { team: Team | null }) {
  const teamLinks = teamQuickLinks(team);
  if (GLOBAL_QUICK_LINKS.length === 0 && teamLinks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Quick links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamLinks.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              {team}
            </h3>
            <LinkGrid links={teamLinks} />
          </section>
        )}
        {GLOBAL_QUICK_LINKS.length > 0 && (
          <section className="space-y-2">
            {teamLinks.length > 0 && (
              <h3 className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                Everyone
              </h3>
            )}
            <LinkGrid links={GLOBAL_QUICK_LINKS} />
          </section>
        )}
      </CardContent>
    </Card>
  );
}
