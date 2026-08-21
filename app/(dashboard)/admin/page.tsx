import { requireUser } from "@/lib/access";
import { listProfiles } from "@/lib/profile";
import { ProfileSection, type Row } from "@/components/admin/ProfileSection";
import { ResyncButton } from "@/components/admin/ResyncButton";

const byTeam = (a: Row, b: Row) => {
  if (a.team !== b.team) {
    if (a.team === null) return 1;
    if (b.team === null) return -1;
    return a.team.localeCompare(b.team);
  }
  return a.email.localeCompare(b.email);
};

export default async function AdminPage() {
  // The layout gate renders concurrently with this page, so gate here too.
  await requireUser("/admin");

  const profiles = (await listProfiles()) as Row[];
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
