import { queryOptions, skipToken } from "@tanstack/react-query";
import { getBoardAction } from "@/server/tasks/actions";
import type { BoardData, BoardMeta, TaskView } from "@/lib/tasks/types";
import { fromServer } from "@/lib/tasks/utils";

// Flat siblings, not nested under ["tasks"]: RQ matches by prefix, so nested
// keys would be swept by every invalidateQueries({ queryKey: taskKeys.all }).
export const taskKeys = {
  all: ["tasks"] as const,
  meta: ["tasks-meta"] as const,
  version: ["tasks-version"] as const,
};

export const boardQuery = (
  initialTasks: TaskView[],
  onBoard: (board: BoardData) => void
) => ({
  queryKey: taskKeys.all,
  queryFn: async () => {
    const board = await getBoardAction();
    onBoard(board);
    return fromServer(board.tasks);
  },
  initialData: () => fromServer(initialTasks),
});

// Fetch-less entry: only the board queryFn's onBoard fan-out writes it.
export const boardMetaQuery = (initial: BoardMeta) =>
  queryOptions({
    queryKey: taskKeys.meta,
    queryFn: skipToken,
    initialData: initial,
    staleTime: Infinity,
  });
