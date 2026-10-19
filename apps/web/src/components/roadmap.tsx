import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import { StatusBadge } from "./ui";

/** Honest placeholder for product areas that are designed but not built yet. */
export function RoadmapNotice({ milestone, children }: { milestone: string; children: ReactNode }) {
  return (
    <div className="card mb-6 flex items-start gap-4 border-warning/25 p-5">
      <Construction className="mt-0.5 shrink-0 text-warning" size={22} aria-hidden="true" />
      <div className="text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">Coming in Milestone {milestone}</p>
          <StatusBadge status="NOT_BUILT" />
        </div>
        <div className="mt-1 text-muted">{children}</div>
      </div>
    </div>
  );
}
