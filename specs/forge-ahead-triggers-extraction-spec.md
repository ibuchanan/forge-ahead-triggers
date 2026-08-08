# Specification: extract `@forge-ahead/triggers`

## Purpose

Create a new TypeScript package, `@forge-ahead/triggers`, by **reimplementing and strengthening** the Forge trigger/event contracts currently embedded in `packages/forge-ahead`.

This is not a mechanical file move. The package must establish small public seams that:

1. give Forge app authors accurate, contextual types for trigger handlers;
2. make the Forge web-trigger response contract difficult to misuse—especially its required `Record<string, string[]>` header shape;
3. use `@forge-ahead/errors` and `@forge-ahead/logging` deliberately as upstream dependencies;
4. define a complete, independent public interface for future consumers; and
5. earn its package boundary through reusable protocol and invocation behavior, not a thin re-export layer.

The immediate empirical motivation is a real Forge web-trigger failure: an application returned a scalar header value such as `"Content-Type": "application/json"`, but Forge requires each header value to be an array of strings. Forge then failed at runtime rather than TypeScript reporting the error during development.

## Scope

### In scope

- New package: `packages/triggers`, published as `@forge-ahead/triggers`.
- Core Forge event/context types currently in `packages/forge-ahead/src/forge/function.ts`.
- Trigger-family contracts currently in:
  - `packages/forge-ahead/src/forge/triggers/lifecycle.ts`
  - `packages/forge-ahead/src/forge/triggers/product.ts`
  - `packages/forge-ahead/src/forge/triggers/scheduled.ts`
  - `packages/forge-ahead/src/forge/triggers/webtrigger.ts`
- Web-trigger response builders and client-header extraction.
- An opt-in invocation-logging wrapper that uses the logging package without introducing global side effects.
- Tests designed and implemented via TDD, including compile-time regression tests.

### Explicitly out of scope

- A generic HTTP package. Forge API routes use `Record<string, string>` headers, while Forge web triggers use `Record<string, string[]>`. Combining them would obscure the platform distinction that caused the incident.
- New retry, idempotency, event-dispatch, authorization, or product-event filtering frameworks.
- Changing Forge manifest wiring, deploy behavior, or trigger registrations.
- Migrating existing application consumers or adding compatibility shims in this change.
- Replacing `@forge/api` types wholesale.
- Copying placeholder runtime handlers such as `install`, `heartbeat`, or `productEventHandler` into the new package. The package provides contracts and utilities, not application handlers.

## Evidence and design decision

The package boundary is justified by two existing adapters:

- `forge-ahead` has shared Forge invocation types plus trigger-specific contracts.
- `forge-bootstrap/src/forge/trigger.ts` independently models web-trigger headers, parameters, response envelopes, and JSON response construction.

That duplicate protocol shows a real seam. However, the trigger families do **not** currently share enough runtime behavior to justify a universal middleware framework. The common package should therefore be shaped as:

- a small root interface for Forge invocation and handler typing;
- independently importable trigger-family subpaths;
- a dedicated web-trigger subpath for its special transport contract;
- one optional observability wrapper with precisely defined behavior.

## Package layout and public imports

Use a tsdown-built ESM package, following the conventions of `packages/errors` and `packages/logging`.

```text
packages/triggers/
  src/
    index.ts
    core.ts
    logging.ts
    lifecycle.ts
    product.ts
    scheduled.ts
    webtrigger.ts
  test/
    core.test.ts
    logging.test.ts
    lifecycle.test.ts
    product.test.ts
    scheduled.test.ts
    webtrigger.test.ts
  package.json
  tsconfig.json
  tsdown.config.ts
  vitest.config.ts
  README.md
```

Expose only these public paths:

```ts
@forge-ahead/triggers
@forge-ahead/triggers/lifecycle
@forge-ahead/triggers/product
@forge-ahead/triggers/scheduled
@forge-ahead/triggers/webtrigger
```

The root export contains the shared invocation types and the opt-in logging wrapper. Family-specific types and utilities live only at their subpaths. Do not make consumers import from internal `src/*` paths.

## Dependencies

### Required runtime/package dependencies

- `@forge/api` — retain `WebTriggerMethod` typing rather than duplicating or weakening the Forge method type.
- `@forge-ahead/errors` — use the `ProblemDetails` contract and `toProblemDetails()` conversion for web-trigger error responses.
- `@forge-ahead/logging` — use its invocation logging contract for the opt-in wrapper described below.

Use the repository’s current dependency-source convention for extracted packages. Do not manually edit `package-lock.json`; update dependencies using the repository’s package-manager workflow.

### Dependency constraints

- The package must not depend on `forge-ahead`. Existing consumers may adopt it independently; this specification does not define or require a compatibility direction.
- The package must not create a logger. The caller supplies one.
- The package must not depend on Forge storage, fetch, KVS, JWT, Rovo, manifest parsing, API-route code, or `forge-ahead` type modules. It owns the small JSON and identifier primitives needed by its public declarations.
- Use type-only imports where a runtime import is not needed.

## Public interface

The final names may differ only when a better name is justified in the implementation notes and preserves the same responsibilities. Do not broaden the surface without a demonstrated caller need.

### Root: shared Forge invocation contract

```ts
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

export interface IdentifiedObject {
  id: string;
}

export interface EventContext {
  cloudId: string;
  moduleKey: string;
  userAccess?: { enabled: boolean };
  [key: string]: JSONValue | undefined;
}

export interface CommonEvent {
  context: EventContext;
  contextToken?: string;
}

export interface InstallContext {
  installContext: string;
  installation?: {
    ari: { installationId: string };
    contexts: Array<{ cloudId: string; workspaceId: string }>;
  };
}

export type TriggerHandler<TEvent extends CommonEvent, TResult = void> = (
  event: TEvent,
  context: InstallContext,
) => TResult | Promise<TResult>;
```

`TriggerHandler` is the common vocabulary only. Do not use a broad union such as the existing `ForgeFunctionResponse` as the result constraint. Individual trigger modules must select their own result type.

Do not include the existing broad `ForgeFunction` / `ForgeFunctionResponse` compatibility shapes in the new package. They are not part of this library's public interface.

### Root: opt-in invocation logging

Provide one wrapper with a narrow, observable behavior:

```ts
export interface InvocationLogger {
  forgeInvocation(
    event: unknown,
    message?: string,
    options?: ForgeInvocationLogOptions,
  ): void;
}

export interface InvocationLoggingOptions {
  logger: InvocationLogger;
  message?: string;
  options?: ForgeInvocationLogOptions;
}

export function withInvocationLogging<
  TEvent extends CommonEvent,
  TResult,
>(
  handler: TriggerHandler<TEvent, TResult>,
  logging: InvocationLoggingOptions,
): TriggerHandler<TEvent, TResult>;
```

Required behavior:

1. Call `logger.forgeInvocation(event, message, options)` exactly once before invoking the wrapped handler.
2. Pass the original event and installation context to the wrapped handler unchanged.
3. Return the handler’s synchronous value or promise unchanged in meaning.
4. Do not catch, translate, log, or suppress exceptions/rejections. Error policy belongs to the calling handler unless a later, separately specified wrapper is added.
5. Do not log request bodies or headers directly; delegate to `@forge-ahead/logging`, whose Forge event policy summarizes these fields safely.

Use the narrow `InvocationLogger` interface rather than accepting a concrete Pino logger. This keeps the external seam testable with a small fake while remaining structurally compatible with `ForgeLogger` from `@forge-ahead/logging`.

### Lifecycle subpath

Preserve the event-domain contracts, but omit the sample `install` implementation.

```ts
export interface App extends IdentifiedObject {
  version: string;
  name?: string;
  ownerAccountId?: string;
}

export interface InstallationEvent extends CommonEvent, IdentifiedObject {
  app: App;
  environment?: IdentifiedObject;
  eventType?: string;
  selfGenerated?: boolean;
  permissions?: { scopes: string[] };
  installerAccountId: string;
}

export interface UpgradeEvent extends CommonEvent, IdentifiedObject {
  app: App;
  environment?: IdentifiedObject;
  eventType?: string;
  selfGenerated?: boolean;
  permissions?: { scopes: string[] };
  upgraderAccountId: string;
}

export type LifecycleEvent = InstallationEvent | UpgradeEvent;
export type LifecycleHandler = TriggerHandler<LifecycleEvent, void>;
```

If implementation factors the repeated lifecycle properties into a non-exported or exported `CommonLifecycleEvent`, it must not change the resulting `InstallationEvent` and `UpgradeEvent` structural contracts.

### Product and scheduled subpaths

Keep these intentionally small until there is real family-specific behavior.

```ts
export type ProductEvent = CommonEvent;
export type ProductTriggerHandler = TriggerHandler<ProductEvent, void>;

export type ScheduledEvent = CommonEvent;
export type ScheduledHandler = TriggerHandler<ScheduledEvent, void>;
```

Use the clearer names above in the new package. Do not add legacy aliases solely for source compatibility.

### Web-trigger subpath

This is the primary functional surface.

```ts
export type Headers = Record<string, string[]>;
export type Parameters = Record<string, string[]>;

export interface WebtriggerEvent extends CommonEvent {
  method: WebTriggerMethod;
  headers: Headers;
  queryParameters: Parameters;
  body?: string;
  path: string;
  call?: { functionKey: string };
}

export interface WebtriggerResponse {
  body?: string;
  headers: Headers;
  statusCode: number;
  statusText: string;
}

export type WebtriggerHandler = TriggerHandler<
  WebtriggerEvent,
  WebtriggerResponse
>;

export function defineWebtrigger(
  handler: WebtriggerHandler,
): WebtriggerHandler;

export function extractClientHeaders(
  request: Pick<WebtriggerEvent, "headers">,
): Headers;

export function buildSuccessResponse(
  message?: object,
  statusCode?: number,
  statusText?: string,
): WebtriggerResponse;

export function buildErrorResponse(
  error: unknown,
  statusCode?: number,
): WebtriggerResponse;
```

#### Web-trigger invariants

- **Every response header value is a `string[]`.** A scalar `string` must be rejected by TypeScript at the `defineWebtrigger` call site.
- `statusCode` and `statusText` are required.
- `body` is optional to support 204 responses.
- `buildSuccessResponse()` defaults to:
  - body: `JSON.stringify({ message: "OK" })`
  - headers: `{ "Content-Type": ["application/json"] }`
  - status: `200`, `"OK"`
- `buildErrorResponse()` must call `toProblemDetails(error, statusCode ?? 500)`. If the input already is a `ProblemDetails`, it must be retained rather than wrapped again.
- To preserve the current compatibility behavior, error responses use `{ "Content-Type": ["application/json"] }` in this extraction. Changing to `application/problem+json` is a deliberate behavioral/API change and requires a separate decision and migration note.
- `extractClientHeaders()` returns only these exact, case-sensitive Forge event keys, retaining their source arrays without mutation:
  - `user-agent`
  - `atl-traceid`
  - `atl-edge-true-client-ip`
  - `atl-edge-ip-tags`

`defineWebtrigger()` is an identity adapter at runtime. Its purpose is contextual typing: a normal, unannotated exported handler must still have its inferred returned response checked against `WebtriggerResponse`.

## Test seams and TDD rules

The agent must use red-green-refactor cycles. Do not copy source files first and backfill tests later.

### Confirmed public seams

Tests may cross only these public seams:

1. imports from the documented package root and subpaths;
2. `withInvocationLogging()`;
3. trigger-family event and handler types, tested with TypeScript compiler assertions where appropriate;
4. `defineWebtrigger()`;
5. `extractClientHeaders()`;
6. `buildSuccessResponse()`;
7. `buildErrorResponse()`.

Do not test internal module layout, helper call order, package-private functions, or tsdown configuration implementation details.

### Required vertical TDD slices

Implement and validate these slices in order. For each slice: write one failing test, run the narrow test/typecheck, implement the minimum code, rerun the same check, then refactor only when green.

1. **Core type availability**
   - Verify root exports compile for a minimal `CommonEvent`, `InstallContext`, and `TriggerHandler`.
   - Verify handlers receive correctly typed event/context parameters.

2. **Lifecycle discriminating use**
   - Verify `LifecycleEvent` can be narrowed using `"installerAccountId" in event` and accesses the correct account identifier.
   - Verify an installation-shaped event and upgrade-shaped event both satisfy the public contract.

3. **Scheduled and product contracts**
   - Verify their handlers accept the shared event/context shape and resolve `void`.
   - Do not test placeholder handlers because none should be exported.

4. **Logging wrapper—synchronous result**
   - With a fake `InvocationLogger`, verify one invocation log is emitted before a synchronous handler runs.
   - Verify the wrapper returns the original result.

5. **Logging wrapper—async and failure behavior**
   - Verify an async handler resolves to its original value.
   - Verify a thrown error and a rejected promise propagate unchanged; the wrapper must not swallow or convert them.
   - Verify logging is still exactly once per invocation.

6. **Web-trigger success response**
   - Verify defaults and custom body/status/statusText.
   - Verify JSON serialization uses known expected literals, not values recomputed by the test.

7. **Web-trigger error response**
   - Pass a `ProblemDetails` created through `StandardError` and verify the response body/status/statusText preserve it.
   - Pass a normal `Error` and verify `toProblemDetails` creates the default 500 response.
   - Pass a normal `Error` with an explicit status and verify that status is used.

8. **Client-header extraction**
   - Verify all four allowed headers are retained with arrays intact.
   - Verify infrastructure/unlisted headers are excluded.
   - Verify an event with no allowed headers yields `{}`.

9. **The scalar-header regression (compiler seam)**
   - Add a typecheck fixture using `defineWebtrigger()` with no explicit handler return annotation.
   - Place `@ts-expect-error` directly on the invalid declaration and return:

     ```ts
     // @ts-expect-error Forge webtrigger response header values are string arrays.
     defineWebtrigger(() => ({
       headers: { "Content-Type": "application/json" },
       statusCode: 200,
       statusText: "OK",
     }));
     ```

   - A valid equivalent using `["application/json"]` must typecheck.
   - The compiler must fail if the expected error disappears, so do not use a comment-only or runtime-only test for this requirement.

10. **Public export integration**
    - Import each documented subpath exactly as a consumer would.
    - Build the package and typecheck a small consumer fixture against built/public export configuration when practical.

### Test-quality requirements

- Tests must be deterministic, network-free, time-free, and order-independent.
- Use minimal event fixtures: include only fields needed for the scenario.
- Tests must assert externally meaningful behavior, not duplicate internal algorithms.
- The compiler regression fixture is required because runtime tests cannot demonstrate TypeScript’s contextual checking.
- Keep fixtures local to the package; do not import `forge-ahead` types into the new package tests.

## Implementation plan

1. Scaffold `packages/triggers` to match the extracted package conventions:
   - ESM, tsdown, Vitest, Biome, strict TypeScript, Apache-2.0 metadata.
   - Node engine and tool versions consistent with the extracted packages and root policy.
2. Add exports and build entries for every documented subpath.
3. Complete the TDD slices above before considering any work outside `packages/triggers`.
4. Run package-local test, typecheck, lint, formatting, and build checks.
5. Do not modify `packages/forge-ahead`, `packages/forge-bootstrap`, or application consumers as part of this specification. Their owners may independently choose whether and how to adopt the new package.

## Acceptance criteria

The work is complete only when all of the following are true:

- [ ] `packages/triggers` exists and is published/configured as `@forge-ahead/triggers`.
- [ ] It exposes the documented root and subpath interfaces through package exports.
- [ ] `@forge-ahead/errors` is used for web-trigger error normalization through `toProblemDetails`.
- [ ] `@forge-ahead/logging` is used through the opt-in invocation logging contract; there is no implicit logger creation or direct body/header logging.
- [ ] A scalar web-trigger response header is rejected by TypeScript when the handler is declared through `defineWebtrigger`, even without an explicit return type.
- [ ] Array-valued headers remain accepted.
- [ ] Existing behavior of success responses, error responses, and client-header extraction is preserved unless a change is documented and separately approved.
- [ ] This work does not require changes to `forge-ahead`, `forge-bootstrap`, or any application consumer.
- [ ] No package depends on `forge-ahead` from the new triggers package.
- [ ] No generic HTTP abstraction is introduced.
- [ ] The new test suite is public-seam-focused, deterministic, and includes the required compiler fixture.
- [ ] Focused package checks pass, followed by the appropriate workspace-level validation.

## Validation commands

Use the repository’s npm workspace conventions and its approved runtime/tooling policy. Run focused package checks first, then an appropriate workspace-level check after the new package is green.

At minimum, validate:

```text
triggers: test
triggers: typecheck
triggers: lint:check
triggers: format:check
triggers: build
workspace: relevant aggregate check
```

Report commands actually run and distinguish any unrelated pre-existing failures from regressions introduced by the extraction.

## Non-goals for the coding agent

Do not:

- perform a blind copy/paste of trigger files;
- add speculative trigger middleware;
- add a runtime dependency merely because an interface can be type-only;
- widen web-trigger headers to `string | string[]` for convenience;
- use `any` or an unchecked type assertion to bypass the scalar-header regression;
- make `defineWebtrigger` return a different handler or alter invocation behavior;
- silently change the specified error media type;
- modify `forge-ahead`, `forge-bootstrap`, or application consumers to force adoption.

## Deliverables

1. `packages/triggers` implementation, tests, package metadata, exports, and README.
2. A short implementation summary describing:
   - each TDD slice completed;
   - public exports added;
   - use of errors and logging;
   - validation run;
   - intentionally excluded adoption or migration work.
