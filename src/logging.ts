/** Optional caller-owned invocation logging. */
import type { ForgeInvocationLogOptions } from "@forge-ahead/logging";

import type { TriggerHandler } from "./core.js";

/** The minimal logger capability used for trigger-invocation observation. */
export interface InvocationLogger {
  forgeInvocation(
    event: unknown,
    message?: string,
    options?: ForgeInvocationLogOptions,
  ): void;
}

/**
 * Wrap a handler so the caller-owned logger observes each invocation first.
 *
 * This wrapper neither creates nor configures a logger and leaves handler
 * results, promises, and errors untouched.
 */
export const withInvocationLogging =
  <Event extends object, Result>(
    logger: InvocationLogger,
    handler: TriggerHandler<Event, Result>,
  ): TriggerHandler<Event, Result> =>
  (event, context) => {
    logger.forgeInvocation(event);
    return handler(event, context);
  };
