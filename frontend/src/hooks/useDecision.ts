import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchBatchDecisions, fetchDecision, fetchDefaultRules } from "../api/decisionClient";
import type { RuleConfig, TransactionInput } from "../types/trace.gen";

/**
 * Re-fetches whenever `input` or `rules` change, purely by virtue of
 * the query key changing.
 *
 * placeholderData: keepPreviousData keeps the previous trace visible
 * during a refetch. Without it `data` resets to undefined on every key
 * change, which unmounts <GraphCanvas> and resets the user's pan/zoom.
 */
export function useDecision(input: TransactionInput, rules: RuleConfig | undefined) {
  return useQuery({
    queryKey: ["decision", JSON.stringify(input), rules],
    queryFn: () => fetchDecision({ transaction: input, rules: rules! }),
    enabled: rules !== undefined,
    placeholderData: keepPreviousData,
  });
}

/**
 * One request per uploaded file. `fileId` stands in for the file's
 * contents in the query key so a 1,000-row file isn't serialized into
 * the key on every render; it must change whenever `transactions` does.
 */
export function useBatchDecisions(
  fileId: number,
  transactions: TransactionInput[] | null,
  rules: RuleConfig | undefined,
) {
  return useQuery({
    queryKey: ["batch", fileId, rules],
    queryFn: () => fetchBatchDecisions({ transactions: transactions!, rules: rules! }),
    enabled: transactions !== null && rules !== undefined,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useDefaultRules() {
  return useQuery({
    queryKey: ["rules", "defaults"],
    queryFn: fetchDefaultRules,
    staleTime: Infinity,
  });
}
