import { AppError, Errors } from "./errors";
import { log } from "./logger";

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
			log.warn("action_failed", { action: name, code: e.code, message: e.message });
			throw e;
		}
		log.error("action_unexpected", {
			action: name,
			error: e instanceof Error ? e.message : String(e),
		});
		throw Errors.internal();
	}
}
