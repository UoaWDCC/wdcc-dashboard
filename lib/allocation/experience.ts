import { EXPERIENCE_LEVELS } from "./csv-mappings";

export function mapExperience(value: string | undefined): number {
  return EXPERIENCE_LEVELS[value?.trim() ?? ""] ?? 1;
}
