import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkGrid } from "@/components/home/LinkGrid";
import { GLOBAL_QUICK_LINKS, teamQuickLinks } from "@/lib/quick-links";
import type { Team } from "@/lib/types";

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
