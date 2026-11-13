import { useId, useRef, useState, type DragEvent } from "react";
import { ApiError, MAX_BATCH_SIZE } from "../api/decisionClient";
import { checkInfo } from "../graph/checkCatalog";
import { downloadCsv } from "../lib/download";
import { FileParseError, parseTransactionFile } from "../upload/parseTransactionFile";
import { buildSampleTransactions } from "../upload/sampleTransactions";
import type { DecisionTrace, RuleConfig, TransactionInput } from "../types/trace.gen";
import { TransactionList } from "./TransactionList";

export interface LoadedFile {
  id: number;
  name: string;
  transactions: TransactionInput[];
}

export interface UploadPanelProps {
  file: LoadedFile | null;
  results: DecisionTrace[] | undefined;
  isEvaluating: boolean;
  evaluationError: Error | null;
  rules: RuleConfig | undefined;
  selectedIndex: number;
  onLoad: (name: string, transactions: TransactionInput[]) => void;
  onSelect: (index: number) => void;
  onRetry: () => void;
  onOpenRules: () => void;
}

const MAX_PROBLEMS_SHOWN = 8;

/** Turns a backend 422 on a batch into row/field messages. */
function describeEvaluationError(error: Error): string[] {
  if (error instanceof ApiError && error.issues.length > 0) {
    return error.issues.map(({ loc, msg }) => {
      const [, , row, field] = loc;
      return typeof row === "number" ? `Row ${row + 1}, ${String(field)}: ${msg}` : msg;
    });
  }
  return ["The decision engine couldn't be reached. Check your connection, then try again."];
}

function exportResults(file: LoadedFile, results: DecisionTrace[]) {
  downloadCsv(
    `${file.name.replace(/\.[^.]+$/, "")}-decisions.csv`,
    results.map((trace, index) => {
      const failed = trace.nodes.find((node) => node.status === "FAILED");
      return {
        transaction_id: trace.transaction_id,
        account_id: file.transactions[index].account_id,
        decision: trace.decision,
        failed_check: failed ? failed.node_id : "",
        reason: failed ? failed.reason : "",
      };
    }),
  );
}

/**
 * Left-rail content for file mode: upload (picker, drag and drop, or
 * sample data), parse errors, and the evaluated transaction list.
 */
export function UploadPanel(props: UploadPanelProps) {
  const { file, results, isEvaluating, evaluationError, rules, selectedIndex, onLoad, onSelect, onRetry, onOpenRules } =
    props;
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [problems, setProblems] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  async function readFile(picked: File) {
    try {
      onLoad(picked.name, parseTransactionFile(picked.name, await picked.text()));
      setProblems([]);
    } catch (error) {
      setProblems(
        error instanceof FileParseError
          ? error.problems
          : [`"${picked.name}" isn't valid CSV or JSON: ${(error as Error).message}`],
      );
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) void readFile(dropped);
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".csv,.json,text/csv,application/json"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        const picked = e.target.files?.[0];
        if (picked) void readFile(picked);
        e.target.value = "";
      }}
    />
  );

  const problemList = problems.length > 0 && (
    <div role="alert" className="mx-4 mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
      <p className="font-semibold">The file wasn't loaded. Fix the following and upload it again:</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
        {problems.slice(0, MAX_PROBLEMS_SHOWN).map((problem, index) => (
          <li key={index}>{problem}</li>
        ))}
      </ul>
      {problems.length > MAX_PROBLEMS_SHOWN && (
        <p className="mt-1">…and {problems.length - MAX_PROBLEMS_SHOWN} more.</p>
      )}
    </div>
  );

  if (!file) {
    return (
      <div className="flex flex-col py-4">
        {fileInput}
        {problemList}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mx-4 rounded-lg border border-dashed p-5 ${
            isDragging ? "border-blue-700 bg-blue-50" : "border-slate-300 bg-white"
          }`}
        >
          <h2 className="text-base font-semibold text-slate-900">Upload transactions</h2>
          <p id={hintId} className="mt-1 text-sm text-slate-600">
            Drop a CSV or JSON file here. Up to {MAX_BATCH_SIZE.toLocaleString()} rows, one transaction per row,
            with the 19 columns in the template.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              aria-describedby={hintId}
              onClick={() => inputRef.current?.click()}
              className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              Choose file
            </button>
            <button
              type="button"
              onClick={() => onLoad("sample-transactions.csv", buildSampleTransactions(new Date()))}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Use sample data
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv("transactions-template.csv", buildSampleTransactions(new Date()))}
          className="mx-4 mt-3 self-start text-sm font-medium text-blue-700 underline-offset-2 hover:underline"
        >
          Download CSV template
        </button>
      </div>
    );
  }

  const staleCount =
    results?.filter((trace) =>
      trace.nodes.some((node) => node.node_id === "ingress" && node.status === "FAILED"),
    ).length ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {fileInput}
      <div className="px-4 pb-3 pt-4">
        <h2 className="truncate text-sm font-semibold text-slate-900" title={file.name}>
          {file.name}
        </h2>
        <p className="text-xs text-slate-600">{file.transactions.length.toLocaleString()} transactions</p>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            Replace file
          </button>
          <button
            type="button"
            disabled={!results}
            onClick={() => results && exportResults(file, results)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export results
          </button>
        </div>
      </div>

      {problemList}

      {evaluationError && (
        <div role="alert" className="mx-4 mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">These transactions couldn't be evaluated.</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {describeEvaluationError(evaluationError)
              .slice(0, MAX_PROBLEMS_SHOWN)
              .map((line, index) => (
                <li key={index}>{line}</li>
              ))}
          </ul>
          <button type="button" onClick={onRetry} className="mt-2 font-medium underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {staleCount > 0 && rules && (
        <div className="mx-4 mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {staleCount} of {file.transactions.length} failed {checkInfo("ingress").label.toLowerCase()} because they're
          older than {rules.max_staleness_minutes} minutes. Reviewing past transactions?{" "}
          <button type="button" onClick={onOpenRules} className="font-medium underline underline-offset-2">
            Raise the max transaction age
          </button>
          .
        </div>
      )}

      {isEvaluating && !results && (
        <p className="px-4 py-3 text-sm text-slate-600" role="status">
          Evaluating {file.transactions.length.toLocaleString()} transactions…
        </p>
      )}

      {results && (
        <TransactionList
          transactions={file.transactions}
          results={results}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
