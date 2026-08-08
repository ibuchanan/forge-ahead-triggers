import type {
  InvocationContext,
  JSONPrimitive,
  JSONValue,
  TriggerEvent,
  TriggerHandler,
} from "../src/index.js";

const primitiveValues: readonly JSONPrimitive[] = ["value", 42, true, null];

const event = {
  attempt: 1,
  metadata: {
    enabled: true,
    labels: ["forge", "trigger"],
  },
} satisfies TriggerEvent;

const context: InvocationContext = {
  installContext: "ari:cloud:ecosystem::app/123",
  principal: "user-123",
  workspaceId: "workspace-123",
};

const handler: TriggerHandler<typeof event, JSONValue> = (
  receivedEvent,
  receivedContext,
) => ({
  attempt: receivedEvent.attempt,
  installContext: receivedContext.installContext,
});

void primitiveValues;
void handler(event, context);
