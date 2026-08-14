import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UserMenu } from "@/components/UserMenu";
import { resolveSession } from "@/lib/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reads the session but never redirects on it. Layouts don't re-render on
  // client navigation, so each page under here gates itself; and on a full load
  // the layout renders *in parallel* with the page, so a `requireUser()` here
  // would race the page's and could win with a bare `/sign-in` — dropping the
  // `from` and `error` the page would have carried. `resolveSession` is
  // per-request memoized, so this costs no extra lookup.
  const { session } = await resolveSession();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center justify-between gap-2 border-b border-b-brand-blue/20 shadow-[0_2px_0_0_var(--brand-blue)] px-3">
          <SidebarTrigger />
          {session && (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image ?? null}
            />
          )}
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
