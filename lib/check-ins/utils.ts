import type {
  CheckInCell,
  CheckInMonth,
  CheckInPatch,
  CheckInSheet,
} from "@/lib/check-ins/types";
import { MAX_CHECK_IN_YEAR, MIN_CHECK_IN_YEAR } from "@/lib/check-ins/types";

export function cellKey(email: string, month: number) {
  return `${email}:${month}`;
}

export function emptyCell(
  profileEmail: string,
  month: CheckInMonth
): CheckInCell {
  return { profileEmail, month, checked: false, flag: null, note: null };
}

export function applyPatch(
  cell: CheckInCell,
  patch: CheckInPatch
): CheckInCell {
  return {
    ...cell,
    ...(patch.checked !== undefined && { checked: patch.checked }),
    ...(patch.flag !== undefined && { flag: patch.flag }),
    ...(patch.note !== undefined && { note: patch.note }),
  };
}

export function parseYear(raw: string | undefined, fallback: number) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= MIN_CHECK_IN_YEAR && n <= MAX_CHECK_IN_YEAR
    ? n
    : fallback;
}

export function upsertCell(
  sheet: CheckInSheet,
  patch: CheckInPatch
): CheckInSheet {
  const key = cellKey(patch.profileEmail, patch.month);
  const index = sheet.cells.findIndex(
    (c) => cellKey(c.profileEmail, c.month) === key
  );
  const current =
    index === -1
      ? emptyCell(patch.profileEmail, patch.month)
      : sheet.cells[index];
  const next = applyPatch(current, patch);
  const cells =
    index === -1
      ? [...sheet.cells, next]
      : sheet.cells.map((c, i) => (i === index ? next : c));
  return { ...sheet, cells };
}

export function findCell(
  sheet: CheckInSheet | undefined,
  email: string,
  month: CheckInMonth
): CheckInCell {
  return (
    sheet?.cells.find((c) => c.profileEmail === email && c.month === month) ??
    emptyCell(email, month)
  );
}

export function revertPatch(
  before: CheckInCell,
  patch: CheckInPatch
): CheckInPatch {
  return {
    profileEmail: patch.profileEmail,
    year: patch.year,
    month: patch.month,
    ...(patch.checked !== undefined && { checked: before.checked }),
    ...(patch.flag !== undefined && { flag: before.flag }),
    ...(patch.note !== undefined && { note: before.note }),
  };
}
