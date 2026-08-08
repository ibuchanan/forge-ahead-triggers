/**
 * Shared Forge invocation contracts.
 *
 * This module is intentionally not public: root exports are defined by
 * `src/index.ts`.
 */

/** A JSON scalar value. */
export type JSONPrimitive = boolean | null | number | string;

/** A value that can be represented in JSON. */
export type JSONValue =
  | JSONPrimitive
  | { [key: string]: JSONValue }
  | JSONValue[];

/**
 * The JSON-shaped base for Forge trigger events.
 *
 * Trigger families refine this shape with their own event-specific fields.
 */
export type TriggerEvent = Record<string, JSONValue | undefined>;

/** The minimal invocation metadata supplied alongside every trigger event. */
export interface InvocationContext {
  installContext: string;
  principal?: string;
  workspaceId?: string;
}

/** A Forge trigger handler with a family-specific event and result type. */
export type TriggerHandler<
  Event extends object = TriggerEvent,
  Result = void,
> = (event: Event, context: InvocationContext) => Result | Promise<Result>;
