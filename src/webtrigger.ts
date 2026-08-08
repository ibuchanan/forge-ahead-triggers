/** Forge web-trigger contracts. */
import type {
  WebTriggerMethod,
  WebTriggerResponse as ForgeWebTriggerResponse,
} from "@forge/api";

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
