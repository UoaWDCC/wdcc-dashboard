type Meta = Record<string, unknown>;

function format(msg: string, meta?: Meta): string {
	if (!meta || Object.keys(meta).length === 0) return msg;
	return `${msg} ${JSON.stringify(meta)}`;
}

export const log = {
	info: (msg: string, meta?: Meta) => console.log(format(msg, meta)),
	warn: (msg: string, meta?: Meta) => console.warn(format(msg, meta)),
	error: (msg: string, meta?: Meta) => console.error(format(msg, meta)),
};
