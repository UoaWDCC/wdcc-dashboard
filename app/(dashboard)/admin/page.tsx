import { listProfiles } from "@/lib/profile";
import type { Team, ProfileKind } from "@/lib/types";
import { ProfileRow, AddProfileRow } from "@/components/admin/ProfileRow";
import { ResyncButton } from "@/components/admin/ResyncButton";

export default async function AdminPage() {
  const profiles = await listProfiles();
  const byTeam = (a: Row, b: Row) =>
    (a.team ?? "￿").localeCompare(b.team ?? "￿") ||
    a.email.localeCompare(b.email);
  const personal = profiles.filter((p) => p.kind === "personal").sort(byTeam);
  const shared = profiles.filter((p) => p.kind === "shared").sort(byTeam);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <ResyncButton />
      </div>

      <ProfileSection title="Personal" kind="personal" rows={personal} />
      <ProfileSection title="Shared" kind="shared" rows={shared} />
    </div>
  );
}

type Row = {
  email: string;
  name: string;
  team: string | null;
  kind: string;
  note: string | null;
};

function ProfileSection({
  title,
  kind,
  rows,
}: {
  title: string;
  kind: ProfileKind;
  rows: Row[];
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{title}</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Team</th>
            <th className="pb-2 font-medium">Note</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="py-4 text-sm text-muted-foreground text-center"
              >
                No {title.toLowerCase()} members yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <ProfileRow
                key={row.email}
                email={row.email}
                name={row.name}
                team={row.team as Team | null}
                kind={row.kind as ProfileKind}
                note={row.note}
              />
            ))
          )}
          <AddProfileRow kind={kind} />
        </tbody>
      </table>
    </section>
  );
}
