import { requireUser } from "@/lib/access";
import { getHomeSummary } from "@/server/home/actions";
import { BoardPulse } from "@/components/home/BoardPulse";
import { MyDayCard } from "@/components/home/MyDayCard";
import { QuickLinks } from "@/components/home/QuickLinks";

export default async function HomePage() {
  const session = await requireUser("/");
  const { myTasks, pulse, today, team } = await getHomeSummary();
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">
          Kia ora, {firstName}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here is where the board stands today.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <QuickLinks team={team} />
        <MyDayCard tasks={myTasks} today={today} name={firstName} />
      </div>

      <BoardPulse pulse={pulse} />
    </div>
  );
}
