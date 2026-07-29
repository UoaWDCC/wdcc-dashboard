import type { Team, ProfileKind } from "@/lib/types";
import { ProfileRow } from "@/components/admin/ProfileRow";
import { AddProfileRow } from "@/components/admin/AddProfileRow";

export type Row = {
  email: string;
  name: string;
  team: Team | null;
  kind: ProfileKind;
  note: string | null;
};

export function ProfileSection({
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
                team={row.team}
                kind={row.kind}
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
