import {
  defineWebTrigger,
  type WebTriggerEvent,
  type WebTriggerHandler,
  type WebTriggerResponse,
} from "../src/webtrigger.js";

const event = {
  body: '{"action":"create"}',
  headers: { accept: ["application/json"] },
  method: "POST",
  path: "/x1/trigger-id/orders/123",
  queryParameters: { expand: ["items"] },
  userPath: "/orders/123",
} satisfies WebTriggerEvent;

const response: WebTriggerResponse = {
  body: '{"ok":true}',
  headers: { "content-type": ["application/json"] },
  statusCode: 200,
  statusText: "OK",
};

const annotatedHandler: WebTriggerHandler = (receivedEvent, context) => {
  const requestPath: string = receivedEvent.path;
  const userPath: string = receivedEvent.userPath;
  const headerValues: string[] = receivedEvent.headers.accept;
  const queryValues: string[] = receivedEvent.queryParameters.expand;

  void requestPath;
  void userPath;
  void headerValues;
  void queryValues;
  void context.installContext;

  return response;
};

const validHandler = defineWebTrigger((receivedEvent) => ({
  body: receivedEvent.userPath,
  headers: { "content-type": ["text/plain"] },
  statusCode: 200,
  statusText: "OK",
}));

const invalidHandler = defineWebTrigger(() => ({
  body: "invalid",
  // @ts-expect-error Forge web-trigger response headers must be string arrays.
  headers: { "content-type": "text/plain" },
  statusCode: 200,
  statusText: "OK",
}));

void annotatedHandler(event, {
  installContext: "ari:cloud:ecosystem::app/123",
});
void validHandler;
void invalidHandler;
