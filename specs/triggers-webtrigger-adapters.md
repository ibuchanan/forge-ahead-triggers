# Mini-Spec: `@forge-ahead/triggers` — WebTrigger request parsing and error responses

## Context

`@forge-ahead/triggers/webtrigger` already exports `defineWebTrigger`,
`buildSuccessResponse`, and `buildErrorResponse`. In practice, every
webtrigger handler still repeats the same three pieces of boilerplate:

1. Parse the optional JSON body.
2. Validate the parsed body with a domain type guard.
3. Return a JSON error response when validation fails.

The Supplychain Graph project contains this pattern in multiple handlers.

### Example from the project

`src/pairing/forge-demo-pairing-seed.ts`:

```typescript
function errorResponse(
  statusCode: number,
  body: Record<string, unknown>,
): WebTriggerResponse {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": ["application/json"] },
    statusCode,
  };
}

function parseSeed<T extends DemoPairingSeed>(
  request: WebTriggerEvent,
): T | undefined {
  if (!request.body) {
    return undefined;
  }

  try {
    return JSON.parse(request.body) as T;
  } catch {
    return undefined;
  }
}

async function seed(request: WebTriggerEvent, role: DemoPairingSeed["role"]) {
  const seedRequest = parseSeed<DemoPairingSeed>(request);
  if (!seedRequest || seedRequest.role !== role) {
    return errorResponse(400, { error: "invalid-seed-request" });
  }
  // ... handler logic
}
```

A similar `parseXxx` + `errorResponse` pair appears in:

- `src/collaboration/forge-starter-peer-delivery.ts`
- `src/collaboration/forge-source-starter-publication.ts`
- `src/projection/read-connection-change-request.ts` (for `onConfigChange`)

## Problem

- Handlers re-implement JSON parsing and body-existence checks.
- Error response shapes are inconsistent: some use `error`, some use `message`,
  some use `detail`, and some use `application/problem+json` while others use
  `application/json`.
- `buildErrorResponse` is based on `ProblemDetails`, but these handlers use a
  simpler `{ error: "domain-code" }` format.

## Goal

Add two small utilities to `@forge-ahead/triggers/webtrigger`:

1. `parseJsonBody<T>` — parse the body, validate it with a caller-supplied type
   guard, and return a `Result<T, WebTriggerResponse>`.
2. `buildErrorCodeResponse` — build a JSON response with a simple domain error
   code.

These keep the package's existing `buildErrorResponse` for full ProblemDetails
but give handlers a lighter path for the common validation case.

## Proposed API

### Parse body with a guard

```typescript
import type { Result } from "@forge-ahead/errors";
import type { WebTriggerEvent, WebTriggerResponse } from "./webtrigger";

export interface ParseJsonBodyOptions {
  statusCode?: number;
  errorCode?: string;
  headers?: Record<string, string[]>;
}

export function parseJsonBody<T>(
  request: WebTriggerEvent,
  guard: (value: unknown) => value is T,
  options?: ParseJsonBodyOptions,
): Result<T, WebTriggerResponse>;
```

Behavior:

- If `request.body` is missing or empty, return `err(buildErrorCodeResponse(...))`.
- If `JSON.parse` throws, return `err(buildErrorCodeResponse(...))`.
- If the guard returns `false`, return `err(buildErrorCodeResponse(...))`.
- Otherwise return `ok(parsed)`.

Default options:

- `statusCode`: `400`
- `errorCode`: `"invalid-request-body"`
- `headers`: `{ "content-type": ["application/json"] }`

### Build a simple error response

```typescript
export interface ErrorCodeResponseBody {
  readonly error: string;
  readonly detail?: string;
}

export function buildErrorCodeResponse(
  statusCode: number,
  body: ErrorCodeResponseBody,
  headers?: Record<string, string[]>,
): WebTriggerResponse;
```

Behavior:

- Serializes the body as JSON.
- Defaults `headers` to `{ "content-type": ["application/json"] }`.
- Does not add a `statusText` field.

## Implementation sketch

```typescript
import { err, ok } from "@forge-ahead/errors";

export function parseJsonBody<T>(
  request: WebTriggerEvent,
  guard: (value: unknown) => value is T,
  options: ParseJsonBodyOptions = {},
): Result<T, WebTriggerResponse> {
  if (!request.body) {
    return err(
      buildErrorCodeResponse(
        options.statusCode ?? 400,
        { error: options.errorCode ?? "invalid-request-body" },
        options.headers,
      ),
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(request.body);
  } catch {
    return err(
      buildErrorCodeResponse(
        options.statusCode ?? 400,
        { error: options.errorCode ?? "invalid-request-body" },
        options.headers,
      ),
    );
  }

  if (!guard(parsed)) {
    return err(
      buildErrorCodeResponse(
        options.statusCode ?? 400,
        { error: options.errorCode ?? "invalid-request-body" },
        options.headers,
      ),
    );
  }

  return ok(parsed);
}

export function buildErrorCodeResponse(
  statusCode: number,
  body: ErrorCodeResponseBody,
  headers: Record<string, string[]> = { "content-type": ["application/json"] },
): WebTriggerResponse {
  return {
    body: JSON.stringify(body),
    headers,
    statusCode,
  };
}
```

## Acceptance criteria

- [ ] `parseJsonBody` is exported from `@forge-ahead/triggers/webtrigger`.
- [ ] `buildErrorCodeResponse` is exported from `@forge-ahead/triggers/webtrigger`.
- [ ] Both functions typecheck against the existing `WebTriggerEvent` and
      `WebTriggerResponse` contracts.
- [ ] Unit tests cover:
      - missing body returns the configured/default error code and status;
      - malformed JSON returns the configured/default error code and status;
      - a failing guard returns the configured/default error code and status;
      - a passing guard returns `ok(parsed)` with the parsed value.
- [ ] Unit tests cover `buildErrorCodeResponse` with custom headers, status,
      and body.
- [ ] `npm run check` passes (format, lint, typecheck, tests, build).
- [ ] The existing `buildErrorResponse` (ProblemDetails) is unchanged.

## Usage example

```typescript
import { buildErrorCodeResponse, buildSuccessResponse, parseJsonBody } from "@forge-ahead/triggers/webtrigger";

interface SeedRequest {
  readonly pairingId: string;
  readonly role: "source" | "destination";
}

function isSeedRequest(value: unknown): value is SeedRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SeedRequest).pairingId === "string" &&
    ["source", "destination"].includes((value as SeedRequest).role)
  );
}

export const seedSourcePairing = defineWebTrigger(async (request) => {
  const parseResult = parseJsonBody(request, isSeedRequest, {
    errorCode: "invalid-seed-request",
  });

  if (parseResult.isErr()) {
    return parseResult.error;
  }

  const seedRequest = parseResult.value;

  if (seedRequest.role !== "source") {
    return buildErrorCodeResponse(400, { error: "invalid-seed-role" });
  }

  // ... handler logic

  return buildSuccessResponse({ pairingId: seedRequest.pairingId });
});
```

## Non-goals

- Do not replace `buildErrorResponse`. Keep it for callers that want full
  Problem Details responses.
- Do not add zod/io-ts schema validation. A plain type guard keeps the helper
  dependency-free.
- Do not add async validation. Callers can await and then call the helper.
- Do not add a combined wrapper that also runs the handler. This increment is
  only about parsing and response building.

## Dependencies

- `@forge-ahead/errors` for `err`, `ok`, and `Result`.
- `@forge/api` for the existing `WebTriggerResponse` and `WebTriggerMethod`
  types.

## Risks / open questions

- Should `parseJsonBody` accept a generic `ErrorCodeResponseBody` instead of
  just an `errorCode` string? The proposed design uses the simplest common case
  but allows a custom `errorCode` and optional `detail` through the response
  builder.
- Should the default error code be `"invalid-request-body"` or `"bad-request"`?
  Either is fine; the default should be documented.
- Should the helper log the parse failure? Not in this increment. Logging is
  the caller's responsibility.
