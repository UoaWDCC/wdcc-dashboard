"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	TASK_PRIORITIES,
	TEAMS,
	type TaskPriority,
	type Team,
} from "@/lib/types";
import type { BoardUser } from "@/lib/tasks/types";
import type { TaskFormApi } from "@/hooks/useTaskForm";
import { TagInput } from "./TagInput";

export function TaskFormFields({
	form,
	idPrefix,
	tagSuggestions,
	users,
	assigneesDisabled = false,
	autoFocusTitle = false,
}: {
	form: TaskFormApi;
	idPrefix: string;
	tagSuggestions: string[];
	users: BoardUser[];
	assigneesDisabled?: boolean;
	autoFocusTitle?: boolean;
}) {
	const { values, setField, addLink, removeLinkAt, toggleAssignee } = form;

	return (
		<div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${idPrefix}-title`}>Title</Label>
				<Input
					id={`${idPrefix}-title`}
					value={values.title}
					onChange={(e) => setField("title", e.target.value)}
					autoFocus={autoFocusTitle}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${idPrefix}-desc`}>Description</Label>
				<Textarea
					id={`${idPrefix}-desc`}
					rows={8}
					value={values.description}
					onChange={(e) => setField("description", e.target.value)}
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={`${idPrefix}-priority`}>Priority</Label>
					<Select
						value={values.priority || undefined}
						onValueChange={(v) => setField("priority", v as TaskPriority)}
					>
						<SelectTrigger id={`${idPrefix}-priority`}>
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							{TASK_PRIORITIES.map((p) => (
								<SelectItem key={p} value={p}>
									{p}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={`${idPrefix}-team`}>Team</Label>
					<Select
						value={values.team || undefined}
						onValueChange={(v) => setField("team", v as Team)}
					>
						<SelectTrigger id={`${idPrefix}-team`}>
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							{TEAMS.map((t) => (
								<SelectItem key={t} value={t}>
									{t}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label>
					Assignees
					{assigneesDisabled && (
						<span className="text-muted-foreground ml-2 text-xs font-normal">
							(not available for done tasks)
						</span>
					)}
				</Label>
				<div className="flex flex-wrap gap-1.5">
					{users.map((m) => {
						const active = values.assigneeEmails.includes(m.email);
						return (
							<button
								key={m.email}
								type="button"
								disabled={assigneesDisabled}
								onClick={() => toggleAssignee(m.email)}
								className={cn(
									"rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
									active
										? "bg-brand-blue text-brand-blue-fg border-transparent"
										: "border-input hover:bg-accent",
								)}
							>
								{m.name}
							</button>
						);
					})}
				</div>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${idPrefix}-tags`}>Tags</Label>
				<TagInput
					id={`${idPrefix}-tags`}
					tags={values.tags}
					onChange={(tags) => setField("tags", tags)}
					suggestions={tagSuggestions}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${idPrefix}-link`}>Links</Label>
				<div className="flex gap-2">
					<Input
						id={`${idPrefix}-link`}
						type="url"
						placeholder="https://..."
						value={values.linkDraft}
						onChange={(e) => setField("linkDraft", e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addLink();
							}
						}}
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={addLink}
						aria-label="Add link"
					>
						<Plus className="size-4" />
					</Button>
				</div>
				{values.links.length > 0 && (
					<ul className="flex flex-col gap-1">
						{values.links.map((l, i) => (
							<li
								key={`${l.url}-${i}`}
								className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 text-xs"
							>
								<a
									href={l.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand-blue min-w-0 flex-1 truncate hover:underline"
								>
									{l.url}
								</a>
								<button
									type="button"
									aria-label={`Remove ${l.url}`}
									onClick={() => removeLinkAt(i)}
									className="hover:bg-foreground/10 rounded p-0.5"
								>
									<X className="size-3" />
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
