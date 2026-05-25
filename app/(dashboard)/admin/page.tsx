import { listProfiles } from "@/lib/profile";
import type { Team, ProfileKind } from "@/lib/types";
import { ProfileRow, AddProfileRow } from "@/components/admin/ProfileRow";

export default async function AdminPage() {
  const profiles = await listProfiles();

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Members</h2>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Team</th>
              <th className="pb-2 font-medium">Kind</th>
              <th className="pb-2 font-medium">Note</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-4 text-sm text-muted-foreground text-center"
                >
                  No members yet.
                </td>
              </tr>
            ) : (
              profiles.map((row) => (
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
            <AddProfileRow />
          </tbody>
        </table>
      </section>
    </div>
  );
}
