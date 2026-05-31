import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UserMenu } from "@/components/UserMenu";
import { requireUser } from "@/lib/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center justify-between gap-2 border-b border-b-brand-blue/20 shadow-[0_2px_0_0_var(--brand-blue)] px-3">
          <SidebarTrigger />
          <UserMenu
            name={session.user.name}
            email={session.user.email}
            image={session.user.image ?? null}
          />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
