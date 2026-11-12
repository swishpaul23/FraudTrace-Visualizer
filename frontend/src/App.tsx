import { useState, type KeyboardEvent } from "react";
import { ControlPanel, DEFAULT_CONTROL_STATE, buildTransactionInput } from "./components/ControlPanel";
import { DecisionSummary } from "./components/DecisionSummary";
import { RulesDialog } from "./components/RulesDialog";
import { TraceInspector } from "./components/TraceInspector";
import { UploadPanel, type LoadedFile } from "./components/UploadPanel";
import { GraphCanvas } from "./graph/GraphCanvas";
import { useBatchDecisions, useDecision, useDefaultRules } from "./hooks/useDecision";
import type { DecisionTrace, RuleConfig, TransactionInput } from "./types/trace.gen";

type Mode = "file" | "scenario";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "file", label: "Upload file" },
  { mode: "scenario", label: "Test a scenario" },
];

function firstFailedNodeId(trace: DecisionTrace): string | null {
  return trace.nodes.find((node) => node.status === "FAILED")?.node_id ?? null;
}

function App() {
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scenarioInput, setScenarioInput] = useState<TransactionInput>(() =>
    buildTransactionInput(DEFAULT_CONTROL_STATE),
  );
  // null = "follow the default": the first failed check, if any.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [customRules, setCustomRules] = useState<RuleConfig | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const defaults = useDefaultRules();
  const rules = customRules ?? defaults.data;
  const batch = useBatchDecisions(file?.id ?? 0, file?.transactions ?? null, rules);
  const scenario = useDecision(scenarioInput, rules);

  const activeTrace = mode === "file" ? batch.data?.results[selectedIndex] : scenario.data;
  const activeTransaction = mode === "file" ? file?.transactions[selectedIndex] : scenarioInput;
  const activeNodeId = selectedNodeId ?? (activeTrace ? firstFailedNodeId(activeTrace) : null);
  const activeNode = activeTrace?.nodes.find((node) => node.node_id === activeNodeId) ?? null;
  const declinedCount = batch.data?.results.filter((r) => r.decision === "DECLINE").length ?? 0;

  function switchMode(next: Mode) {
    setMode(next);
    setSelectedNodeId(null);
  }

  function handleTabKey(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = mode === "file" ? "scenario" : "file";
    switchMode(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  if (defaults.isError) {
    return (
      <div role="alert" className="mx-auto mt-24 max-w-md px-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Can't reach the decision engine</h1>
        <p className="mt-2 text-sm text-slate-600">The rule defaults didn't load, so no decisions can be made yet.</p>
        <button
          type="button"
          onClick={() => void defaults.refetch()}
          className="mt-4 rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 lg:h-dvh">
      <a
        href="#decision-graph"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to decision graph
      </a>

      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h1 className="text-base font-semibold">Fraud Decision Visualizer</h1>
          <p className="text-xs text-slate-600">See exactly which check approved or declined a transaction.</p>
        </div>
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          disabled={!rules}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Edit rules
          {customRules && (
            <span className="rounded bg-blue-50 px-1.5 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-700/20">
              Custom
            </span>
          )}
        </button>
      </header>

      <p className="sr-only" aria-live="polite">
        {batch.data ? `Evaluated ${batch.data.results.length} transactions: ${declinedCount} declined.` : ""}
      </p>

      <div className="flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-[20rem_minmax(0,1fr)_24rem]">
        <aside aria-label="Transactions" className="flex flex-col border-b border-slate-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
          <div role="tablist" aria-label="Input source" className="flex border-b border-slate-200 px-2" onKeyDown={handleTabKey}>
            {TABS.map((tab) => (
              <button
                key={tab.mode}
                id={`tab-${tab.mode}`}
                type="button"
                role="tab"
                aria-selected={mode === tab.mode}
                aria-controls={`panel-${tab.mode}`}
                tabIndex={mode === tab.mode ? 0 : -1}
                onClick={() => switchMode(tab.mode)}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${
                  mode === tab.mode ? "border-blue-700 text-slate-900" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            id="panel-file"
            role="tabpanel"
            aria-labelledby="tab-file"
            hidden={mode !== "file"}
            className="flex min-h-0 flex-1 flex-col"
          >
            <UploadPanel
              file={file}
              results={batch.data?.results}
              isEvaluating={batch.isFetching}
              evaluationError={batch.error}
              rules={rules}
              selectedIndex={selectedIndex}
              onLoad={(name, transactions) => {
                setFile({ id: (file?.id ?? 0) + 1, name, transactions });
                setSelectedIndex(0);
                setSelectedNodeId(null);
              }}
              onSelect={(index) => {
                setSelectedIndex(index);
                setSelectedNodeId(null);
              }}
              onRetry={() => void batch.refetch()}
              onOpenRules={() => setRulesOpen(true)}
            />
          </div>
          <div id="panel-scenario" role="tabpanel" aria-labelledby="tab-scenario" hidden={mode !== "scenario"}>
            <ControlPanel onChange={setScenarioInput} />
          </div>
        </aside>

        <main id="decision-graph" tabIndex={-1} className="flex min-h-[32rem] flex-col lg:min-h-0">
          {activeTrace && activeTransaction ? (
            <>
              <DecisionSummary trace={activeTrace} transaction={activeTransaction} />
              {mode === "scenario" && scenario.error && (
                <p role="alert" className="border-b border-red-300 bg-red-50 px-5 py-2 text-sm text-red-900">
                  This scenario couldn't be evaluated. Check the amount is greater than 0.
                </p>
              )}
              <div className="relative min-h-0 flex-1">
                <GraphCanvas
                  key={`${mode}-${activeTrace.transaction_id}-${selectedIndex}`}
                  trace={activeTrace} selectedNodeId={activeNodeId} onSelect={setSelectedNodeId} />
              </div>
            </>
          ) : (
            <div className="m-auto max-w-sm px-6 py-16 text-center">
              <h2 className="text-base font-semibold text-slate-900">
                {mode === "file" && !file
                  ? "No transactions yet"
                  : (mode === "file" ? batch.error : scenario.error)
                    ? "No decision to show"
                    : "Evaluating…"}
              </h2>
              {mode === "file" && !file && (
                <p className="mt-1 text-sm text-slate-600">
                  Upload a CSV or JSON file, or use the sample data, to see each decision as a step-by-step graph.
                </p>
              )}
            </div>
          )}
        </main>

        <aside aria-label="Check details" className="border-t border-slate-200 bg-white lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <TraceInspector node={activeNode} />
        </aside>
      </div>

      {rules && defaults.data && (
        <RulesDialog
          open={rulesOpen}
          rules={rules}
          defaults={defaults.data}
          onApply={(next) => {
            const isDefault = (Object.keys(next) as (keyof RuleConfig)[]).every((k) => next[k] === defaults.data[k]);
            setCustomRules(isDefault ? null : next);
            setRulesOpen(false);
          }}
          onClose={() => setRulesOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
