import { decisionStyle, nodeStatusStyle } from "../graph/statusStyles";
import type { Decision, NodeStatus } from "../types/trace.gen";

type StatusBadgeProps = { status: NodeStatus } | { decision: Decision };

/** Soft pill with icon + text, so state never depends on color alone. */
export function StatusBadge(props: StatusBadgeProps) {
  const style = "status" in props ? nodeStatusStyle(props.status) : decisionStyle(props.decision);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {style.label}
    </span>
  );
}
