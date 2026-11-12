import type { TransactionInput } from "../types/trace.gen";

type FieldKind = "text" | "integer" | "boolean" | "amount";

/**
 * Every TransactionInput field and how a raw CSV/JSON cell is coerced
 * into it. Typed against the generated TransactionInput, so a backend
 * model change that adds or renames a field fails the typecheck here.
 */
export const TRANSACTION_FIELDS: Record<keyof TransactionInput, FieldKind> = {
  transaction_id: "text",
  account_id: "text",
  amount: "amount",
  currency: "text",
  timestamp: "text",
  ip_address: "text",
  ip_country: "text",
  is_known_proxy: "boolean",
  is_known_datacenter: "boolean",
  billing_country: "text",
  shipping_country: "text",
  account_home_country: "text",
  device_id: "text",
  device_recognized: "boolean",
  distinct_accounts_on_device_24h: "integer",
  transactions_from_account_1h: "integer",
  transactions_from_account_24h: "integer",
  account_age_days: "integer",
  email_verified: "boolean",
};

export const TRANSACTION_FIELD_NAMES = Object.keys(TRANSACTION_FIELDS) as (keyof TransactionInput)[];
