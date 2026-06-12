import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	createTask,
	listTasks,
	moveTask,
	softDeleteTask,
	updateTask,
} from "@/server/tasks/actions";
import type {
	ClientTask,
	CreateTaskInput,
	TaskView,
} from "@/lib/tasks/types";
import {
	applyDragLocal,
	colIdToColumnId,
	fromServer,
	neighborsOf,
} from "@/lib/tasks/utils";

export const taskKeys = {
	all: ["tasks"] as const,
};

export function useTasksQuery(initialTasks: TaskView[]) {
	return useQuery({
		queryKey: taskKeys.all,
		queryFn: async () => fromServer(await listTasks()),
		initialData: () => fromServer(initialTasks),
	});
}

export function useUpdateTaskMutation(tagIdByName: Map<string, string>) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ next }: { next: ClientTask }) => {
			await updateTask(next.id, {
				title: next.title,
				description: next.description,
				priority: next.priority,
				team: next.team,
				tagIds: next.tags
					.map((name) => tagIdByName.get(name))
					.filter((id): id is string => !!id),
				links: next.links.map((l) => ({ url: l.url, title: l.title })),
				assigneeEmails: next.assignees.map((a) => a.profileEmail),
			});
		},
		onMutate: async ({ next }) => {
			await queryClient.cancelQueries({ queryKey: taskKeys.all });
			const snapshot = queryClient.getQueryData<ClientTask[]>(taskKeys.all);
			const newAssigneeEmails = next.assignees.map((a) => a.profileEmail);
			queryClient.setQueryData<ClientTask[]>(taskKeys.all, (prev) =>
				(prev ?? []).map((t) =>
					t.id === next.id
						? {
								...next,
								status:
									t.status === "done"
										? "done"
										: newAssigneeEmails.length > 0
											? "active"
											: "backlog",
							}
						: t
				)
			);
			return { snapshot };
		},
		onError: (err, _vars, ctx) => {
			console.error("updateTask failed", err);
			if (ctx?.snapshot) queryClient.setQueryData(taskKeys.all, ctx.snapshot);
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: taskKeys.all }),
	});
}

export function useCreateTaskMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateTaskInput) => {
			await createTask(input);
		},
		onError: (err) => console.error("createTask failed", err),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: taskKeys.all }),
	});
}

export function useDeleteTaskMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await softDeleteTask(id);
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: taskKeys.all });
			const snapshot = queryClient.getQueryData<ClientTask[]>(taskKeys.all);
			queryClient.setQueryData<ClientTask[]>(taskKeys.all, (prev) =>
				(prev ?? []).filter((t) => t.id !== id)
			);
			return { snapshot };
		},
		onError: (err, _id, ctx) => {
			console.error("softDeleteTask failed", err);
			if (ctx?.snapshot) queryClient.setQueryData(taskKeys.all, ctx.snapshot);
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: taskKeys.all }),
	});
}

export type MoveTaskVars = {
	taskId: string;
	fromCol: string;
	toCol: string;
	overTaskId: string | null;
};

const moveMutationKey = ["tasks", "move"] as const;

export function useMoveTaskMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: moveMutationKey,
		onMutate: async (input: MoveTaskVars) => {
			const snapshot =
				queryClient.getQueryData<ClientTask[]>(taskKeys.all) ?? [];
			const next = applyDragLocal(
				snapshot,
				input.taskId,
				input.fromCol,
				input.toCol,
				input.overTaskId,
			);
			queryClient.setQueryData<ClientTask[]>(taskKeys.all, next);
			await queryClient.cancelQueries({ queryKey: taskKeys.all });
			return { snapshot };
		},
		mutationFn: async (input) => {
			const current =
				queryClient.getQueryData<ClientTask[]>(taskKeys.all) ?? [];
			const { beforeId, afterId } = neighborsOf(
				current,
				input.taskId,
				input.toCol,
			);
			await moveTask({
				taskId: input.taskId,
				from: colIdToColumnId(input.fromCol),
				to: colIdToColumnId(input.toCol),
				beforeId,
				afterId,
			});
		},
		onError: (err, _input, ctx) => {
			console.error("moveTask failed", err);
			if (ctx?.snapshot) queryClient.setQueryData(taskKeys.all, ctx.snapshot);
		},
		// Only invalidate when last move settles — avoids racing in-flight drags.
		onSettled: () => {
			if (queryClient.isMutating({ mutationKey: moveMutationKey }) <= 1) {
				queryClient.invalidateQueries({ queryKey: taskKeys.all });
			}
		},
	});
}
