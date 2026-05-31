"use client";

import { Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT, PRIORITY_LABEL } from "@/lib/types";
import type { BoardUser, ClientTask } from "@/lib/tasks/types";
import { userFromCol } from "@/lib/tasks/utils";

export function TaskCard({
	task,
	columnId,
	dragging = false,
	userById,
}: {
	task: ClientTask;
	columnId?: string;
	dragging?: boolean;
	userById: Map<string, BoardUser>;
}) {
	const colEmail = columnId ? userFromCol(columnId) : null;
	const shownAssignees = colEmail
		? task.assignees.filter((a) => a.profileEmail !== colEmail)
		: task.assignees;

	return (
		<Card
			size="sm"
			className={cn(
				"group relative cursor-grab select-none shadow-sm ring-foreground/15 active:cursor-grabbing",
				dragging && "opacity-50"
			)}
		>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 pr-6">
					{task.priority && (
						<span
							aria-label={PRIORITY_LABEL[task.priority]}
							title={PRIORITY_LABEL[task.priority]}
							className={cn(
								"inline-block size-2 shrink-0 rounded-full",
								PRIORITY_DOT[task.priority]
							)}
						/>
					)}
					<span className="min-w-0 truncate">{task.title}</span>
				</CardTitle>
			</CardHeader>
			{(task.description ||
				task.tags.length ||
				task.team ||
				task.links.length ||
				shownAssignees.length > 0) && (
				<CardContent className="flex flex-col gap-2">
					{task.description && (
						<p className="text-muted-foreground text-xs">{task.description}</p>
					)}
					{(task.tags.length ||
						task.team ||
						task.links.length ||
						shownAssignees.length > 0) && (
						<div className="flex flex-wrap items-center gap-1">
							{task.team && (
								<Badge variant="outline" className="text-[10px]">
									{task.team}
								</Badge>
							)}
							{task.tags.map((t) => (
								<Badge key={t} variant="secondary" className="text-[10px]">
									{t}
								</Badge>
							))}
							{shownAssignees.map((a) => (
								<Badge
									key={`assignee-${a.profileEmail}`}
									className="bg-brand-blue/15 text-brand-blue text-[10px]"
								>
									+{userById.get(a.profileEmail)?.name ?? a.profileEmail}
								</Badge>
							))}
							{task.links.length ? (
								<span
									title={`${task.links.length} link${task.links.length === 1 ? "" : "s"}`}
									className="text-muted-foreground inline-flex items-center gap-0.5 text-[10px]"
								>
									<Link2 className="size-3" />
									{task.links.length}
								</span>
							) : null}
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
}
