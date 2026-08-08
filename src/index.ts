/** Public package entry point for shared Forge trigger contracts. */

export type {
  InvocationContext,
  JSONPrimitive,
  JSONValue,
  TriggerEvent,
  TriggerHandler,
} from "./core.js";
export type { InvocationLogger } from "./logging.js";
export { withInvocationLogging } from "./logging.js";
