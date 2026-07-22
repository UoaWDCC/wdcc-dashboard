import { Allocation, Applicant, Project } from "./models";
import { heuristicAscent } from "./heuristicAscent";
import { stableMatching } from "./stableMatching";

/** 🤝 */
export function powerOfFriendship(applicants: Applicant[], projects: Project[]): Allocation[] {
  return heuristicAscent(() => stableMatching(applicants, projects));
}
