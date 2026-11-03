import { z } from "zod";
import { CHECK_IN_FLAGS } from "@/lib/types";
import {
  CHECK_IN_MONTHS,
  MAX_CHECK_IN_YEAR,
  MIN_CHECK_IN_YEAR,
} from "@/lib/check-ins/types";

const email = z.string().trim().toLowerCase().pipe(z.email());

export const checkInYearSchema = z
  .number()
  .int()
  .min(MIN_CHECK_IN_YEAR)
  .max(MAX_CHECK_IN_YEAR);

export const checkInPatchSchema = z
  .object({
    profileEmail: email,
    year: checkInYearSchema,
    month: z
      .number()
      .int()
      .refine((m) => (CHECK_IN_MONTHS as readonly number[]).includes(m), {
        message: "Month must be between March and October",
      })
      .transform((m) => m as (typeof CHECK_IN_MONTHS)[number]),
    checked: z.boolean().optional(),
    flag: z.enum(CHECK_IN_FLAGS).nullable().optional(),
    note: z
      .string()
      .max(2000, "Note is too long")
      .nullable()
      .optional()
      .transform((n) => (n === undefined ? undefined : n?.trim() || null)),
  })
  .refine(
    (p) =>
      p.checked !== undefined || p.flag !== undefined || p.note !== undefined,
    { message: "Nothing to update" }
  );
