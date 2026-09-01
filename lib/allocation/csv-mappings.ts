// Column headers as they appear in the Google Forms CSV exports. The forms are
// re-edited every recruitment cycle, so expect to update these each year.

export const APPLICANT_HEADERS = {
  timestamp: "Column 1",
  isMember: "Are you a WDCC member?",
  name: "What is your full name?",
  email: "Email address?",
  major: "What do you study? (Degree: major)",
  rolePreference: "Role preference",
  github: "What is your GitHub username?",
  skills: "Previous technical experience",
  backendPreference:
    "What kind of work do you have a higher preference towards learning/doing within projects?",
  portfolioLink: "Do you have a portfolio? If so, please provide a link below:",
  frontendTools:
    "Do you have any experience with HTML, CSS, JavaScript, or other web/frontend development tools?",
  designStyle:
    "Briefly describe your design style, approach, and/or interests.",
  figmaExperience:
    "Please indicate your experience with Figma or other interface prototyping tools.",
  frontendExperience:
    "How would you rate your experience level in the following areas? [Front-end dev]",
  backendExperience:
    "How would you rate your experience level in the following areas? [Back-end dev]",
  designExperience:
    "How would you rate your experience level in the following areas? [Design]",
  testingExperience:
    "How would you rate your experience level in the following areas? [Testing]",
  choice1: "Your first choice:",
  choice2: "Your second choice:",
  choice3: "Your third choice:",
  choice4: "Your fourth choice:",
  choice5: "Your fifth choice:",
  passionBlurb:
    "What do you wish to gain from being on a project? (aim for ~100 words)",
  cvLink: "Please upload your CV here (insert a link below)",
  jobInterest:
    "Would you be interested in being contacted about support with job applications and/or potential job opportunities?",
  additionalInfo: "Anything else you would like us to know?",
  execNotes: "EXEC NOTES",
} as const;

export const PROJECT_HEADERS = {
  timestamp: "Timestamp",
  name: "What is the name of your project?",
  backendWeighting: "What's the backend-frontend weighting of your project?",
  priority: "What's your preference for beginners vs experienced members?",
  frontendDifficulty:
    "How difficult do you expect your frontend development to be?",
  backendDifficulty:
    "How difficult do you expect your backend development to be?",
  designersNeeded: "How many designers do you need?",
  notes:
    "Extra note section (special requirements or anything else you want to say about people you want to hire).",
} as const;

// Answer options for the "rate your experience level" grid, mapped to 1-5.
export const EXPERIENCE_LEVELS: Record<string, number> = {
  "No experience": 1,
  "Low experience (some tutorial videos / playing around)": 2,
  "Moderate experience (course/personal project)": 3,
  "High experience (intern/work project)": 4,
  "Pro (many internships and professional work)": 5,
};
