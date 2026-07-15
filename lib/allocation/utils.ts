import { Allocation } from "./models";

/** Helper method to loop through and sum all the applicants in a set of allocations */
export function countAllApplicants(allocations: Allocation[]): number {
  let count = 0;
  for (const allocation of allocations) {
    count += allocation.applicants.length;
  }
  return count;
}
