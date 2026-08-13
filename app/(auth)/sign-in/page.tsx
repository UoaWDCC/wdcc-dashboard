import { redirect } from "next/navigation";
import { getSession } from "@/lib/access";
import { SignInCard } from "./sign-in-card";

/** Only allow same-origin, non-protocol-relative paths as a post-login target. */
function safePath(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

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
      errorCode={firstParam(params.error)}
    />
  );
}
