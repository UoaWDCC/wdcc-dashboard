import { requireUser } from "@/lib/access";

export default async function HomePage() {
  await requireUser("/");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p className="text-muted-foreground text-sm">
        Pick a team in the sidebar.
      </p>
    </div>
  );
}
