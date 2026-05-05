"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>WDCC Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const from = params.get("from");
              const callbackURL =
                from && from.startsWith("/") ? from : "/";
              signIn.social({ provider: "google", callbackURL });
            }}
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
