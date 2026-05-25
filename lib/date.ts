export function getTodayIso(): string {
	return new Date().toISOString().split("T")[0];
}
