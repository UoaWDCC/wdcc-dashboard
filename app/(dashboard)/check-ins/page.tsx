import { requireAdmin } from "@/server/auth/access";
import { getCheckInSheet, listCheckInYears } from "@/server/check-ins/queries";
import { CheckInsView } from "@/components/check-ins/CheckInsView";
import { parseYear } from "@/lib/check-ins/utils";
import { getTodayIso } from "@/lib/date";
import { getFirstElement } from "@/lib/utils";

export default async function CheckInsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/check-ins");
  const params = await searchParams;
  const currentYear = Number(getTodayIso().slice(0, 4));
  const year = parseYear(getFirstElement(params.year), currentYear);
  const [sheet, years] = await Promise.all([
    getCheckInSheet(year),
    listCheckInYears(),
  ]);
  const yearOptions = [...new Set([currentYear, year, ...years])].sort(
    (a, b) => b - a
  );

  return <CheckInsView key={year} initialSheet={sheet} years={yearOptions} />;
}
