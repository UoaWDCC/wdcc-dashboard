import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/home/CopyLinkButton";
import type { QuickLink } from "@/lib/quick-links";

export function LinkList({ links }: { links: QuickLink[] }) {
  return (
    <ul className="-mx-2 space-y-0.5">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <li
            key={link.href}
            className="hover:bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-1.5 transition"
          >
            <Icon className="text-brand-blue size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{link.label}</span>
              {link.hint && (
                <span className="text-muted-foreground block truncate text-[10px]">
                  {link.hint}
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              <CopyLinkButton href={link.href} label={link.label} />
              <Button
                variant="ghost"
                size="icon-sm"
                asChild
                title="Open in new tab"
              >
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Open ${link.label} in a new tab`}
                >
                  <ExternalLink />
                </a>
              </Button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
