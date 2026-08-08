import type { ForgeLogger } from "@forge-ahead/logging";

import {
  withInvocationLogging,
  type InvocationContext,
  type InvocationLogger,
  type JSONPrimitive,
  type JSONValue,
  type TriggerEvent,
  type TriggerHandler,
} from "@forge-ahead/triggers";

const primitive: JSONPrimitive = "trigger";

const event = {
  payload: {
    primitive,
    values: [1, null, false],
  },
} satisfies TriggerEvent;

const context: InvocationContext = {
  installContext: "ari:cloud:ecosystem::app/123",
};

const handler: TriggerHandler<typeof event, JSONValue> = (
  receivedEvent,
  receivedContext,
) => ({
  payload: receivedEvent.payload,
  installContext: receivedContext.installContext,
});

declare const forgeLogger: ForgeLogger;

const invocationLogger: InvocationLogger = forgeLogger;
const loggedHandler = withInvocationLogging(invocationLogger, handler);

void handler(event, context);
void loggedHandler(event, context);
