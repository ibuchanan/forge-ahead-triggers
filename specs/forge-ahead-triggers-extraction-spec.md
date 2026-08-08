# Specification: `@forge-ahead/triggers`

## Problem Statement

Forge applications receive several trigger families through a common invocation model, but their public contracts are easy to model imprecisely. Web trigger responses are particularly error-prone: Forge requires every header value to be an array of strings, yet a scalar response header can otherwise reach runtime before failing.

`@forge-ahead/triggers` is a new, private TypeScript package that gives Forge application authors narrow, accurate trigger contracts and focused response utilities. It is inspired by prior Forge application code and current Forge platform documentation, but it has no source-compatibility obligation to an older package and must not preserve legacy names or behavior solely for compatibility.

## Solution

Build this repository as the standalone `@forge-ahead/triggers` package. It provides:

- shared, minimal contracts for Forge trigger invocations;
- independently importable lifecycle, product, scheduled, and web-trigger contracts;
- a type-safe web-trigger response surface that prevents scalar header values when handlers are declared through `defineWebTrigger`;
- pure response and header-extraction utilities;
- an optional, caller-owned invocation-observation wrapper; and
- consumer-level type validation against the built package exports.

The package is not a generic HTTP framework, a trigger router, an event-dispatch framework, or a logging implementation.

## User Stories

1. As a Forge application author, I want a common trigger-handler type so that trigger functions receive consistent event and invocation-context parameters.
2. As a Forge application author, I want dedicated lifecycle contracts so that installation and upgrade events can be handled and narrowed safely.
3. As a Forge application author, I want explicit product and scheduled trigger handler contracts so that I can describe those functions without importing unrelated web-trigger behavior.
4. As a web-trigger author, I want handlers declared through `defineWebTrigger` to reject scalar response headers at compile time so that I catch the Forge header-shape error before deployment.
5. As a web-trigger author, I want the complete documented request-path information, including `userPath`, so that a handler can make path-based domain decisions without parsing Forge’s trigger prefix.
6. As a web-trigger author, I want a JSON success-response helper so that ordinary domain results are serialized with Forge-compatible array-valued headers.
7. As a web-trigger author, I want a dedicated empty-success helper so that I can return a correct `204 No Content` response without accidentally including a body.
8. As a web-trigger author, I want Problem Details errors translated into Forge responses so that my domain error representation reaches callers consistently.
9. As a privacy-conscious application author, I want client-header extraction to use a fixed allowlist so that infrastructure and unapproved request headers are not propagated by default.
10. As an application author, I want header matching to follow HTTP’s case-insensitive semantics so that allowed headers are not missed due to casing differences.
11. As an application author, I want extracted header values copied into a fresh result so that downstream code cannot mutate the inbound Forge event.
12. As an application author, I want to use the standard Forge logging package when appropriate without being forced to use its logger implementation.
13. As an application author with another logging system, I want to supply a structurally compatible logger or adapter so that this package does not own logging transport, configuration, or policy.
14. As a package consumer, I want imports to work from the documented root and subpaths so that generated declarations and export wiring are reliable.
15. As a package maintainer, I want tests to exercise public seams and the built package so that refactors do not accidentally weaken consumer safety.

## Implementation Decisions

### Package and distribution

- This repository root is the package. Do not introduce a `packages/` directory or npm workspace layer.
- The package remains private for its first release. “Published” means packaged and consumable through the approved private distribution channel; it does not imply public npm publication.
- Public imports are limited to the package root plus `/lifecycle`, `/product`, `/scheduled`, and `/webtrigger` subpaths.
- Do not add public imports for internal modules.
- The package is a new library. Do not add legacy aliases, compatibility shims, or migration behavior merely to mirror older code.
- Remove all references to `forge-bootstrap`; it is not a design authority or source of behavior for this package.

### Shared invocation contracts

- Export JSON primitives and shared event contracts from the root entry point.
- Trigger handlers accept an event and a minimal `InvocationContext`.
- `InvocationContext` contains `installContext` and may expose `principal` and `workspaceId`. It intentionally does not model the richer output of Forge’s separate app-context runtime API.
- `TriggerHandler` is common vocabulary only. Each trigger family selects its own result type; do not reintroduce a broad cross-family response union.

### Trigger-family contracts

- Lifecycle contracts expose installation and upgrade event shapes, including their distinct installer and upgrader account identifiers. Omit sample runtime handlers.
- Product and scheduled contracts stay intentionally small until a demonstrated family-specific requirement exists.
- No trigger registration, manifest wiring, retry policy, idempotency framework, authorization framework, or event-filtering framework belongs in this package.

### Invocation observation and sans-I/O boundary

- The root entry point exports `withInvocationLogging` and a minimal structural `InvocationLogger` capability with only `forgeInvocation(event, message?, options?)`.
- The wrapper calls the supplied capability exactly once before the wrapped handler executes, forwards the original event and context unchanged, and preserves synchronous values, thrown errors, promises, and rejected promises unchanged.
- The package must not create a logger, inspect environment configuration, configure a logging transport, log request bodies or headers itself, catch or translate handler errors, or own error policy.
- `@forge-ahead/logging` is a type-only integration. Its standard logger must be structurally compatible, while callers remain free to pass another compatible logger or adapter.

### Web-trigger contracts and naming

- Use `WebTrigger` casing for public TypeScript symbols: `WebTriggerEvent`, `WebTriggerResponse`, `WebTriggerHandler`, and `defineWebTrigger`.
- Keep the package import subpath as `/webtrigger`.
- `WebTriggerEvent` includes method, headers, query parameters, optional body, full path, required `userPath`, and optional invoked-function metadata.
- Web-trigger response headers and request/query header maps use `Record<string, string[]>`. A scalar header value is invalid.
- `defineWebTrigger` is a runtime identity adapter whose purpose is contextual TypeScript checking of unannotated handlers.

### Web-trigger response builders

- `buildSuccessResponse` accepts an optional `JSONValue`. With no value, it serializes the default `{ "message": "OK" }`; with a supplied value, it serializes that exact JSON value. It produces an `application/json` response with array-valued headers.
- `buildEmptySuccessResponse` is a dedicated, zero-argument helper that produces exactly `204 No Content`, no body, and no content-type header.
- `buildSuccessResponse` is for JSON-bearing successes. Callers construct `WebTriggerResponse` directly for unusual empty or non-JSON success responses.
- `buildErrorResponse` normalizes unknown errors with `toProblemDetails` from `@forge-ahead/errors` and returns an `application/problem+json` response.
- Error-status precedence is: an explicitly supplied status wins; otherwise preserve a valid input `ProblemDetails.status`; otherwise use `500`.
- Error `statusText` uses a non-empty Problem Details title when available and otherwise uses a deterministic fallback for the resolved status.
- Response builders do not validate arbitrary status codes or generate generic HTTP reason phrases. This package is not a generic HTTP abstraction.

### Client-header extraction

- `extractClientHeaders` has a fixed allowlist: `user-agent`, `atl-traceid`, `atl-edge-true-client-ip`, and `atl-edge-ip-tags`.
- Compare incoming header names case-insensitively and emit canonical lowercase keys.
- Return a fresh headers object and fresh string arrays.
- If input contains casing variants of the same allowed header, merge their values in encounter order under the canonical key.
- Do not expose unlisted headers or mutate the inbound event.

### Dependencies and package artifacts

- `@forge/api` supplies Forge method typing.
- `@forge-ahead/errors` is a runtime dependency for Problem Details normalization.
- `@forge-ahead/logging` is a type-only dependency for compatibility with its invocation-log options.
- Use type-only imports whenever no runtime value is required.
- Do not copy upstream source or add local fallback implementations when an upstream package cannot resolve.
- Any Git- or registry-supplied upstream dependency must expose the built artifacts declared by its package exports. Missing upstream `dist` artifacts are a prerequisite failure to resolve upstream, not a reason to weaken this package’s contracts.

## Testing Decisions

- Use red-green-refactor development. Implement one narrow vertical slice at a time: write a failing public-seam test or compiler fixture, run the narrow check, implement the minimum behavior, rerun, then refactor only when green.
- Tests cross only documented public imports and public functions. Do not test internal module layout, private helper calls, or bundler implementation details.
- Tests are deterministic, network-free, time-free, order-independent, and use minimal event fixtures.
- Type-level tests verify shared contracts, lifecycle narrowing, product and scheduled handlers, and the scalar-header regression.
- Runtime tests cover synchronous and asynchronous invocation observation, unchanged error propagation, success and empty-success responses, error conversion/status precedence, and client-header extraction.
- The scalar-header regression is mandatory and uses `@ts-expect-error` directly on an unannotated `defineWebTrigger` handler that returns a scalar header value. A valid array-valued equivalent must also typecheck.
- Built-consumer typechecking is mandatory. After building, a consumer fixture imports only the documented package root and subpaths, including `/webtrigger`, to verify declarations and export-map wiring as consumers receive them.
- Validate focused test, typecheck, lint, format, build, and built-consumer checks before the appropriate aggregate repository check. Report commands actually run and distinguish pre-existing failures from regressions.

## Out of Scope

- Generic HTTP request/response abstractions.
- Forge manifest changes, deployment behavior, trigger registrations, or consumer migrations.
- Compatibility aliases for prior packages or applications.
- Runtime logging configuration, logger creation, Pino-specific APIs, or logging transports.
- Retry, idempotency, event dispatch, authorization, product-event filtering, or routing frameworks.
- Replacing Forge SDK types wholesale.
- Copying placeholder application handlers into the package.
- Working around unresolved upstream package artifacts with copied code, `any`, unsafe assertions, or local substitute contracts.

## Further Notes

- The primary safety goal is to make the Forge array-valued response-header rule difficult to misuse at the handler declaration site.
- The package follows a sans-I/O design: response construction and header extraction are pure value transformations; logging remains an optional side effect at the invocation boundary and is owned by the caller.
- Upstream Git-package artifact investigation is deliberately deferred. Implementation may proceed only once declared upstream exports are consumable in the installed dependency tree.
- Deliver implementation, tests, package metadata/exports, README updates, and a short summary of completed TDD slices, validations, and intentionally excluded adoption work.
