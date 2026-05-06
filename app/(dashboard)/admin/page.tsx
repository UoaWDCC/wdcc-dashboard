import { listAllowedEmails, listAllowedDomains } from "@/lib/allowlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addEmailAction, removeEmailAction, addDomainAction, removeDomainAction } from "./actions";

export default async function AdminPage() {
  const [emails, domains] = await Promise.all([
    listAllowedEmails(),
    listAllowedDomains(),
  ]);

  return (
    <div className="space-y-10 max-w-2xl">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {/* Allowed Emails */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Allowed emails</h2>

        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails added yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Note</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {emails.map((row) => (
                <tr key={row.email} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono">{row.email}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{row.note ?? "—"}</td>
                  <td className="py-2 text-right">
                    <form action={removeEmailAction}>
                      <input type="hidden" name="email" value={row.email} />
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        Remove
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={addEmailAction} className="flex gap-2">
          <Input name="email" type="email" placeholder="name@example.com" required className="flex-1" />
          <Input name="note" placeholder="Note (optional)" className="flex-1" />
          <Button type="submit">Add</Button>
        </form>
      </section>

      {/* Allowed Domains */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Allowed domains</h2>

        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No domains added yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Domain</th>
                <th className="pb-2 font-medium">Note</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {domains.map((row) => (
                <tr key={row.domain} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono">{row.domain}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{row.note ?? "—"}</td>
                  <td className="py-2 text-right">
                    <form action={removeDomainAction}>
                      <input type="hidden" name="domain" value={row.domain} />
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        Remove
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={addDomainAction} className="flex gap-2">
          <Input name="domain" placeholder="example.com" required className="flex-1" />
          <Input name="note" placeholder="Note (optional)" className="flex-1" />
          <Button type="submit">Add</Button>
        </form>
      </section>
    </div>
  );
}
