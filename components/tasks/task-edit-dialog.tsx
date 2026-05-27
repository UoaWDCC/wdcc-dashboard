"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { BoardUser, ClientTask } from "@/lib/tasks/types";
import { useTaskForm, type TaskFormValues } from "@/hooks/use-task-form";
import { TaskFormFields } from "./task-form-fields";

function taskToValues(task: ClientTask): TaskFormValues {
	return {
		title: task.title,
		description: task.description ?? "",
		tags: task.tags,
		links: task.links,
		linkDraft: "",
		priority: task.priority ?? "",
		team: task.team ?? "",
		assigneeEmails: task.assignees.map((a) => a.profileEmail),
	};
}

export function TaskEditDialog({
	task,
	open,
	onOpenChange,
	onSave,
	onDelete,
	tagSuggestions,
	users,
}: {
	task: ClientTask | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (task: ClientTask) => void;
	onDelete: (id: string) => void;
	tagSuggestions: string[];
	users: BoardUser[];
}) {
	const initial = useMemo(() => (task ? taskToValues(task) : null), [task]);
	const form = useTaskForm(initial, task?.id);
	const { values, finalLinks } = form;

	function handleSave() {
		if (!task) return;
		const trimmed = values.title.trim();
		if (!trimmed) return;
		onSave({
			...task,
			title: trimmed,
			description: values.description.trim() || null,
			tags: values.tags,
			links: finalLinks(),
			priority: values.priority || null,
			team: values.team || null,
			assignees: values.assigneeEmails.map((email, i) => ({
				profileEmail: email,
				position:
					task.assignees.find((a) => a.profileEmail === email)?.position ??
					i + 1,
			})),
		});
		onOpenChange(false);
	}

	function handleDelete() {
		if (!task) return;
		onDelete(task.id);
		onOpenChange(false);
	}

	const assigneesDisabled = task?.status === "done";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit task</DialogTitle>
				</DialogHeader>
				<TaskFormFields
					form={form}
					idPrefix="task"
					tagSuggestions={tagSuggestions}
					users={users}
					assigneesDisabled={assigneesDisabled}
				/>
				<DialogFooter className="sm:justify-between">
					<Button variant="destructive" onClick={handleDelete}>
						Delete
					</Button>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={!values.title.trim()}>
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
