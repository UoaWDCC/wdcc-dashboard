const EXPERIENCE_LEVELS: Record<string, number> = {
  "No experience": 1,
  "Low experience (some tutorial videos / playing around)": 2,
  "Moderate experience (course/personal project)": 3,
  "High experience (intern/work project)": 4,
  "Pro (many internships and professional work)": 5,
};

export function mapExperience(value: string | undefined): number {
  return EXPERIENCE_LEVELS[value?.trim() ?? ""] ?? 1;
}
