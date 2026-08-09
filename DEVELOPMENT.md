# Development guide

This guide covers the contributor workflow for `@forge-ahead/triggers`. For
package purpose, public imports, and a web-trigger example, start with the
[README](README.md).

## Prerequisites

- Node.js 22 or later (`.nvmrc` pins the major version).
- npm, using the committed `package-lock.json`.
- Git for repository hooks and release preparation.
- `git-cliff` only when generating a changelog or using the release helper.

Install the locked dependency tree:

```sh
npm ci
```

`prepare` builds the package after installation and attempts to install
Lefthook hooks. The hook-install step is allowed to fail so dependency
installation still completes in environments where Git hooks are unavailable.

## Daily workflow

Use the narrowest check for the change you are making:

```sh
# Rebuild source and declaration artifacts on changes.
npm run dev

# Run the runtime test suite once.
npm run test

# Type-check source and non-consumer contract fixtures.
npm run typecheck

# Check linting and formatting.
npm run lint:check
npm run format:check
```

To apply formatting or lint fixes locally:

```sh
npm run format
npm run lint:fix
```

## Full validation

A consumer typecheck must run against fresh package artifacts, so build before
running it:

```sh
npm run build
npm run typecheck
npm run lint:check
npm run format:check
npm run test
npm run test:consumer
```

`npm run test:consumer` validates the generated declaration files and export
map from both ESM and CommonJS fixtures. It imports only the documented package
root and trigger-family subpaths, so it must not be used before a successful
build.

`npm run check` runs the Lefthook pre-push checks (`lint:check`,
`format:check`, and `test`). It does not build or run `test:consumer`; use the
full validation sequence when public exports or declaration output may change.

For coverage output, run:

```sh
npm run test:coverage
```

## Repository layout

```text
src/
  index.ts        Public root exports: shared contracts and logging wrapper.
  core.ts         Internal shared trigger and JSON contracts.
  logging.ts      Caller-owned invocation-observation boundary.
  lifecycle.ts    Lifecycle event and handler contracts.
  product.ts      Product-trigger contracts.
  scheduled.ts    Scheduled-trigger contracts.
  webtrigger.ts   Web-trigger contracts and pure response/header utilities.
test/
  *.test.ts       Runtime behavior tests.
  *-contracts.ts  Source-level TypeScript contract fixtures.
  consumer/       Built-package ESM and CommonJS consumer fixtures.
specs/            API scope, constraints, and acceptance decisions.
scripts/          Release-preparation helper.
```

The published artifact boundary is intentionally small. `package.json` exposes
only the root package plus `/lifecycle`, `/product`, `/scheduled`, and
`/webtrigger`; do not add imports for internal source modules to documentation
or consumer fixtures.

## Change expectations

- Keep trigger-family contracts narrow; this package does not own trigger
  registration, routing, retries, authorization, or event filtering.
- Preserve Forge's `Record<string, string[]>` response-header shape for web
  triggers. New behavior must not weaken the scalar-header type regression.
- Keep response building and client-header extraction pure. Invocation logging
  remains optional and caller-owned.
- Add public-seam runtime or type tests for new behavior, then run the focused
  check before the full validation sequence.
- Follow the contribution requirements in [CONTRIBUTING.md](CONTRIBUTING.md).

## Cleaning generated output

```sh
npm run clean
```

This removes both `node_modules` and `dist`. Run `npm ci` again before further
checks.

## Changelog and releases

Generate an unreleased changelog section with:

```sh
npm run changelog
```

`npm run release:prepare` is a maintainer workflow. It calculates the next
version with `git-cliff`, updates `package.json` and `CHANGELOG.md`, creates a
release commit and tag, and pushes `main` plus that tag. Run it only when you
intend to perform those Git writes and have the required repository access.
