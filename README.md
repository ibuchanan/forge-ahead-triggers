# @forge-ahead/triggers

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

A TypeScript package for precise Atlassian Forge trigger contracts and focused
web-trigger response utilities.

> **Status: scaffolded, not implemented.** This repository has been reset from
> `@forge-ahead/errors` and is ready for test-driven implementation. It does not
> yet expose the trigger types or response builders described below, so it must
> not be consumed yet.

## Purpose

The package will provide small, independently importable contracts for Forge
lifecycle, product, scheduled, and web triggers. Its primary safety goal is to
make Forge web-trigger response headers type-safe: every response header value
must be a `string[]`, never a scalar string.

The design and delivery constraints are recorded in the
[trigger extraction specification](specs/forge-ahead-triggers-extraction-spec.md).

## Planned public imports

Once implemented, the package will expose only:

```ts
@forge-ahead/triggers
@forge-ahead/triggers/lifecycle
@forge-ahead/triggers/product
@forge-ahead/triggers/scheduled
@forge-ahead/triggers/webtrigger
```

The root entry point will contain shared invocation contracts and opt-in
invocation logging. Trigger-family contracts and web-trigger response utilities
will live at their dedicated subpaths.

## Development

Use Node 22 or newer with npm:

```sh
npm install
npm run build
npm run typecheck
npm run lint:check
npm run format:check
npm run test
```

`npm run test` currently permits an empty test suite while the package is a
scaffold. The first implementation slice must replace that temporary allowance
with public-seam tests, following the TDD sequence in the specification.

## Repository layout

- `src/core.ts` — shared invocation contracts (planned)
- `src/logging.ts` — opt-in invocation logging wrapper (planned)
- `src/lifecycle.ts` — lifecycle trigger contracts (planned)
- `src/product.ts` — product trigger contracts (planned)
- `src/scheduled.ts` — scheduled trigger contracts (planned)
- `src/webtrigger.ts` — web-trigger contracts and response utilities (planned)
- `specs/` — implementation specification and acceptance criteria

## Dependencies to add during implementation

The implementation will add and use `@forge/api`, `@forge-ahead/errors`, and
`@forge-ahead/logging` through npm’s package-management workflow. Their precise
source and compatible versions should be selected alongside the first TDD
slice; no copied dependency has been retained.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
