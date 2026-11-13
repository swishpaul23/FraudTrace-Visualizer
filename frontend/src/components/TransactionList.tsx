import { useMemo, useState } from "react";
import { checkInfo } from "../graph/checkCatalog";
import { formatAmount } from "../lib/format";
import type { Decision, DecisionTrace, TransactionInput } from "../types/trace.gen";
import { StatusBadge } from "./StatusBadge";

type Filter = "ALL" | Decision;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DECLINE", label: "Declined" },
  { value: "APPROVE", label: "Approved" },
];

export interface TransactionListProps {
  transactions: TransactionInput[];
  results: DecisionTrace[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** Filterable, searchable list of evaluated transactions from one file. */
export function TransactionList({ transactions, results, selectedIndex, onSelect }: TransactionListProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      ALL: results.length,
      DECLINE: results.filter((r) => r.decision === "DECLINE").length,
      APPROVE: results.filter((r) => r.decision === "APPROVE").length,
    }),
    [results],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return results
      .map((result, index) => ({ result, index, tx: transactions[index] }))
      .filter(({ result }) => filter === "ALL" || result.decision === filter)
      .filter(
        ({ tx }) =>
          needle === "" ||
          tx.transaction_id.toLowerCase().includes(needle) ||
          tx.account_id.toLowerCase().includes(needle),
      );
  }, [results, transactions, filter, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b border-slate-200 px-4 pb-3">
        <fieldset>
          <legend className="sr-only">Filter by decision</legend>
          <div className="grid grid-cols-3 rounded-md border border-slate-300 p-0.5 text-sm">
            {FILTERS.map(({ value, label }) => (
              <label
                key={value}
                className={`cursor-pointer rounded px-2 py-1 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-700 ${
                  filter === value ? "bg-slate-900 font-medium text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="decision-filter"
                  value={value}
                  checked={filter === value}
                  onChange={() => setFilter(value)}
                  className="sr-only"
                />
                {label} <span className="tabular-nums">{counts[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="tx-search" className="text-xs font-medium text-slate-700">
            Search transaction or account ID
          </label>
          <input
            id="tx-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length} of {results.length} transactions shown
      </p>

      {visible.length === 0 ? (
        <div className="px-4 py-8 text-sm text-slate-600">
          <p>No transactions match.</p>
          <button
            type="button"
            onClick={() => {
              setFilter("ALL");
              setQuery("");
            }}
            className="mt-2 font-medium text-blue-700 underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y max-lg:max-h-96 divide-slate-200 overflow-y-auto" aria-label="Transactions">
          {visible.map(({ result, index, tx }) => {
            const failed = result.nodes.find((n) => n.status === "FAILED");
            const isSelected = index === selectedIndex;
            return (
              <li key={`${tx.transaction_id}-${index}`}>
                <button
                  type="button"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => onSelect(index)}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left -outline-offset-2 ${
                    isSelected ? "bg-blue-50 shadow-[inset_3px_0_0_#1d4ed8]" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm text-slate-900">{tx.transaction_id}</span>
                    <span className="block truncate text-xs text-slate-600">
                      {formatAmount(tx.amount, tx.currency)}
                      {failed ? ` · ${checkInfo(failed.node_id).label}` : ""}
                    </span>
                  </span>
                  <StatusBadge decision={result.decision} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
