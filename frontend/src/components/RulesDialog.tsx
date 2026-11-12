import { useEffect, useRef, useState, type FormEvent } from "react";
import { CHECK_CATALOG } from "../graph/checkCatalog";
import type { RuleConfig } from "../types/trace.gen";

export interface RulesDialogProps {
  open: boolean;
  rules: RuleConfig;
  defaults: RuleConfig;
  onApply: (rules: RuleConfig) => void;
  onClose: () => void;
}

type Draft = Record<keyof RuleConfig, string>;

function toDraft(rules: RuleConfig): Draft {
  return Object.fromEntries(Object.entries(rules).map(([key, value]) => [key, String(value)])) as Draft;
}

function isValidValue(value: string, min: number): boolean {
  return /^\d+$/.test(value.trim()) && Number(value) >= min;
}

const RULE_FIELDS = Object.values(CHECK_CATALOG).flatMap((info) => info.rules);


const SECTIONS = Object.entries(CHECK_CATALOG).filter(([, info]) => info.rules.length > 0);

/**
 * Side sheet for editing rule thresholds. Built on the native <dialog>
 * modal, which provides the focus trap, Escape to close, an inert
 * background, and focus return to the opener.
 */
export function RulesDialog({ open, rules, defaults, onApply, onClose }: RulesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft>(() => toDraft(rules));
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (open && !dialog.open) {
      setDraft(toDraft(rules));
      setTouched(new Set());
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, rules]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const invalid = RULE_FIELDS.filter((field) => !isValidValue(draft[field.key], field.min));
    if (invalid.length > 0) {
      setTouched(new Set(Object.keys(draft)));
      document.getElementById(`rule-${invalid[0].key}`)?.focus();
      return;
    }
    onApply(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v)])) as unknown as RuleConfig);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="rules-title"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md border-l border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
    >
      <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="rules-title" className="text-base font-semibold">
              Decision rules
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Thresholds apply to the uploaded file and the scenario builder.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="rounded-md p-1 text-xl leading-none text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {SECTIONS.map(([nodeId, info]) => (
            <fieldset key={nodeId} className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-600">{info.label}</legend>
              {info.rules.map((field) => {
                const id = `rule-${field.key}`;
                const value = draft[field.key];
                const showError = touched.has(field.key) && !isValidValue(value, field.min);
                const describedBy = [`${id}-hint`, showError ? `${id}-error` : ""].filter(Boolean).join(" ");
                return (
                  <div key={field.key}>
                    <label htmlFor={id} className="text-sm font-medium text-slate-800">
                      {field.label}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        id={id}
                        type="number"
                        inputMode="numeric"
                        min={field.min}
                        step={1}
                        value={value}
                        aria-invalid={showError || undefined}
                        aria-describedby={describedBy}
                        onChange={(e) => {
                          setDraft({ ...draft, [field.key]: e.target.value });
                          if (isValidValue(e.target.value, field.min)) {
                            const next = new Set(touched);
                            next.delete(field.key);
                            setTouched(next);
                          }
                        }}
                        onBlur={() => setTouched(new Set(touched).add(field.key))}
                        className={`w-32 rounded-md border px-2.5 py-1.5 font-mono text-sm ${
                          showError ? "border-red-600" : "border-slate-300"
                        }`}
                      />
                      <span className="text-sm text-slate-600">{field.unit}</span>
                    </div>
                    <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
                      {field.help ? `${field.help} ` : ""}Default: {defaults[field.key]}.
                    </p>
                    {showError && (
                      <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">
                        Enter a whole number, {field.min} or more.
                      </p>
                    )}
                  </div>
                );
              })}
            </fieldset>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setDraft(toDraft(defaults));
              setTouched(new Set());
            }}
            className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800">
              Apply rules
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
