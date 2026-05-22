import { AppError, Errors } from "./errors";

function isNextControlFlow(e: unknown): boolean {
	if (!e || typeof e !== "object" || !("digest" in e)) return false;
	const digest = (e as { digest: unknown }).digest;
	if (typeof digest !== "string") return false;
	return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

export async function withAction<T>(
	name: string,
	fn: () => Promise<T>,
): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		if (isNextControlFlow(e)) throw e;
		if (e instanceof AppError) {
			console.error(`[action:${name}] ${e.code}: ${e.message}`);
			throw e;
		}
		console.error(`[action:${name}] unexpected`, e);
		throw Errors.internal();
	}
}
