"use client";

import { useEffect, useState } from "react";
import type { TaskPriority, Team } from "@/lib/types";

export type TaskLink = {
	id?: string;
	url: string;
	title: string | null;
};

export type TaskFormValues = {
	title: string;
	description: string;
	tags: string[];
	links: TaskLink[];
	linkDraft: string;
	priority: TaskPriority | "";
	team: Team | "";
	assigneeEmails: string[];
};

const EMPTY: TaskFormValues = {
	title: "",
	description: "",
	tags: [],
	links: [],
	linkDraft: "",
	priority: "",
	team: "",
	assigneeEmails: [],
};

export function useTaskForm(
	initial: TaskFormValues | null,
	resetKey: unknown,
) {
	const [values, setValues] = useState<TaskFormValues>(initial ?? EMPTY);

	useEffect(() => {
		setValues(initial ?? EMPTY);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resetKey]);

	function setField<K extends keyof TaskFormValues>(
		key: K,
		value: TaskFormValues[K],
	) {
		setValues((s) => ({ ...s, [key]: value }));
	}

	function addLink() {
		const v = values.linkDraft.trim();
		if (!v) return;
		setValues((s) =>
			s.links.some((l) => l.url === v)
				? { ...s, linkDraft: "" }
				: {
						...s,
						links: [...s.links, { url: v, title: null }],
						linkDraft: "",
					},
		);
	}

	function removeLinkAt(idx: number) {
		setValues((s) => ({
			...s,
			links: s.links.filter((_, i) => i !== idx),
		}));
	}

	function toggleAssignee(email: string) {
		setValues((s) => ({
			...s,
			assigneeEmails: s.assigneeEmails.includes(email)
				? s.assigneeEmails.filter((e) => e !== email)
				: [...s.assigneeEmails, email],
		}));
	}

	function finalLinks(): TaskLink[] {
		const v = values.linkDraft.trim();
		if (!v || values.links.some((l) => l.url === v)) return values.links;
		return [...values.links, { url: v, title: null }];
	}

	return {
		values,
		setField,
		addLink,
		removeLinkAt,
		toggleAssignee,
		finalLinks,
	};
}

export type TaskFormApi = ReturnType<typeof useTaskForm>;
