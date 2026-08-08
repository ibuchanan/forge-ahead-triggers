/** Forge web-trigger contracts. */
import type {
  WebTriggerMethod,
  WebTriggerResponse as ForgeWebTriggerResponse,
} from "@forge/api";

import type { TriggerHandler } from "./core.js";

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
