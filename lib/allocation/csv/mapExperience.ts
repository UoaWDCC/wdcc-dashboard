const experienceMapping: Record<string, number> = {
  "No experience": 1,
  "Low experience (some tutorial videos / playing around)": 2,
  "Moderate experience (course/personal project)": 3,
  "High experience (intern/work project)": 4,
  "Pro (many internships and professional work)": 5,
};

export const mapExperience = (value: string): number => experienceMapping[value] || 1;
