import type { MissionStatus, TaskStatus } from "@hustera/domain";

const MISSION_STYLE: Record<MissionStatus, string> = {
  active: "border-mint/30 bg-mint/10 text-mint",
  paused: "border-warning/30 bg-warning/10 text-warning",
  blocked: "border-danger/30 bg-danger/10 text-danger",
  completed: "border-indigo/40 bg-indigo/10 text-[#b8b0ff]",
  stopped: "border-line bg-slate-2 text-muted",
};

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${MISSION_STYLE[status]}`}>{status}</span>;
}

const TASK_STYLE: Record<TaskStatus, string> = {
  queued: "text-muted",
  awaiting_approval: "text-warning",
  running: "text-mint",
  succeeded: "text-mint",
  failed: "text-danger",
  blocked: "text-danger",
  cancelled: "text-muted line-through",
};

const TASK_LABEL: Record<TaskStatus, string> = {
  queued: "Queued",
  awaiting_approval: "Needs your approval",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

export function TaskStatusText({ status }: { status: TaskStatus }) {
  return <span className={`text-xs font-semibold ${TASK_STYLE[status]}`}>{TASK_LABEL[status]}</span>;
}
