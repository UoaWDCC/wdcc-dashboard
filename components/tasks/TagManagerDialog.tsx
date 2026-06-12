"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteTag, updateTag } from "@/server/tasks/actions";
import { toast } from "sonner";
import type { TagOption } from "@/lib/tasks/types";

export function TagManagerDialog({
	open,
	onOpenChange,
	tags,
	onChanged,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	tags: TagOption[];
	onChanged: () => void;
}) {
	const [pending, startTransition] = useTransition();
	const [drafts, setDrafts] = useState<Record<string, { name: string; color: string }>>({});

	useEffect(() => {
		if (!open) return;
		const next: Record<string, { name: string; color: string }> = {};
		for (const t of tags) next[t.id] = { name: t.name, color: t.color ?? "" };
		// Seed drafts from server tags when dialog opens.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setDrafts(next);
	}, [open, tags]);

	function setField(id: string, key: "name" | "color", value: string) {
		setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));
	}

	function save(t: TagOption) {
		const d = drafts[t.id];
		if (!d) return;
		const name = d.name.trim().toLowerCase();
		const color = d.color.trim();
		const patch: { name?: string; color?: string | null } = {};
		if (name && name !== t.name) patch.name = name;
		const normalizedColor = color || null;
		if (normalizedColor !== (t.color ?? null)) patch.color = normalizedColor;
		if (!Object.keys(patch).length) return;
		startTransition(async () => {
			try {
				await updateTag(t.id, patch);
				onChanged();
				toast.success("Tag updated");
			} catch (e) {
				console.error("updateTag failed", e);
				toast.error("Failed to update tag");
			}
		});
	}

	function remove(t: TagOption) {
		if (!confirm(`Delete tag "${t.name}"? It will be removed from all tasks.`)) return;
		startTransition(async () => {
			try {
				await deleteTag(t.id);
				onChanged();
				toast.success("Tag deleted");
			} catch (e) {
				console.error("deleteTag failed", e);
				toast.error("Failed to delete tag");
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Manage tags</DialogTitle>
				</DialogHeader>
				<div className="max-h-[60vh] space-y-2 overflow-y-auto">
					{tags.length === 0 && (
						<p className="text-muted-foreground text-sm">No tags yet.</p>
					)}
					{tags.map((t) => {
						const d = drafts[t.id] ?? { name: t.name, color: t.color ?? "" };
						const dirty =
							d.name.trim().toLowerCase() !== t.name ||
							(d.color.trim() || null) !== (t.color ?? null);
						return (
							<div key={t.id} className="flex items-center gap-2">
								<Input
									value={d.name}
									onChange={(e) => setField(t.id, "name", e.target.value)}
									className="flex-1"
								/>
								<input
									type="color"
									value={d.color || "#888888"}
									onChange={(e) => setField(t.id, "color", e.target.value)}
									className="h-9 w-10 rounded border bg-transparent"
									aria-label={`Color for ${t.name}`}
								/>
								<Button
									size="sm"
									variant="outline"
									disabled={!dirty || pending}
									onClick={() => save(t)}
								>
									Save
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={pending}
									onClick={() => remove(t)}
									aria-label={`Delete ${t.name}`}
								>
									<X className="size-4" />
								</Button>
							</div>
						);
					})}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
