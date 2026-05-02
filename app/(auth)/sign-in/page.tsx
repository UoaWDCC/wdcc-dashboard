import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled>
            Continue with Google
          </Button>
          <p className="text-muted-foreground mt-3 text-xs">
            Auth wiring pending.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
