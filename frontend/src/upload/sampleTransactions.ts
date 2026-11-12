import type { TransactionInput } from "../types/trace.gen";

const BASELINE: Omit<TransactionInput, "transaction_id" | "timestamp"> = {
  account_id: "acct_1001",
  amount: "84.20",
  currency: "USD",
  ip_address: "203.0.113.7",
  ip_country: "US",
  is_known_proxy: false,
  is_known_datacenter: false,
  billing_country: "US",
  shipping_country: "US",
  account_home_country: "US",
  device_id: "dev_7f3a",
  device_recognized: true,
  distinct_accounts_on_device_24h: 1,
  transactions_from_account_1h: 1,
  transactions_from_account_24h: 3,
  account_age_days: 412,
  email_verified: true,
};

// One row per outcome the engine can produce, plus clean approvals.
// Each override changes only the signal it's demonstrating.
const SCENARIOS: Partial<TransactionInput>[] = [
  {},
  { account_id: "acct_2044", amount: "312.00", is_known_proxy: true, ip_address: "198.51.100.23" },
  { account_id: "acct_1187", amount: "7200.00" },
  { account_id: "acct_3310", transactions_from_account_1h: 8, transactions_from_account_24h: 11 },
  { account_id: "acct_4402", ip_country: "RU", shipping_country: "CA", ip_address: "192.0.2.44" },
  {
    account_id: "acct_9001",
    device_recognized: false,
    email_verified: false,
    account_age_days: 2,
    device_id: "dev_new1",
  },
  { account_id: "acct_5120", distinct_accounts_on_device_24h: 6, device_id: "dev_shared" },
  { account_id: "acct_6233", is_known_datacenter: true, ip_address: "198.51.100.200" },
  { account_id: "acct_1290", amount: "1250.00", shipping_country: "CA" },
  { account_id: "acct_7781", amount: "19.99", currency: "CAD", account_home_country: "CA", billing_country: "CA", shipping_country: "CA", ip_country: "CA" },
  { account_id: "acct_8102", amount: "4999.00", transactions_from_account_1h: 5 },
  { account_id: "acct_3391", amount: "56.10", device_recognized: false, account_age_days: 3 },
];

/**
 * Builds the sample file relative to `now` so every row clears the
 * default 15-minute freshness window — except one deliberately stale
 * row, which demonstrates the ingress check.
 */
export function buildSampleTransactions(now: Date): TransactionInput[] {
  const rows = SCENARIOS.map((overrides, index) => ({
    ...BASELINE,
    transaction_id: `tx_${String(10001 + index)}`,
    timestamp: new Date(now.getTime() - (index + 1) * 45_000).toISOString(),
    ...overrides,
  }));

  rows.push({
    ...BASELINE,
    transaction_id: `tx_${10001 + rows.length}`,
    account_id: "acct_6650",
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  });

  return rows;
}
