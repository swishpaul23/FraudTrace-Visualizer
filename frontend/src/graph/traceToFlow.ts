import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { DecisionTrace, NodeStatus } from "../types/trace.gen";
import { toSentence } from "../lib/format";
import { checkInfo } from "./checkCatalog";
import { nodeStatusStyle } from "./statusStyles";

/**
 * Fixed top-to-bottom lane for a linear check pipeline. No
 * force-directed layout — the trace is always a straight sequence, and
 * a vertical lane stays legible in the narrow centre column where a
 * horizontal one had to zoom out until text was unreadable.
 */
const LANE_X = 0;
const LANE_Y_STEP = 150;

export interface TraceNodeData extends Record<string, unknown> {
  nodeId: string;
  label: string;
  step: number;
  status: NodeStatus;
  reason: string;
}

export type TraceNode = Node<TraceNodeData, "traceNode">;

/**
 * Pure transform: DecisionTrace + selected node in, ReactFlow nodes and
 * edges out. No side effects — callers own state and fetching.
 */
export function traceToFlow(
  trace: DecisionTrace,
  selectedNodeId: string | null,
): { nodes: TraceNode[]; edges: Edge[] } {
  const nodes: TraceNode[] = trace.nodes.map((result, index) => {
    const label = checkInfo(result.node_id).label;
    const statusLabel = nodeStatusStyle(result.status).label;
    return {
      id: result.node_id,
      type: "traceNode",
      position: { x: LANE_X, y: index * LANE_Y_STEP },
      selected: result.node_id === selectedNodeId,
      ariaLabel: `Step ${index + 1} of ${trace.nodes.length}, ${label}: ${statusLabel}. ${toSentence(result.reason)} Press Enter for details.`,
      data: {
        nodeId: result.node_id,
        label,
        step: index + 1,
        status: result.status,
        reason: result.reason,
      },
    };
  });

  const edges: Edge[] = trace.nodes.slice(0, -1).map((result, index) => {
    const next = trace.nodes[index + 1];
    const color = nodeStatusStyle(next.status === "SKIPPED" ? "SKIPPED" : result.status).edge;
    return {
      id: `${result.node_id}->${next.node_id}`,
      source: result.node_id,
      target: next.node_id,
      focusable: false,
      style: { stroke: color, strokeWidth: 2, strokeDasharray: next.status === "SKIPPED" ? "6 4" : undefined },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    };
  });

  return { nodes, edges };
}
