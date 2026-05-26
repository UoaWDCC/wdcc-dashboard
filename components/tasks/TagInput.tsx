"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TagInput({
	id,
	tags,
	onChange,
	suggestions,
}: {
	id?: string;
	tags: string[];
	onChange: (tags: string[]) => void;
	suggestions: string[];
}) {
	const [draft, setDraft] = useState("");
	const [highlight, setHighlight] = useState(0);
	const [open, setOpen] = useState(false);

	const matches = useMemo(() => {
		const q = draft.trim().toLowerCase();
		const selected = new Set(tags);
		const pool = suggestions.filter((s) => !selected.has(s));
		if (!q) return pool.slice(0, 8);
		return pool.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
	}, [draft, tags, suggestions]);

	const draftLower = draft.trim().toLowerCase();
	const noMatch =
		draftLower.length > 0 &&
		matches.length === 0 &&
		!suggestions.includes(draftLower);

	useEffect(() => {
		setHighlight(0);
	}, [draft, matches.length]);

	function commit(raw: string) {
		const v = raw.trim().toLowerCase();
		if (!v) return;
		if (!suggestions.includes(v)) {
			setDraft("");
			return;
		}
		if (tags.includes(v)) {
			setDraft("");
			return;
		}
		onChange([...tags, v]);
		setDraft("");
	}

	function removeAt(idx: number) {
		onChange(tags.filter((_, i) => i !== idx));
	}

	return (
		<div className="relative">
			<div className="border-input focus-within:ring-ring/40 flex flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1.5 text-sm focus-within:ring-2">
				{tags.map((t, i) => (
					<Badge key={`${t}-${i}`} variant="secondary" className="gap-1 pr-1">
						{t}
						<button
							type="button"
							aria-label={`Remove ${t}`}
							onClick={() => removeAt(i)}
							className="hover:bg-foreground/15 rounded-sm p-0.5"
						>
							<X className="size-3" />
						</button>
					</Badge>
				))}
				<input
					id={id}
					value={draft}
					onFocus={() => setOpen(true)}
					onBlur={() => {
						setTimeout(() => setOpen(false), 100);
					}}
					onChange={(e) => {
						setDraft(e.target.value);
						setOpen(true);
					}}
					onKeyDown={(e) => {
						if (e.key === "ArrowDown" && matches.length) {
							e.preventDefault();
							setOpen(true);
							setHighlight((h) => (h + 1) % matches.length);
						} else if (e.key === "ArrowUp" && matches.length) {
							e.preventDefault();
							setOpen(true);
							setHighlight((h) => (h - 1 + matches.length) % matches.length);
						} else if (e.key === "Enter") {
							e.preventDefault();
							if (open && matches[highlight]) commit(matches[highlight]);
						} else if (e.key === "Escape") {
							setOpen(false);
						} else if (e.key === "Backspace" && !draft && tags.length) {
							e.preventDefault();
							removeAt(tags.length - 1);
						}
					}}
					placeholder={tags.length ? "" : "Pick a tag"}
					className="placeholder:text-muted-foreground min-w-[8ch] flex-1 bg-transparent outline-none"
				/>
			</div>
			{open && matches.length > 0 && (
				<ul className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border p-1 shadow-md">
					{matches.map((s, i) => (
						<li key={s}>
							<button
								type="button"
								onMouseDown={(e) => {
									e.preventDefault();
									commit(s);
								}}
								onMouseEnter={() => setHighlight(i)}
								className={cn(
									"w-full rounded-sm px-2 py-1 text-left text-sm",
									i === highlight && "bg-accent text-accent-foreground"
								)}
							>
								{s}
							</button>
						</li>
					))}
				</ul>
			)}
			{open && noMatch && (
				<div className="bg-popover text-muted-foreground absolute z-50 mt-1 w-full rounded-md border px-2 py-1 text-xs shadow-md">
					No matching tag — ask an admin to create &ldquo;{draftLower}&rdquo;.
				</div>
			)}
		</div>
	);
}
