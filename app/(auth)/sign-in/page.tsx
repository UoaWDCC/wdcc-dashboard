import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/access";
import { firstParam, safePath } from "@/lib/safe-path";
import { SignInCard } from "./sign-in-card";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const callbackURL = safePath(params.from);

  const { session, error } = await resolveSession();
  if (session) redirect(callbackURL);

  return (
    <SignInCard
      callbackURL={callbackURL}
      // The resolver's reason wins: someone whose access was just revoked lands
      // here with no params at all, and would otherwise see a bare card. Most
      // callback failures arrive as `?error=`, but Better Auth reports a
      // missing OAuth state as `?state=state_not_found`.
      errorCode={error ?? firstParam(params.error) ?? firstParam(params.state)}
    />
  );
}
