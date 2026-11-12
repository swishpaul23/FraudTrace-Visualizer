/** Engine text is lower-case; restore the acronym it uses. */
function fixAcronyms(text: string): string {
  return text.replace(/\bip\b/gi, "IP");
}

/** "transactions_from_account_1h" -> "Transactions from account 1h" */
export function humanizeKey(key: string): string {
  const spaced = fixAcronyms(key.replace(/_/g, " "));
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Engine reasons are lower-case fragments; render them as sentences. */
export function toSentence(text: string): string {
  const fixed = fixAcronyms(text);
  return `${fixed.charAt(0).toUpperCase()}${fixed.slice(1)}.`;
}

export function formatAmount(amount: number | string, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export function formatDuration(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "−" : "";
  let remaining = Math.round(Math.abs(totalSeconds));
  const days = Math.floor(remaining / 86_400);
  remaining %= 86_400;
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const parts = [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    !days && !hours ? `${seconds}s` : "",
  ].filter(Boolean);
  return `${sign}${parts.join(" ")}`;
}

/** Formats one metadata value; `key` decides units (e.g. *_seconds). */
export function formatMetadataValue(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && key.endsWith("_seconds")) return formatDuration(value);
  if (typeof value === "number") return value.toLocaleString("en-US");
  return String(value);
}
