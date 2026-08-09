# @forge-ahead/triggers

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

TypeScript contracts and small, focused utilities for Atlassian Forge lifecycle,
product, scheduled, and web triggers.

> **Status: private package.** The package is built and validated for ESM and
> CommonJS consumers, but it is not published to the public npm registry.

## What it provides

- Minimal shared trigger contracts and invocation context at the package root.
- Dedicated contracts for lifecycle, product, and scheduled triggers.
- A `defineWebTrigger` adapter that contextually type-checks Forge's required
  array-valued response headers.
- Pure helpers for JSON successes, empty successes, Problem Details errors, and
  allowlisted client-request headers.
- An opt-in `withInvocationLogging` wrapper that works with a caller-owned,
  structurally compatible logger.

This is not a trigger router, HTTP framework, event dispatcher, retry system,
or logging implementation.

## Usage

Import only the public root or trigger-family subpaths:

```ts
import { defineWebTrigger, buildSuccessResponse } from "@forge-ahead/triggers/webtrigger";

export const handler = defineWebTrigger((event) =>
  buildSuccessResponse({ path: event.userPath }),
);
```

`defineWebTrigger` keeps the handler's runtime value unchanged while checking
its return type. Forge web-trigger response headers must be string arrays:

```ts
import { defineWebTrigger } from "@forge-ahead/triggers/webtrigger";

const handler = defineWebTrigger(() => ({
  body: "ok",
  headers: {
    "content-type": ["text/plain"],
  },
  statusCode: 200,
}));
```

The following public imports are supported:

```text
@forge-ahead/triggers
@forge-ahead/triggers/lifecycle
@forge-ahead/triggers/product
@forge-ahead/triggers/scheduled
@forge-ahead/triggers/webtrigger
```

## Web-trigger utilities

The `/webtrigger` entry point exports `WebTriggerEvent`, `WebTriggerResponse`,
`WebTriggerHandler`, `defineWebTrigger`, and these helpers:

- `buildSuccessResponse(value?)` returns a JSON `200 OK` response. Without a
  value, its body is `{"message":"OK"}`.
- `buildEmptySuccessResponse()` returns exactly `204 No Content`, without a
  body or content-type header.
- `buildErrorResponse(error, status?)` converts an unknown error to a Problem
  Details response with `application/problem+json`; an explicit status takes
  precedence over a valid Problem Details status.
- `extractClientHeaders(headers)` returns fresh arrays for only these
  case-insensitively matched headers: `user-agent`, `atl-traceid`,
  `atl-edge-true-client-ip`, and `atl-edge-ip-tags`.

## Invocation logging

The root entry point exposes `withInvocationLogging` and the minimal
`InvocationLogger` interface. The wrapper calls `logger.forgeInvocation(event)`
exactly once before the handler and otherwise preserves the original return
value, promise, and thrown or rejected errors.

```ts
import { withInvocationLogging, type TriggerHandler } from "@forge-ahead/triggers";

const handler: TriggerHandler<{ orderId: string }> = (event) => {
  // Handle the invocation.
  return { orderId: event.orderId };
};

const observedHandler = withInvocationLogging(logger, handler);
```

The package does not create or configure a logger, inspect request bodies or
headers, or own error-handling policy.

## Development

This repository uses Node.js 22 or later and npm. For installation, local
checks, repository structure, and release workflow, see
[DEVELOPMENT.md](DEVELOPMENT.md).

## Further reading

- [Trigger package specification](specs/forge-ahead-triggers-extraction-spec.md)
  — API scope and design decisions.
- [Contributing guide](CONTRIBUTING.md) — contribution expectations and CLA.
- [Changelog](CHANGELOG.md) — release history.

## License

Apache-2.0. See [LICENSE](LICENSE).
