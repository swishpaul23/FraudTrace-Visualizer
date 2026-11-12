import Papa from "papaparse";
import { MAX_BATCH_SIZE } from "../api/decisionClient";
import type { TransactionInput } from "../types/trace.gen";
import { TRANSACTION_FIELDS, TRANSACTION_FIELD_NAMES } from "./transactionFields";

/**
 * Thrown when a file can't be turned into TransactionInputs. Carries
 * every problem found (row + field) so the user can fix the file in one
 * pass. A file with any bad row is rejected whole — no partial loads.
 */
export class FileParseError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(problems[0]);
    this.problems = problems;
  }
}

const TRUE_VALUES = new Set(["true", "1", "yes", "y"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n"]);

function coerce(kind: string, raw: unknown): unknown {
  const text = String(raw).trim();
  switch (kind) {
    case "boolean": {
      const lowered = text.toLowerCase();
      if (TRUE_VALUES.has(lowered)) return true;
      if (FALSE_VALUES.has(lowered)) return false;
      throw new Error(`expected true/false, got "${text}"`);
    }
    case "integer": {
      if (!/^-?\d+$/.test(text)) throw new Error(`expected a whole number, got "${text}"`);
      return Number(text);
    }
    default:
      return text;
  }
}

function toTransaction(record: Record<string, unknown>, rowLabel: string, problems: string[]) {
  const transaction: Record<string, unknown> = {};
  for (const field of TRANSACTION_FIELD_NAMES) {
    const raw = record[field];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      problems.push(`${rowLabel}: missing "${field}"`);
      continue;
    }
    try {
      transaction[field] = coerce(TRANSACTION_FIELDS[field], raw);
    } catch (error) {
      problems.push(`${rowLabel}, ${field}: ${(error as Error).message}`);
    }
  }
  return transaction as unknown as TransactionInput;
}

function parseRecords(fileName: string, text: string): Record<string, unknown>[] {
  if (fileName.toLowerCase().endsWith(".json")) {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new FileParseError(["JSON files must contain an array of transaction objects."]);
    }
    return parsed as Record<string, unknown>[];
  }

  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new FileParseError(
      result.errors.map((error) => `Row ${(error.row ?? 0) + 1}: ${error.message}`),
    );
  }
  return result.data;
}

/** Pure: file name + text in, validated TransactionInputs out (or throws). */
export function parseTransactionFile(fileName: string, text: string): TransactionInput[] {
  const records = parseRecords(fileName, text);

  if (records.length === 0) {
    throw new FileParseError(["The file has no transaction rows."]);
  }
  if (records.length > MAX_BATCH_SIZE) {
    throw new FileParseError([
      `The file has ${records.length.toLocaleString()} rows. Upload at most ${MAX_BATCH_SIZE.toLocaleString()} per file.`,
    ]);
  }

  const presentColumns = new Set(Object.keys(records[0]));
  const missingColumns = TRANSACTION_FIELD_NAMES.filter((field) => !presentColumns.has(field));
  if (missingColumns.length > 0) {
    throw new FileParseError([
      `Missing ${missingColumns.length === 1 ? "column" : "columns"}: ${missingColumns.join(", ")}. Download the CSV template to see every required column.`,
    ]);
  }

  const problems: string[] = [];
  const transactions = records.map((record, index) =>
    toTransaction(record, `Row ${index + 1}`, problems),
  );

  if (problems.length > 0) throw new FileParseError(problems);
  return transactions;
}
