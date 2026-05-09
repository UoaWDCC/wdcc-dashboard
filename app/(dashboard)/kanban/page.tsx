import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
};

type Column = {
  id: string;
  label: string;
  tasks: Task[];
};

const members = ["Alex", "Bea", "Chen", "Dani", "Evan"];

const backlog: Task[] = [
  { id: "t1", title: "Design auth flow", tags: ["design"] },
  { id: "t2", title: "Set up CI", tags: ["infra"] },
  { id: "t3", title: "Write onboarding doc", tags: ["docs"] },
  { id: "t4", title: "Sprint planning notes" },
];

const memberTasks: Record<string, Task[]> = {
  Alex: [
    { id: "a1", title: "Kanban layout", tags: ["frontend"] },
    { id: "a2", title: "Sidebar polish", tags: ["frontend"] },
  ],
  Bea: [{ id: "b1", title: "RBAC review", tags: ["backend"] }],
  Chen: [
    { id: "c1", title: "DB migrations", tags: ["db"] },
    { id: "c2", title: "Schema cleanup", tags: ["db"] },
  ],
  Dani: [{ id: "d1", title: "Marketing page copy", tags: ["content"] }],
  Evan: [],
};

const done: Task[] = [
  { id: "x1", title: "Repo bootstrap" },
  { id: "x2", title: "Login w/ Google", tags: ["auth"] },
];

const backlogCol: Column = { id: "backlog", label: "Backlog", tasks: backlog };
const doneCol: Column = { id: "done", label: "Done", tasks: done };
const memberCols: Column[] = members.map((m) => ({
  id: `member-${m}`,
  label: m,
  tasks: memberTasks[m] ?? [],
}));

function TaskCard({ task }: { task: Task }) {
  return (
    <Card size="sm" className="cursor-grab">
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
      </CardHeader>
      {(task.description || task.tags?.length) && (
        <CardContent className="flex flex-col gap-2">
          {task.description && (
            <p className="text-muted-foreground text-xs">{task.description}</p>
          )}
          {task.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {task.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}

function KanbanColumn({
  column,
  className,
  accent = "neutral",
}: {
  column: Column;
  className?: string;
  accent?: "neutral" | "blue" | "blue-strong";
}) {
  const accentStyles = {
    neutral: {
      wrap: "bg-muted ring-foreground/15",
      header: "border-foreground/10",
      title: "",
      count: "text-muted-foreground",
    },
    blue: {
      wrap: "bg-brand-blue/5 ring-brand-blue/25",
      header: "border-brand-blue/20",
      title: "text-brand-blue",
      count: "bg-brand-blue/15 text-brand-blue rounded-md px-1.5 py-0.5",
    },
    "blue-strong": {
      wrap: "bg-brand-blue/10 ring-brand-blue/40",
      header: "border-brand-blue/30",
      title: "text-brand-blue",
      count: "bg-brand-blue text-brand-blue-fg rounded-md px-1.5 py-0.5",
    },
  }[accent];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-lg ring-1",
        accentStyles.wrap,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 border-b",
          accentStyles.header
        )}
      >
        <h2
          className={cn(
            "text-sm font-semibold tracking-tight",
            accentStyles.title
          )}
        >
          {column.label}
        </h2>
        <span className={cn("text-xs tabular-nums", accentStyles.count)}>
          {column.tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-24">
        {column.tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const totalTasks =
    backlogCol.tasks.length +
    doneCol.tasks.length +
    memberCols.reduce((n, c) => n + c.tasks.length, 0);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Kanban</h1>
        <p className="text-muted-foreground text-xs">
          {totalTasks} tasks · {members.length} members
        </p>
      </div>
      <div className="flex flex-1 min-h-0 gap-3">
        <KanbanColumn
          column={backlogCol}
          className="w-64 shrink-0"
          accent="blue"
        />
        <section className="flex min-w-0 flex-1 flex-col rounded-lg ring-1 ring-brand-blue/15 bg-brand-blue/[0.03]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-brand-blue/15">
            <h2 className="text-sm font-semibold tracking-tight text-brand-blue">
              Ongoing Tasks
            </h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {members.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
              {memberCols.map((col) => (
                <KanbanColumn key={col.id} column={col} />
              ))}
            </div>
          </div>
        </section>
        <KanbanColumn
          column={doneCol}
          className="w-64 shrink-0"
          accent="blue-strong"
        />
      </div>
    </div>
  );
}
