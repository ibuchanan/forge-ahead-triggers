import {
  defineWebTrigger,
  type WebTriggerEvent,
  type WebTriggerHandler,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

const event = {
  headers: { accept: ["application/json"] },
  method: "GET",
  path: "/x1/trigger-id/resources/42",
  queryParameters: { include: ["details"] },
  userPath: "/resources/42",
} satisfies WebTriggerEvent;

const response: WebTriggerResponse = {
  body: "ok",
  headers: { "content-type": ["text/plain"] },
  statusCode: 200,
};

const handler: WebTriggerHandler = (receivedEvent) => {
  const path: string = receivedEvent.path;
  const userPath: string = receivedEvent.userPath;
  void path;
  void userPath;

  return response;
};

const validHandler = defineWebTrigger(() => ({
  body: "ok",
  headers: { "content-type": ["text/plain"] },
  statusCode: 200,
}));

const invalidHandler = defineWebTrigger(() => ({
  body: "invalid",
  // @ts-expect-error Forge web-trigger response headers must be string arrays.
  headers: { "content-type": "text/plain" },
  statusCode: 200,
}));

void handler(event, { installContext: "ari:cloud:ecosystem::app/123" });
void validHandler;
void invalidHandler;
