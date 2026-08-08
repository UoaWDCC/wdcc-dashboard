// The club runs on NZ time — "today" must mean the same day for the server, the
// database and the browser, regardless of where any of them think they are.
const APP_TIME_ZONE = "Pacific/Auckland";

export function getTodayIso(): string {
	// en-CA formats as YYYY-MM-DD, which compares like a `date` column.
	return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(
		new Date()
	);
}

// Lives here rather than in lib/linktree so client components can import it
// without pulling the database client into the browser bundle.
export function isLinkExpired(
	eventDate: string | null,
	today: string = getTodayIso()
): boolean {
	return eventDate !== null && eventDate < today;
}
