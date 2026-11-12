import type {
  BatchDecisionRequest,
  BatchDecisionResponse,
  DecisionRequest,
  DecisionTrace,
  RuleConfig,
} from "../types/trace.gen";

/**
 * Always same-origin. In production, frontend and backend share one
 * Vercel deployment (see /vercel.json); in dev, Vite proxies /api to
 * uvicorn on port 8000 (see vite.config.ts).
 */
const API_BASE_URL = "";

interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
}

/**
 * Thrown for any non-2xx response. Carries the backend's 422
 * validation issues (if any) so the UI can point at the exact row and
 * field instead of dumping a raw response body.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly issues: ValidationIssue[];

  constructor(status: number, message: string, issues: ValidationIssue[]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    const text = await response.text();
    const issues: ValidationIssue[] =
      response.status === 422 ? (JSON.parse(text).detail as ValidationIssue[]) : [];
    throw new ApiError(response.status, `Request to ${path} failed (${response.status})`, issues);
  }

  return (await response.json()) as T;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function fetchDecision(body: DecisionRequest): Promise<DecisionTrace> {
  return postJson("/api/v1/decisions", body);
}

export function fetchBatchDecisions(body: BatchDecisionRequest): Promise<BatchDecisionResponse> {
  return postJson("/api/v1/decisions/batch", body);
}

export function fetchDefaultRules(): Promise<RuleConfig> {
  return request("/api/v1/rules/defaults");
}

/** Mirrors MAX_BATCH_SIZE in backend/app/models/requests.py. */
export const MAX_BATCH_SIZE = 1000;
