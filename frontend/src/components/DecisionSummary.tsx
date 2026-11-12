import { checkInfo } from "../graph/checkCatalog";
import { formatAmount, toSentence } from "../lib/format";
import type { DecisionTrace, TransactionInput } from "../types/trace.gen";
import { StatusBadge } from "./StatusBadge";

export interface DecisionSummaryProps {
  trace: DecisionTrace;
  transaction: TransactionInput;
}

/** One-line answer to "why did this fail?" above the graph. */
export function DecisionSummary({ trace, transaction }: DecisionSummaryProps) {
  const failed = trace.nodes.find((node) => node.status === "FAILED");

  return (
    <div className="border-b border-slate-200 bg-white px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-mono text-sm font-semibold text-slate-900">{trace.transaction_id}</h2>
        <StatusBadge decision={trace.decision} />
        <span className="text-sm text-slate-600">
          {formatAmount(transaction.amount, transaction.currency)} · {transaction.account_id}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-700">
        {failed
          ? `Declined at step ${trace.nodes.indexOf(failed) + 1}, ${checkInfo(failed.node_id).label}: ${toSentence(failed.reason)}`
          : `Passed all ${trace.nodes.length} checks.`}
      </p>
    </div>
  );
}
