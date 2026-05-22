export class AppError extends Error {
	constructor(
		public code: string,
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "AppError";
	}
}

export const Errors = {
	unauthorized: (m = "Unauthorized") => new AppError("unauthorized", 401, m),
	validation: (m: string) => new AppError("validation", 400, m),
	notFound: (m = "Not found") => new AppError("not_found", 404, m),
	conflict: (m: string) => new AppError("conflict", 409, m),
	internal: (m = "Internal error") => new AppError("internal", 500, m),
};
