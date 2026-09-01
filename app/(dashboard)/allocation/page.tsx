import { AllocationClient } from "@/components/allocation/AllocationClient";

export default function AllocationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Project Allocation</h1>
        <p className="text-muted-foreground text-sm">
          Upload applicant and project CSV exports to review them ahead of
          sorting into teams. Everything runs in your browser — nothing is
          uploaded anywhere.
        </p>
      </div>
      <AllocationClient />
    </div>
  );
}
