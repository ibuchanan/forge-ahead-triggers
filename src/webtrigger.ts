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
