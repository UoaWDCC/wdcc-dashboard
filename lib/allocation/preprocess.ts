import { Applicant } from "./models";

export type PreprocessResult = {
  processed: Applicant[];
  designers: Applicant[];
  flagged: Applicant[];
};

const MIN_BLURB_LENGTH = 50;

// TODO this filtering doesn't take into account rizzLevel properly
function needsReview(applicant: Applicant): boolean {
  return (
    applicant.passionBlurb.length < MIN_BLURB_LENGTH ||
    applicant.rizzLevel === 1 ||
    applicant.projectChoices.length === 0
  );
}

/**
 * Splits raw applicants into: designers (separate pathway), flagged (weak passion
 * blurb or low exec rating), and the remaining processed applicants for allocation.
 */
export function preprocessApplicants(applicants: Applicant[]): PreprocessResult {
  const designers = applicants.filter(
    (applicant) =>
      applicant.creativityHire?.toLowerCase() === "creative maybe" ||
      applicant.creativityHire?.toLowerCase() === "creative guarantee"
  );

  const flagged = applicants.filter(needsReview);
  const processed = applicants.filter(
    (applicant) => !needsReview(applicant) && !designers.includes(applicant)
  );

  return { processed, designers, flagged };
}
