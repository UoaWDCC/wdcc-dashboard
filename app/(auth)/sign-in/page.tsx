import { redirect } from "next/navigation";
import { getSession } from "@/lib/access";
import { safePath } from "@/lib/safe-path";
import { SignInCard } from "./sign-in-card";

function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const callbackURL = safePath(params.from);

  const session = await getSession();
  if (session) redirect(callbackURL);

  return (
    <SignInCard
      callbackURL={callbackURL}
      // Most callback failures arrive as `?error=`, but Better Auth reports a
      // missing OAuth state as `?state=state_not_found`.
      errorCode={firstParam(params.error) ?? firstParam(params.state)}
    />
  );
}
