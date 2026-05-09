import { listGoLinks, listGoRedirects } from "@/lib/linktree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  addGoLinkAction,
  removeGoLinkAction,
  toggleGoLinkHiddenAction,
  addGoRedirectAction,
  removeGoRedirectAction,
  toggleGoRedirectHiddenAction,
} from "./actions";

export default async function LinktreePage() {
  const [links, redirects] = await Promise.all([
    listGoLinks(),
    listGoRedirects(),
  ]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-10 max-w-5xl">
      <h1 className="text-2xl font-semibold">Linktree</h1>

      {/* Go Links */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Go links</h2>

        <details>
          <summary className="inline-flex h-8 w-fit cursor-pointer list-none items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
            Add link
          </summary>
          <form action={addGoLinkAction} className="mt-3 space-y-2">
            {/* Required fields */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input name="label" placeholder="Label" required />
              <Input name="link" type="url" placeholder="https://..." required />
              <Input name="team" placeholder="Team (optional)" />
            </div>
            {/* Optional fields — wrap naturally on narrow screens */}
            <div className="flex flex-wrap gap-2 items-end">
              <Input
                name="hoverHint"
                placeholder="Hover hint (optional)"
                className="min-w-[160px] flex-1"
              />
              <Input
                name="iconUrl"
                type="url"
                placeholder="Icon URL (optional)"
                className="min-w-[160px] flex-1"
              />
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Event date
                </label>
                <Input name="eventDate" type="date" className="w-36" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Sort order
                </label>
                <Input
                  name="sortOrder"
                  type="number"
                  defaultValue="0"
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2 h-9 shrink-0">
                <input
                  type="checkbox"
                  name="isPermanent"
                  id="isPermanent"
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
                <label
                  htmlFor="isPermanent"
                  className="cursor-pointer text-sm whitespace-nowrap"
                >
                  Permanent
                </label>
              </div>
              <Button type="submit" className="shrink-0">
                Add
              </Button>
            </div>
          </form>
        </details>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">No links added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Label</th>
                  <th className="pb-2 font-medium">Link</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Team</th>
                  <th className="pb-2 font-medium hidden md:table-cell">Event date</th>
                  <th className="pb-2 font-medium hidden md:table-cell">Order</th>
                  <th className="pb-2 font-medium">Flags</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {links.map((row) => {
                  const isExpired =
                    row.eventDate !== null && row.eventDate < today;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b last:border-0",
                        (row.hidden || isExpired) && "opacity-50"
                      )}
                    >
                      <td className="py-2 pr-4 font-medium">{row.label}</td>
                      <td className="py-2 pr-4 max-w-[200px]">
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-muted-foreground hover:text-foreground truncate block"
                        >
                          {row.link}
                        </a>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground hidden sm:table-cell">
                        {row.team ?? "—"}
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-muted-foreground hidden md:table-cell">
                        {row.eventDate ?? "—"}
                      </td>
                      <td className="py-2 pr-4 tabular-nums text-muted-foreground hidden md:table-cell">
                        {row.sortOrder}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-1 flex-wrap">
                          {row.isPermanent && (
                            <Badge variant="secondary">Permanent</Badge>
                          )}
                          {isExpired && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                          {row.hidden && (
                            <Badge variant="outline">Hidden</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <form action={toggleGoLinkHiddenAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <input
                              type="hidden"
                              name="hidden"
                              value={row.hidden ? "false" : "true"}
                            />
                            <Button variant="ghost" size="sm">
                              {row.hidden ? "Show" : "Hide"}
                            </Button>
                          </form>
                          <form action={removeGoLinkAction}>
                            <input type="hidden" name="id" value={row.id} />
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
