"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { TaskPriority, Team } from "@/lib/types";
import type { BoardUser } from "@/lib/tasks/types";
import { useTaskForm } from "@/hooks/use-task-form";
import { TaskFormFields } from "./TaskFormFields";

export type CreateTaskFormInput = {
	title: string;
	description: string | null;
	priority: TaskPriority | null;
	team: Team | null;
	tags: string[];
	links: { url: string; title: string | null }[];
	assigneeEmails: string[];
};

export function TaskCreateDialog({
	open,
	onOpenChange,
	onCreate,
	tagSuggestions,
	users,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (input: CreateTaskFormInput) => void;
	tagSuggestions: string[];
	users: BoardUser[];
}) {
	const form = useTaskForm(null, open);
	const { values, finalLinks } = form;

	function handleCreate() {
		const trimmed = values.title.trim();
		if (!trimmed) return;
		onCreate({
			title: trimmed,
			description: values.description.trim() || null,
			priority: values.priority || null,
			team: values.team || null,
			tags: values.tags,
			links: finalLinks(),
			assigneeEmails: values.assigneeEmails,
		});
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>New task</DialogTitle>
				</DialogHeader>
				<TaskFormFields
					form={form}
					idPrefix="new-task"
					tagSuggestions={tagSuggestions}
					users={users}
					autoFocusTitle
				/>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!values.title.trim()}>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
