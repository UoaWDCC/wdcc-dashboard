import { Applicant } from "./models";

export type PreprocessResult = {
  processed: Applicant[];
  designers: Applicant[];
  flagged: Applicant[];
};

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

  // TODO this filtering doesn't take into account rizzLevel properly
  const flagged = applicants.filter(
    (applicant) => (applicant.passionBlurb && applicant.passionBlurb.length < 100) || applicant.rizzLevel === 1
  );

  let processed = applicants.filter(
    (applicant) => !((applicant.passionBlurb && applicant.passionBlurb.length < 100) || applicant.rizzLevel === 1)
  );
  processed = processed.filter((applicant) => !designers.includes(applicant));

  return { processed, designers, flagged };
}
