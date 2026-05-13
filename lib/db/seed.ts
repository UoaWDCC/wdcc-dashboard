import { db, pool } from "./index";
import { tag, task, taskTag } from "./schema";
import { eq } from "drizzle-orm";

const TAGS = [
  { name: "frontend", color: "#3b82f6" },
  { name: "backend", color: "#8b5cf6" },
  { name: "design", color: "#ec4899" },
  { name: "infra", color: "#f59e0b" },
  { name: "docs", color: "#10b981" },
  { name: "content", color: "#14b8a6" },
  { name: "auth", color: "#ef4444" },
  { name: "db", color: "#6366f1" },
];

const DEMO_TASKS: Array<{
  title: string;
  description?: string;
  priority?: "low" | "med" | "high";
  team?: "Admin" | "Projects" | "Tech" | "Marketing" | "Industry" | "Social";
  tags?: string[];
  position: number;
}> = [
  {
    title: "Design auth flow",
    tags: ["design", "auth"],
    team: "Tech",
    priority: "high",
    position: 1,
  },
  {
    title: "Set up CI",
    tags: ["infra"],
    team: "Tech",
    priority: "med",
    position: 2,
  },
  {
    title: "Write onboarding doc",
    tags: ["docs"],
    team: "Admin",
    position: 3,
  },
  {
    title: "Sprint planning notes",
    team: "Projects",
    position: 4,
  },
];

async function main() {
  console.log("seeding tags...");
  for (const t of TAGS) {
    await db.insert(tag).values(t).onConflictDoNothing({ target: tag.name });
  }

  const tagRows = await db.select().from(tag);
  const tagIdByName = new Map(tagRows.map((r) => [r.name, r.id]));

  console.log("seeding demo tasks...");
  for (const dt of DEMO_TASKS) {
    const existing = await db
      .select({ id: task.id })
      .from(task)
      .where(eq(task.title, dt.title))
      .limit(1);
    if (existing.length > 0) continue;

    const [inserted] = await db
      .insert(task)
      .values({
        title: dt.title,
        description: dt.description,
        priority: dt.priority,
        team: dt.team,
        position: dt.position,
        status: "backlog",
      })
      .returning({ id: task.id });

    if (dt.tags?.length) {
      await db.insert(taskTag).values(
        dt.tags
          .map((name) => tagIdByName.get(name))
          .filter((id): id is string => !!id)
          .map((tagId) => ({ taskId: inserted.id, tagId }))
      );
    }
  }

  console.log("done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
