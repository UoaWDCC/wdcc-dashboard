import { listGoLinks, listGoRedirects } from "@/lib/linktree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  addGoRedirectAction,
  removeGoRedirectAction,
  toggleGoRedirectHiddenAction,
} from "@/server/linktree/actions";
import GoLinksManager from "./GoLinksManager";

export default async function LinktreePage() {
  const [links, redirects] = await Promise.all([
    listGoLinks(),
    listGoRedirects(),
  ]);

  return (
    <div className="space-y-10 max-w-5xl">
      <h1 className="text-2xl font-semibold">Linktree</h1>

      <GoLinksManager initialLinks={links} />

      {/* Go Redirects */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Go redirects</h2>

        <details>
          <summary className="inline-flex h-8 w-fit cursor-pointer list-none items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
            Add redirect
          </summary>
          <form
            action={addGoRedirectAction}
            className="mt-3 flex flex-col gap-2 sm:flex-row"
          >
            <Input
              name="key"
              placeholder="slug (e.g. github)"
              required
              className="flex-1"
            />
            <Input
              name="destinationUrl"
              type="url"
              placeholder="https://..."
              required
              className="flex-1"
            />
            <Button type="submit" className="sm:shrink-0">
              Add
            </Button>
          </form>
        </details>

        {redirects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No redirects added yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Key</th>
                  <th className="pb-2 font-medium">Destination</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Flags</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {redirects.map((row) => (
                  <tr
                    key={row.key}
                    className={cn(
                      "border-b last:border-0",
                      row.hidden && "opacity-50"
                    )}
                  >
                    <td className="py-2 pr-4 font-mono font-medium">{row.key}</td>
                    <td className="py-2 pr-4 max-w-[280px]">
                      <a
                        href={row.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-muted-foreground hover:text-foreground truncate block"
                      >
                        {row.destinationUrl}
                      </a>
                    </td>
                    <td className="py-2 pr-4 hidden sm:table-cell">
                      {row.hidden && <Badge variant="outline">Hidden</Badge>}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <form action={toggleGoRedirectHiddenAction}>
                          <input type="hidden" name="key" value={row.key} />
                          <input
                            type="hidden"
                            name="hidden"
                            value={row.hidden ? "false" : "true"}
                          />
                          <Button variant="ghost" size="sm">
                            {row.hidden ? "Show" : "Hide"}
                          </Button>
                        </form>
                        <form action={removeGoRedirectAction}>
                          <input type="hidden" name="key" value={row.key} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
