import type { Decision, NodeStatus } from "../types/trace.gen";

/**
 * Single source of truth for how a node status or overall decision
 * maps to visual styling and wording. Every status is shown as text
 * plus an icon, never color alone.
 */

interface StatusStyle {
  label: string;
  icon: string;
  badge: string;
  card: string;
  edge: string;
}

const NODE_STATUS: Record<NodeStatus, StatusStyle> = {
  PASSED: {
    label: "Passed",
    icon: "✓",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/25",
    card: "border-slate-300 bg-white",
    edge: "#059669",
  },
  FAILED: {
    label: "Failed",
    icon: "✕",
    badge: "bg-red-50 text-red-800 ring-red-600/25",
    card: "border-red-400 bg-white",
    edge: "#dc2626",
  },
  SKIPPED: {
    label: "Not run",
    icon: "–",
    badge: "bg-slate-100 text-slate-700 ring-slate-500/25",
    card: "border-dashed border-slate-300 bg-slate-50",
    edge: "#94a3b8",
  },
};

const DECISION: Record<Decision, Pick<StatusStyle, "label" | "icon" | "badge">> = {
  APPROVE: { label: "Approved", icon: "✓", badge: NODE_STATUS.PASSED.badge },
  DECLINE: { label: "Declined", icon: "✕", badge: NODE_STATUS.FAILED.badge },
};

export function nodeStatusStyle(status: NodeStatus): StatusStyle {
  return NODE_STATUS[status];
}

export function decisionStyle(decision: Decision) {
  return DECISION[decision];
}
