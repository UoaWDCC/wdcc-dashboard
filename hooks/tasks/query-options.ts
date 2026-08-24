import { getBoardAction } from "@/server/tasks/actions";
import type { TaskView } from "@/lib/tasks/types";
import { fromServer } from "@/lib/tasks/utils";

export const taskKeys = {
  all: ["tasks"] as const,
};

export const boardQuery = (initialTasks: TaskView[]) => ({
  queryKey: taskKeys.all,
  queryFn: async () => fromServer((await getBoardAction()).tasks),
  initialData: () => fromServer(initialTasks),
});
