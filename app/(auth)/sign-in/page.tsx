import { AuthErrorPanel } from "@/components/auth/AuthErrorPanel";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Card, CardContent } from "@/components/ui/card";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safePath(value: string | undefined) {
  if (!value) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from = safePath(first(params.from));
  const stateError =
    first(params.state) === "state_not_found" ? "state_not_found" : undefined;
  const errorCode = first(params.error) ?? stateError;
  const errorDescription = first(params.error_description);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: `
            radial-gradient(60rem 40rem at 12% -10%, color-mix(in srgb, var(--brand-blue) 26%, transparent), transparent 70%),
            radial-gradient(50rem 36rem at 88% 6%, color-mix(in srgb, var(--brand-purple) 22%, transparent), transparent 70%),
            radial-gradient(46rem 34rem at 50% 108%, color-mix(in srgb, var(--brand-pink) 18%, transparent), transparent 70%)
          `,
        }}
      />

      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-heading text-2xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-[var(--brand-blue)] via-[var(--brand-purple)] to-[var(--brand-pink)] bg-clip-text text-transparent">
              WDCC
            </span>{" "}
            Dashboard
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in with your allowlisted Google account.
          </p>
        </div>

        <Card className="rounded-2xl py-6 shadow-lg shadow-foreground/5 ring-foreground/10 backdrop-blur-sm">
          <CardContent className="space-y-4 px-6">
            {errorCode ? (
              <AuthErrorPanel code={errorCode} description={errorDescription} />
            ) : null}
            <GoogleSignInButton from={from} />
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Access is limited to WDCC execs. If you need access, ask an exec
              to add you.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
