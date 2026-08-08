# @forge-ahead/triggers

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

Typed Forge trigger contracts and focused web-trigger response utilities.

> **Status: private package.** Public contracts, built artifacts, and the
> consumer-validation suite are maintained as part of this package.

## Why this package exists

Forge web-trigger response headers must map each header name to an array of
strings. A scalar value such as `"Content-Type": "application/json"` can fail
only at runtime without a contextual TypeScript contract.

This package will provide small, independently importable contracts for
lifecycle, product, scheduled, and web triggers. Its central safety goal is to
make that scalar-header mistake fail during typechecking when a handler is
created with `defineWebTrigger`.

## Planned public imports

```ts
@forge-ahead/triggers
@forge-ahead/triggers/lifecycle
@forge-ahead/triggers/product
@forge-ahead/triggers/scheduled
@forge-ahead/triggers/webtrigger
```

The root entry point will contain shared invocation contracts and the optional
`withInvocationLogging` wrapper. Trigger-family contracts and web-trigger
utilities will live at their dedicated subpaths.

## Planned web-trigger surface

The web-trigger entry point will expose `WebTriggerEvent`,
`WebTriggerResponse`, `WebTriggerHandler`, and `defineWebTrigger`, plus:

- `buildSuccessResponse` for JSON-valued success responses;
- `buildEmptySuccessResponse` for a fixed `204 No Content` response;
- `buildErrorResponse` for Problem Details error responses; and
- `extractClientHeaders` for a narrow, allowlisted client-header view.

Success responses will use `application/json`; Problem Details error responses
will use `application/problem+json`. Every Forge response-header value remains
a `string[]`.

`WebTriggerEvent` will include both the full Forge request path and `userPath`,
the caller-controlled path suffix after the trigger identifier.

## Logging boundary

`withInvocationLogging` will accept a caller-supplied structural logger with a
single `forgeInvocation(...)` capability. It will not create or configure a
logger, read environment settings, couple callers to Pino, inspect request
bodies or headers, or alter handler errors and promises.

The standard `@forge-ahead/logging` logger will be compatible, but applications
may supply their own compatible logger or adapter.

## Development

Use Bun with a Node.js 22-compatible runtime:

```sh
bun install
bun run build
bun run typecheck
bun run lint:check
bun run format:check
bun run test
bun run test:consumer
```

The package also requires a built-consumer typecheck that imports only its
documented exports. This verifies the generated declarations and export map,
including the scalar-header regression fixture.

### Implementation prerequisite

`@forge-ahead/errors` and `@forge-ahead/logging` are private upstream
packages. They must resolve the built artifacts declared by their package
exports before this package can import their runtime values or types. Do not
copy their source or add local fallbacks if those artifacts are unavailable.

## Repository layout

- `src/core.ts` — shared invocation contracts
- `src/logging.ts` — opt-in invocation-observation wrapper
- `src/lifecycle.ts` — lifecycle trigger contracts
- `src/product.ts` — product trigger contracts
- `src/scheduled.ts` — scheduled trigger contracts
- `src/webtrigger.ts` — web-trigger contracts and response utilities
- `specs/` — design decisions and acceptance criteria

See the [trigger package specification](specs/forge-ahead-triggers-extraction-spec.md)
for the complete API, testing, and package-boundary decisions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
