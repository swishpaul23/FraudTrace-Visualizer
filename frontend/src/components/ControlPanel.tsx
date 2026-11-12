import { useState } from "react";
import type { TransactionInput } from "../types/trace.gen";

export interface ControlPanelState {
  amountDollars: string;
  isKnownProxy: boolean;
  transactionsFromAccount1h: number;
  geoMismatch: boolean;
  distinctAccountsOnDevice24h: number;
}

export const DEFAULT_CONTROL_STATE: ControlPanelState = {
  amountDollars: "50.00",
  isKnownProxy: false,
  transactionsFromAccount1h: 1,
  geoMismatch: false,
  distinctAccountsOnDevice24h: 0,
};

// Held fixed — not exposed as controls in this phase, but the backend
// requires them on every request.
const FIXED_TRANSACTION_ID = "tx_demo";
const FIXED_ACCOUNT_ID = "acct_demo";
const FIXED_DEVICE_ID = "dev_demo";

/**
 * Pure: maps the panel's small set of exposed controls onto a full
 * TransactionInput, filling everything else with fixed baseline values
 * so the resulting trace isolates whichever signal the user is
 * exploring. Exported so App.tsx can compute the same initial value.
 */
export function buildTransactionInput(state: ControlPanelState): TransactionInput {
  return {
    transaction_id: FIXED_TRANSACTION_ID,
    account_id: FIXED_ACCOUNT_ID,
    amount: state.amountDollars,
    currency: "USD",
    timestamp: new Date().toISOString(),
    ip_address: "203.0.113.7",
    ip_country: state.geoMismatch ? "RU" : "US",
    is_known_proxy: state.isKnownProxy,
    is_known_datacenter: false,
    billing_country: "US",
    shipping_country: state.geoMismatch ? "CA" : "US",
    account_home_country: "US",
    device_id: FIXED_DEVICE_ID,
    device_recognized: true,
    distinct_accounts_on_device_24h: state.distinctAccountsOnDevice24h,
    transactions_from_account_1h: state.transactionsFromAccount1h,
    transactions_from_account_24h: state.transactionsFromAccount1h,
    account_age_days: 400,
    email_verified: true,
  };
}

export interface ControlPanelProps {
  onChange: (input: TransactionInput) => void;
}

const FIELD_LABEL = "text-sm font-medium text-slate-800";
const CHECKBOX_ROW = "flex items-start gap-2.5 text-sm text-slate-800";

/**
 * "What if" builder: owns the form state for five exposed signals and
 * lifts a full TransactionInput to the parent on every change. Makes no
 * API calls itself — that's the parent's job via useDecision.
 */
export function ControlPanel({ onChange }: ControlPanelProps) {
  const [state, setState] = useState<ControlPanelState>(DEFAULT_CONTROL_STATE);

  function update(partial: Partial<ControlPanelState>) {
    const next = { ...state, ...partial };
    setState(next);
    onChange(buildTransactionInput(next));
  }

  return (
    <form className="flex flex-col gap-5 p-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">Test a scenario</h2>
        <p className="mt-1 text-sm text-slate-600">
          Change one signal at a time to see which check catches it. Every other field stays at a clean baseline.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="scenario-amount" className={FIELD_LABEL}>
          Amount (USD)
        </label>
        <input
          id="scenario-amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={state.amountDollars}
          onChange={(e) => update({ amountDollars: e.target.value })}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor="scenario-velocity" className={FIELD_LABEL}>
            Transactions in the last hour
          </label>
          <output htmlFor="scenario-velocity" className="font-mono text-sm tabular-nums text-slate-900">
            {state.transactionsFromAccount1h}
          </output>
        </div>
        <input
          id="scenario-velocity"
          type="range"
          min={0}
          max={10}
          value={state.transactionsFromAccount1h}
          onChange={(e) => update({ transactionsFromAccount1h: Number(e.target.value) })}
          className="accent-blue-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor="scenario-device" className={FIELD_LABEL}>
            Accounts on this device (24h)
          </label>
          <output htmlFor="scenario-device" className="font-mono text-sm tabular-nums text-slate-900">
            {state.distinctAccountsOnDevice24h}
          </output>
        </div>
        <input
          id="scenario-device"
          type="range"
          min={0}
          max={10}
          value={state.distinctAccountsOnDevice24h}
          onChange={(e) => update({ distinctAccountsOnDevice24h: Number(e.target.value) })}
          className="accent-blue-700"
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className={`${FIELD_LABEL} mb-2`}>Risk signals</legend>
        <label className={CHECKBOX_ROW}>
          <input
            type="checkbox"
            checked={state.isKnownProxy}
            onChange={(e) => update({ isKnownProxy: e.target.checked })}
            className="mt-0.5 size-4 accent-blue-700"
          />
          Sent from a known VPN or proxy IP
        </label>
        <label className={CHECKBOX_ROW}>
          <input
            type="checkbox"
            checked={state.geoMismatch}
            onChange={(e) => update({ geoMismatch: e.target.checked })}
            className="mt-0.5 size-4 accent-blue-700"
          />
          IP, billing, and shipping countries all differ
        </label>
      </fieldset>
    </form>
  );
}
