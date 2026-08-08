import type {
  InvocationContext,
  JSONPrimitive,
  JSONValue,
  TriggerEvent,
  TriggerHandler,
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

void handler(event, context);
