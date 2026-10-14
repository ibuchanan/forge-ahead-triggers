# Specification: `@forge-ahead/webtrigger-client`

Status: proposed design, 2026-09-08; not implemented.
Parent: [ecosystem architecture](connection-ecosystem.md).
Normative enhanced protocol: [receiver specification](webtrigger-auth.md).
Reference consumer: [reference implementation](connection-reference-implementation.md).

## 1. Purpose

Provide a small Node.js client-side request-preparation library for Forge
webtriggers. Remove the need for each sender to rediscover exact HMAC bytes,
header syntax, timestamp formatting, and envelope rules.

Support both an ordinary RFC-141 endpoint and our stricter enhanced endpoint.
A client does not need to adopt the connection lifecycle or receiver package.
Receiver-side Zod validation, including async refinements, imposes no requirement
for the sender to run Zod. The sender supplies JSON matching the documented
purpose contract; optional local domain validation remains caller-owned.
This SDK helps configurable senders; it does not make existing third-party
webhook producers implement a Forge-specific protocol.

Initial runtime target: Node.js 22+, including compatible Forge runtimes. This
is a proposed scope default. Browsers, edge runtimes, non-JavaScript SDKs, and
client-side custody of installation secrets are outside v1.

## 2. Package and dependencies

Standalone package with ESM/CommonJS exports and generated TypeScript declarations.
Use Node `crypto`; no Forge runtime, triggers, connections, Zod, logging transport,
HTTP client, retry library, or secret-manager dependency is required.

No shared protocol package initially. Follow the normative wire spec and its
versioned known-answer vectors. Do not import receiver implementation helpers
just to make round-trip tests pass.

## 3. Proposed interface

### `signWebTriggerRequest`

Low-level RFC-compatible signing, not enhanced admission policy.

Inputs:

- Exact serialized body string.
- Canonical base64 shared secret, decoded and validated before signing.
- Exact timestamp string, or explicit omission for a receiver that accepts the
  RFC body-only variant. Timestamp omission must be explicit in the input type,
  not an accidental undefined default.

Output: `{ body, headers }`, with `Record<string, string>` headers usable with
ordinary Fetch. Return the exact body unchanged. Add `x-webtrigger-signature`
and, when supplied, `x-webtrigger-timestamp`. Do not add or overwrite application
media-type policy in this low-level helper.

Sign body-only or `<timestamp>.<body>` using `createHmac('sha256', decodedKey)` as
specified by RFC-141. Do not parse or reformat the timestamp before signing.
The low-level helper checks bounded header-safe input; the enhanced preparation
operation enforces the canonical timestamp subset and five-property envelope.

### `prepareConnectionRequest`

Recommended high-level enhanced request preparation.

Inputs:

- Receiver-issued connection ID and operation audience.
- JSON payload and canonical base64 secret.
- Optional test inputs for current epoch milliseconds and a 16-byte nonce;
  production defaults use the system clock and `crypto.randomBytes(16)`.

Behavior:

1. Validate required metadata and JSON payload before producing a request.
2. Generate timestamp and nonce once for this attempt, or use explicit test values.
3. Build exactly the `forge-ahead-connection-v1` envelope from the receiver spec.
4. Serialize it once and enforce the enhanced UTF-8/body limits.
5. Sign with the exact timestamp string and serialized body.
6. Return `{ method: 'POST', body, headers }` with RFC authentication headers
   and `content-type: application/json`.

The deterministic signing operation remains available for injected clocks,
randomness, external signing orchestration, and known-answer testing. Internal
helpers need not all become public exports. Avoid a long-lived client object
that caches secrets or auth state when two preparation functions suffice.

Both operations throw a typed preparation error for invalid local input. They
perform no network requests or logging, and never return a partially prepared
request. Errors omit secret values and body contents.

Exact TypeScript signatures are proposed; preserve the explicit distinction
between RFC signing and enhanced preparation in the final interface.

## 4. Serialization and input contract

The enhanced payload accepts JSON values only: null, booleans, finite numbers,
well-formed strings, arrays, and plain string-keyed JSON objects. Reject cycles,
undefined, functions, symbols, BigInt, non-finite numbers, accessors, and custom
serialization/non-plain objects rather than silently dropping or transforming
values. Application authors explicitly convert domain values such as dates.

No canonical JSON algorithm is required. Property order need not be sorted;
interoperability is based on signing and sending the same serialized body.
The low-level signer also accepts non-JSON strings for ordinary RFC endpoints.
It does not claim their compatibility with the enhanced receiver.

Nonce is 16 random bytes, lower-hex on the wire. Timestamp is generated using
the receiver profile's canonical UTC millisecond subset. The client cannot
compensate for an arbitrarily incorrect machine clock; receiver rejection is
not grounds to loosen its freshness policy.

Secret base64 must be canonical and decode to the permitted key bytes; no
password derivation, hex reinterpretation, or silent whitespace stripping.
The minimum generated-key policy and actual Forge constraints must align with
the receiver provisioning release gate.

## 5. Caller obligations

The caller owns:

- Approved HTTPS endpoint, expected method/path, and operation audience from
  trusted provisioning, not arbitrary user-controlled callback data.
- Reading credentials from its secret manager. A Forge sender uses secret APIs;
  an external sender uses its own vault equivalent.
- HTTP execution, response handling, timeout, redirect policy, and business retry.
- Keeping the returned body and auth headers unchanged until transmission.
- Not forwarding signed requests or credentials on redirects to another origin;
  redirects are rejected by default in reference transports.
- Avoiding headers/query parameters that alter unsigned business semantics.
- Local connection enablement and checking whether access has been withdrawn.

The SDK does not enforce receiver authorization or promise delivery. A signature
is not a successful connection, and a prepared request is not a grant.

## 6. Retry and failures

No automatic retries in v1. Once a prepared request may have reached the
receiver, do not resend it as a new attempt. Prepare a new timestamp, nonce, and
signature, retaining a purpose-defined business idempotency key where supported.
The reference purpose specifies its own deduplication behavior.

A timeout is ambiguous: business work may have executed. A fresh nonce prevents
transport replay rejection but does not make the operation safe to repeat.
Never retry a failed enhanced request as body-only RFC signing or another auth
scheme. Do not self-renew credentials because a request receives 401/403.

Response interpretation stays conservative:

- 401: authentication/freshness/replay rejection; not proof of one specific cause.
- 403: denied; not proof of revocation rather than wrong resource/audience.
- 503: potentially temporary infrastructure failure; business outcome still
  depends on the protocol stage and transport evidence.
- Native Forge errors may not use our application JSON response shape.

Detailed remote grant status requires a separate trusted management response;
this signing package must not infer it from a generic transport error.

## 7. Credential rotation and connection lifecycle

The SDK signs with the credential explicitly supplied for the current attempt.
It does not discover keys, enumerate platform slots, poll for replacement,
cache a retired key, or rotate credentials automatically.

The reference application's lifecycle selects the generation and refreshes it
through an admin-authorized process. Rotation does not extend the grant lifetime.
The client package can be used without the lifecycle library, but cannot claim
that absence provides revocation enforcement on the sender.

## 8. Acceptance criteria

- Independently checked body-only and timestamped RFC MAC vectors, including
  base64-decoding correctness, Unicode, whitespace, final newlines, and empty body.
- Enhanced vectors shared by filename/version with the receiver, without using
  receiver signing code as the oracle.
- Returned string-valued headers work with standard Fetch and a Forge sender's
  chosen supported HTTP adapter. No Forge array-valued response headers leak in.
- Enhanced envelope/profile/nonce/timestamp exactly match the normative spec.
- Invalid key encoding, JSON values, time, nonce, metadata, or body size fail before
  network activity; source inputs are not mutated.
- Test-injected time/randomness produce deterministic requests; production path
  uses cryptographic randomness, not counters or `Math.random`.
- A request prepared by this package is admitted by the receiver under matching
  configuration, and tampering with any signed field is rejected.
- Plain RFC mode can sign an existing body without wrapping it; enhanced mode
  cannot accidentally omit timestamp or nonce and never silently downgrades.
- Node ESM/CommonJS built-consumer tests verify declarations and clean imports
  without Forge runtime availability.
- Once available, native Forge integration proves actual wire compatibility;
  passing local round-trips alone is insufficient.

## 9. Delivery and non-goals

Implement RFC known-answer signing first, enhanced preparation second, and
cross-package/native interoperability third. Use focused test-first slices.
Document a minimal send example separately from this reference contract.

No HTTP convenience client, background retry queue, browser SDK, OAuth framework,
admin UI, or provisioning protocol is included. Add such functionality only when
a concrete caller demonstrates repeated work not already handled by its runtime.
