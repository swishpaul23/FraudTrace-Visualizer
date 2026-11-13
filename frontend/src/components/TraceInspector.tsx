import { checkInfo } from "../graph/checkCatalog";
import { formatMetadataValue, humanizeKey, toSentence } from "../lib/format";
import type { NodeResult } from "../types/trace.gen";
import { StatusBadge } from "./StatusBadge";

interface SignalRow {
  key: string;
  value: unknown;
  limit: { kind: "max" | "min"; value: number } | null;
  breached: boolean;
}

/**
 * Pairs each metadata value with the limit the engine applied to it.
 * Checks report limits as `max_<key>` / `min_<key>` alongside `<key>`
 * (see backend/app/engine/checks/*.py); unpaired limits get own rows.
 */
function toSignalRows(metadata: Record<string, unknown>): SignalRow[] {
  const pairedLimitKeys = new Set<string>();
  const rows: SignalRow[] = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (key.startsWith("max_") || key.startsWith("min_")) continue;
    const kind = `max_${key}` in metadata ? "max" : `min_${key}` in metadata ? "min" : null;
    if (kind === null) {
      rows.push({ key, value, limit: null, breached: false });
      continue;
    }
    const limitKey = `${kind}_${key}`;
    pairedLimitKeys.add(limitKey);
    const limit = Number(metadata[limitKey]);
    const numeric = Number(value);
    rows.push({
      key,
      value,
      limit: { kind, value: limit },
      breached: kind === "max" ? numeric > limit : numeric < limit,
    });
  }

  for (const [key, value] of Object.entries(metadata)) {
    if ((key.startsWith("max_") || key.startsWith("min_")) && !pairedLimitKeys.has(key)) {
      rows.push({ key, value, limit: null, breached: false });
    }
  }
  return rows;
}

export interface TraceInspectorProps {
  node: NodeResult | null;
}

/** Read-only detail for the selected check. Renders only what it's given. */
export function TraceInspector({ node }: TraceInspectorProps) {
  if (!node) {
    return (
      <div className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Check details</h2>
        <p className="mt-2 text-sm text-slate-600">
          Select a step in the graph to see the values it evaluated and the limits it applied.
        </p>
      </div>
    );
  }

  const info = checkInfo(node.node_id);
  const rows = toSignalRows(node.metadata);

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{info.label}</h2>
          <p className="font-mono text-xs text-slate-600">{node.node_id}</p>
        </div>
        <StatusBadge status={node.status} />
      </div>

      <p className="mt-4 text-base text-slate-900">{toSentence(node.reason)}</p>
      <p className="mt-2 text-sm text-slate-600">{info.description}</p>

      {node.status === "SKIPPED" ? (
        <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          The engine stops at the first failed check, so this check didn't evaluate any values.
        </p>
      ) : (
        <table className="mt-5 w-full text-sm">
          <caption className="mb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            Evaluated values
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Signal</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-y border-slate-200">
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="py-2 pr-3 text-left align-top font-normal text-slate-600">
                  {humanizeKey(row.key)}
                </th>
                <td className="py-2 text-right align-top">
                  <span className={`font-mono ${row.breached ? "font-semibold text-red-700" : "text-slate-900"}`}>
                    {formatMetadataValue(row.key, row.value)}
                  </span>
                  {row.limit && (
                    <span className="block text-xs text-slate-600">
                      {row.breached ? (row.limit.kind === "max" ? "Over limit of " : "Under minimum of ") : `${row.limit.kind === "max" ? "Limit" : "Minimum"} `}
                      {formatMetadataValue(row.key, row.limit.value)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
