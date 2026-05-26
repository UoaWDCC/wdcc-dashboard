"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
			<div className="max-w-md text-center">
				<h2 className="text-xl font-semibold">Something went wrong</h2>
				<p className="text-muted-foreground mt-2 text-sm">
					{error.message || "Unexpected error."}
				</p>
				{error.digest && (
					<p className="text-muted-foreground mt-1 font-mono text-xs">
						{error.digest}
					</p>
				)}
			</div>
			<Button onClick={unstable_retry}>Try again</Button>
		</div>
	);
}
