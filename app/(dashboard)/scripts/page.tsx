import { AllocationRunner } from "./AllocationRunner";

export default function ScriptsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Project Allocation</h1>
        <p className="text-muted-foreground text-sm">
          Sort project applicants into teams. Everything runs on your computer — nothing is uploaded anywhere.
        </p>
      </div>
      <AllocationRunner />
    </div>
  );
}
