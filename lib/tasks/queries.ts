import { useEffect } from "react";
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
	type TaskView,
} from "@/server/tasks/actions";
import type { TaskPriority as Priority, Team } from "@/lib/types";
import type { ClientTask } from "@/lib/tasks/types";
import { colIdToColumnId, fromServer } from "@/lib/tasks/utils";

export const taskKeys = {
	all: ["tasks"] as const,
};

export function useTasksQuery(initialTasks: TaskView[]) {
	const queryClient = useQueryClient();
	useEffect(() => {
		queryClient.setQueryData<ClientTask[]>(taskKeys.all, fromServer(initialTasks));
	}, [initialTasks, queryClient]);
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

export type CreateTaskInput = {
	title: string;
	description: string | null;
	priority: Priority | null;
	team: Team | null;
	tags: string[];
	links: { url: string; title: string | null }[];
	assigneeEmails: string[];
};

export function useCreateTaskMutation(tagIdByName: Map<string, string>) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateTaskInput) => {
			await createTask({
				title: input.title,
				description: input.description ?? undefined,
				priority: input.priority ?? undefined,
				team: input.team ?? undefined,
				tagIds: input.tags
					.map((name) => tagIdByName.get(name))
					.filter((id): id is string => !!id),
				links: input.links.map((l) => ({
					url: l.url,
					title: l.title ?? undefined,
				})),
				assigneeEmails: input.assigneeEmails,
			});
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

export type MoveTaskInput = {
	taskId: string;
	fromCol: string;
	toCol: string;
	beforeId: string | null;
	afterId: string | null;
};

export function useMoveTaskMutation() {
	return useMutation({
		mutationFn: async (input: MoveTaskInput) => {
			await moveTask({
				taskId: input.taskId,
				from: colIdToColumnId(input.fromCol),
				to: colIdToColumnId(input.toCol),
				beforeId: input.beforeId,
				afterId: input.afterId,
			});
		},
		// Optimistic state already applied by drag hook. Skip invalidation — would
		// race subsequent in-flight drags. Cache re-syncs on next non-move
		// mutation or window focus.
		onError: (err) => {
			console.error("moveTask failed", err);
		},
	});
}
