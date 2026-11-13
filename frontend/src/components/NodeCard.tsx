import { Handle, Position, type NodeProps } from "@xyflow/react";
import { nodeStatusStyle } from "../graph/statusStyles";
import type { TraceNode } from "../graph/traceToFlow";
import { toSentence } from "../lib/format";
import { StatusBadge } from "./StatusBadge";

/**
 * Presentational only. Selection (mouse and keyboard) is handled by
 * ReactFlow on the node wrapper and lifted to App via onNodesChange.
 */
export function NodeCard({ data, selected }: NodeProps<TraceNode>) {
  const { label, nodeId, step, status, reason } = data;

  return (
    <div
      className={`w-72 cursor-pointer rounded-lg border px-3 py-2.5 shadow-sm transition-shadow duration-150 hover:shadow-md ${nodeStatusStyle(status).card} ${
        selected ? "ring-2 ring-blue-700 ring-offset-2" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className="!opacity-0" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-600">Step {step}</p>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className={`mt-1.5 text-xs leading-snug ${status === "SKIPPED" ? "text-slate-600" : "text-slate-700"}`}>
        {toSentence(reason)}
      </p>
      <p className="mt-1.5 font-mono text-[11px] text-slate-600">{nodeId}</p>
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!opacity-0" />
    </div>
  );
}
