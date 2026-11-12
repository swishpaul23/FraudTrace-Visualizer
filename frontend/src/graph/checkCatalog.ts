import type { RuleConfig } from "../types/trace.gen";

export interface RuleField {
  key: keyof RuleConfig;
  label: string;
  help: string;
  unit: string;
  /** Mirrors the field's `ge` bound in backend/app/models/rules.py. */
  min: number;
}

export interface CheckInfo {
  label: string;
  description: string;
  rules: RuleField[];
}

/**
 * Human-facing name, plain-language description, and tunable rules for
 * each engine check, keyed by node_id. Order matches the engine registry
 * (backend/app/engine/registry.py).
 */
export const CHECK_CATALOG: Record<string, CheckInfo> = {
  ingress: {
    label: "Payload freshness",
    description:
      "Rejects transactions whose timestamp is too far in the past or future. Stale timestamps usually mean a replayed or delayed request.",
    rules: [
      {
        key: "max_staleness_minutes",
        label: "Max transaction age",
        help: "Raise this when reviewing historical transactions.",
        unit: "minutes",
        min: 1,
      },
      {
        key: "max_future_skew_minutes",
        label: "Max clock skew into the future",
        help: "Tolerance for clocks running ahead of the server.",
        unit: "minutes",
        min: 0,
      },
    ],
  },
  geo: {
    label: "Geography match",
    description:
      "Passes when at least two of the IP, billing, and shipping countries agree. All three disagreeing points to a compromised buyer or card.",
    rules: [],
  },
  proxy: {
    label: "Proxy / datacenter IP",
    description: "Declines transactions sent from a known proxy, VPN, or datacenter IP address.",
    rules: [],
  },
  amount_risk: {
    label: "Amount limit",
    description: "Declines transactions above the high-value limit. No currency conversion is applied.",
    rules: [
      {
        key: "max_amount",
        label: "Max amount",
        help: "Compared in the transaction's own currency.",
        unit: "currency units",
        min: 1,
      },
    ],
  },
  velocity: {
    label: "Velocity",
    description:
      "Limits how often one account transacts and how many accounts share one device. Bursts are a common card-testing pattern.",
    rules: [
      {
        key: "max_transactions_per_hour",
        label: "Max transactions per account, last hour",
        help: "",
        unit: "transactions",
        min: 0,
      },
      {
        key: "max_transactions_per_day",
        label: "Max transactions per account, last 24 hours",
        help: "",
        unit: "transactions",
        min: 0,
      },
      {
        key: "max_accounts_per_device_per_day",
        label: "Max accounts per device, last 24 hours",
        help: "",
        unit: "accounts",
        min: 0,
      },
    ],
  },
  resolution: {
    label: "Identity signals",
    description:
      "Requires at least one trusted identity signal: a recognized device, a verified email, or an account older than the minimum age.",
    rules: [
      {
        key: "min_trusted_account_age_days",
        label: "Min trusted account age",
        help: "Accounts at least this old count as a trusted signal.",
        unit: "days",
        min: 0,
      },
    ],
  },
};

/** Fails fast on a node_id the UI doesn't know — add it to CHECK_CATALOG. */
export function checkInfo(nodeId: string): CheckInfo {
  const info = CHECK_CATALOG[nodeId];
  if (!info) throw new Error(`No CHECK_CATALOG entry for engine node "${nodeId}"`);
  return info;
}
