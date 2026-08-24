import { z } from "zod";

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const hexColor = z
  .string()
  .regex(HEX_COLOR_RE, "Tag color must be #RRGGBB hex");

// Tag names are lowercase everywhere; a `check` constraint on tag.name enforces it.
const tagName = z.string().trim().toLowerCase().min(1, "Tag name required");

export const createTagSchema = z.object({
  name: tagName,
  color: hexColor.optional(),
});

export const updateTagSchema = z.object({
  name: tagName.optional(),
  color: hexColor.nullable().optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
