import {
  buildErrorCodeResponse,
  buildErrorResponse,
  buildSuccessResponse,
  defineWebTrigger,
  parseJsonBody,
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

const parseResult = parseJsonBody(
  { ...event, body: '{"pairingId":"p1","role":"source"}' },
  (value): value is { pairingId: string; role: "source" | "destination" } =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { pairingId: string }).pairingId === "string" &&
    ["source", "destination"].includes((value as { role: string }).role),
);

if (parseResult.isErr()) {
  void parseResult.error;
} else {
  const pairingId: string = parseResult.value.pairingId;
  void pairingId;
}

const errorCodeResponse: WebTriggerResponse = buildErrorCodeResponse(400, {
  error: "invalid-seed-request",
  detail: "Missing role",
});

const successResponse: WebTriggerResponse = buildSuccessResponse({ ok: true });
const problemResponse: WebTriggerResponse = buildErrorResponse(
  new Error("failed"),
);

void handler(event, { installContext: "ari:cloud:ecosystem::app/123" });
void validHandler;
void invalidHandler;
void errorCodeResponse;
void successResponse;
void problemResponse;
