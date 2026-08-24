import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT, PRIORITY_LABEL } from "@/lib/types";
import { type MyTask } from "@/lib/home/types";
import { dueLabel, dueState } from "@/lib/home/utils";

const DUE_CLASS: Record<string, string> = {
  overdue: "border-red-500/40 text-red-600 dark:text-red-400",
  today: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  soon: "border-foreground/20 text-muted-foreground",
  later: "border-foreground/15 text-muted-foreground",
};

export function MyDayCard({
  tasks,
  today,
  name,
}: {
  tasks: MyTask[];
  today: string;
  name: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>My day</CardTitle>
        <CardAction>
          <Link
            href="/tasks"
            className="text-brand-blue inline-flex items-center gap-1 text-xs hover:underline"
          >
            Open board
            <ArrowRight className="size-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing active assigned to you, {name}. Pull something from the
            backlog on the{" "}
            <Link href="/tasks" className="text-brand-blue hover:underline">
              task board
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-foreground/10 -my-2 divide-y">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 py-2">
                <span
                  aria-label={
                    task.priority
                      ? PRIORITY_LABEL[task.priority]
                      : "No priority"
                  }
                  className={cn(
                    "inline-block size-2 shrink-0 rounded-full",
                    task.priority
                      ? PRIORITY_DOT[task.priority]
                      : "bg-foreground/20"
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {task.title}
                </span>
                {task.otherAssignees > 0 && (
                  <span
                    title={`${task.otherAssignees} other assignee${task.otherAssignees === 1 ? "" : "s"}`}
                    className="text-muted-foreground inline-flex items-center gap-0.5 text-[10px]"
                  >
                    <Users className="size-3" />
                    {task.otherAssignees}
                  </span>
                )}
                {task.team && (
                  <Badge variant="outline" className="text-[10px]">
                    {task.team}
                  </Badge>
                )}
                {task.dueDate && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      DUE_CLASS[dueState(task.dueDate, today)]
                    )}
                  >
                    {dueLabel(task.dueDate, today)}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
