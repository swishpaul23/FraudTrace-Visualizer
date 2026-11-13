import {
  Background,
  Controls,
  ReactFlow,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { NodeCard } from "../components/NodeCard";
import type { DecisionTrace } from "../types/trace.gen";
import { traceToFlow, type TraceNode } from "./traceToFlow";

const NODE_TYPES: NodeTypes = { traceNode: NodeCard };

export interface GraphCanvasProps {
  trace: DecisionTrace;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

/**
 * Thin ReactFlow wrapper. Selection is controlled: `selectedNodeId`
 * comes from the parent, and both clicks and keyboard selection (Tab to
 * a node, Enter/Space) arrive as "select" node changes that are lifted
 * via onSelect. Layout is fixed, so dragging and connecting are off.
 */
export function GraphCanvas({ trace, selectedNodeId, onSelect }: GraphCanvasProps) {
  const { nodes, edges } = useMemo(
    () => traceToFlow(trace, selectedNodeId),
    [trace, selectedNodeId],
  );

  function handleNodesChange(changes: NodeChange<TraceNode>[]) {
    for (const change of changes) {
      if (change.type === "select" && change.selected) onSelect(change.id);
    }
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={handleNodesChange}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      fitView
      fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
      minZoom={0.4}
      maxZoom={1.5}
      aria-label="Decision path graph"
    >
      <Background gap={20} size={1} color="#cbd5e1" />
      <Controls showInteractive={false} position="bottom-right" />
    </ReactFlow>
  );
}
