/** Forge web-trigger contracts. */
import type {
  WebTriggerResponse as ForgeWebTriggerResponse,
  WebTriggerMethod,
} from "@forge/api";
import { err, ok, toProblemDetails, type Result } from "@forge-ahead/errors";

import type { JSONValue, TriggerHandler } from "./core.js";

/** A web-trigger request received by a Forge function. */
export interface WebTriggerEvent {
  /** The optional HTTP request body. */
  body?: string;
  /** HTTP request headers, preserving Forge's array-valued header shape. */
  headers: Record<string, string[]>;
  /** The HTTP method used by the caller. */
  method: WebTriggerMethod;
  /** The full request path, including the Forge web-trigger identifier. */
  path: string;
  /** Parsed query-string values. */
  queryParameters: Record<string, string[]>;
  /** The caller-controlled suffix after the web-trigger identifier. */
  userPath: string;
}

/** A Forge-compatible web-trigger response. */
export type WebTriggerResponse = ForgeWebTriggerResponse;

/** A handler for Forge web triggers. */
export type WebTriggerHandler = TriggerHandler<
  WebTriggerEvent,
  WebTriggerResponse
>;

/**
 * Contextually type a web-trigger handler without changing its runtime value.
 */
export const defineWebTrigger = (
  handler: WebTriggerHandler,
): WebTriggerHandler => handler;

const CLIENT_HEADER_NAMES = new Set([
  "user-agent",
  "atl-traceid",
  "atl-edge-true-client-ip",
  "atl-edge-ip-tags",
]);

/** Return the approved client headers using canonical lowercase names. */
export const extractClientHeaders = (
  headers: Record<string, string[]>,
): Record<string, string[]> => {
  const clientHeaders: Record<string, string[]> = {};

  for (const [name, values] of Object.entries(headers)) {
    const canonicalName = name.toLowerCase();

    if (CLIENT_HEADER_NAMES.has(canonicalName)) {
      clientHeaders[canonicalName] ??= [];
      clientHeaders[canonicalName].push(...values);
    }
  }

  return clientHeaders;
};

/** Build a JSON-bearing `200 OK` Forge web-trigger response. */
export const buildSuccessResponse = (
  value: JSONValue = { message: "OK" },
): WebTriggerResponse => ({
  body: JSON.stringify(value),
  headers: { "content-type": ["application/json"] },
  statusCode: 200,
  statusText: "OK",
});

/** Build an empty `204 No Content` Forge web-trigger response. */
export const buildEmptySuccessResponse = (): WebTriggerResponse => ({
  statusCode: 204,
  statusText: "No Content",
});

/** Build a Problem Details Forge web-trigger response from an unknown error. */
export const buildErrorResponse = (
  error: unknown,
  status?: number,
): WebTriggerResponse => {
  const problem = toProblemDetails(error);
  const statusCode =
    status ??
    (Number.isInteger(problem.status) &&
    problem.status >= 100 &&
    problem.status <= 599
      ? problem.status
      : 500);

  return {
    body: JSON.stringify({ ...problem, status: statusCode }),
    headers: { "content-type": ["application/problem+json"] },
    statusCode,
    statusText: problem.title || `Error response (${statusCode})`,
  };
};

/** Body of a simple domain-error-code web-trigger response. */
export interface ErrorCodeResponseBody {
  /** Domain error code identifying the failure. */
  readonly error: string;
  /** Optional human-readable explanation. */
  readonly detail?: string;
}

const DEFAULT_ERROR_HEADERS = { "content-type": ["application/json"] };

/** Build a JSON web-trigger response with a simple domain error code. */
export const buildErrorCodeResponse = (
  statusCode: number,
  body: ErrorCodeResponseBody,
  headers: Record<string, string[]> = DEFAULT_ERROR_HEADERS,
): WebTriggerResponse => ({
  body: JSON.stringify(body),
  headers,
  statusCode,
});

/** Options for {@link parseJsonBody}. */
export interface ParseJsonBodyOptions {
  /** Status code for validation failure responses (default: 400). */
  statusCode?: number;
  /** Domain error code for validation failure responses (default: "invalid-request-body"). */
  errorCode?: string;
  /** Headers for validation failure responses (default: `{ "content-type": ["application/json"] }`). */
  headers?: Record<string, string[]>;
}

const DEFAULT_ERROR_CODE = "invalid-request-body";

const buildValidationErrorResponse = (
  options: ParseJsonBodyOptions,
): WebTriggerResponse =>
  buildErrorCodeResponse(
    options.statusCode ?? 400,
    { error: options.errorCode ?? DEFAULT_ERROR_CODE },
    options.headers,
  );

/**
 * Parse a web-trigger JSON body and validate it with a caller-supplied type guard.
 *
 * Returns the parsed value on success, or a ready-to-return web-trigger error
 * response when the body is missing, malformed, or rejected by the guard.
 */
export const parseJsonBody = <T>(
  request: WebTriggerEvent,
  guard: (value: unknown) => value is T,
  options: ParseJsonBodyOptions = {},
): Result<T, WebTriggerResponse> => {
  if (!request.body) {
    return err(buildValidationErrorResponse(options));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(request.body);
  } catch {
    return err(buildValidationErrorResponse(options));
  }

  if (!guard(parsed)) {
    return err(buildValidationErrorResponse(options));
  }

  return ok(parsed);
};
