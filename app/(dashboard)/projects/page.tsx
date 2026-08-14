import { requireUser } from "@/lib/access";

export default async function ProjectsPage() {
  await requireUser("/projects");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="text-muted-foreground text-sm">Table editor coming soon.</p>
    </div>
  );
}
