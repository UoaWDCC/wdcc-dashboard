// frontendExperience, backendExperience, designExperience, testingExperience,
// backendPreference, and the Project difficulty/priority fields below are all 1-5.

export type Applicant = {
  id: number;
  timestamp: Date | null;
  isMember: boolean;
  name: string;
  email: string;
  major: string;
  rolePreference: string; // "Developer" or "Designer"
  github: string;
  skills: string[];
  backendPreference: number;
  portfolioLink: string;
  frontendTools: string; // designer-pathway HTML/CSS/JS experience
  designStyle: string;
  figmaExperience: string;
  frontendExperience: number;
  backendExperience: number;
  designExperience: number;
  testingExperience: number;
  projectChoices: string[]; // index 0 is highest preference
  passionBlurb: string;
  cvLink: string;
  jobInterest: string;
  additionalInfo: string;
  execNotes: string;
};

export type Project = {
  id: number;
  timestamp: Date | null;
  name: string;
  backendWeighting: number; // matches Applicant.backendPreference scale
  priority: number; // below favours beginners, above favours experience
  frontendDifficulty: number;
  backendDifficulty: number;
  designersNeeded: string; // free text, e.g. "1 dedicated designer."
  notes: string;
};

export type TeamAllocation = {
  project: Project;
  applicants: Applicant[];
  teamSize: number;
};

export type TeamScore = {
  objectiveScore: number;
  projectPrefScore: number;
  rolePrefScore: number;
  beExpScore: number;
  feExpScore: number;
  bePrefSum: number;
  targetBePrefSum: number;
  designers: number;
  backenders: number;
  frontenders: number;
};

export type AllocationRun = {
  teams: TeamAllocation[];
  unmatched: Applicant[];
  teamSize: number;
  targetSize: number;
  totalUtility: number;
  baselineUtility: number;
  redistributionLog: string[];
  warnings: string[];
};
