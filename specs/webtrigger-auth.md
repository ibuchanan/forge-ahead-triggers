# Specification: webtrigger machine admission enhancements

Status: proposed design, 2026-09-08; replaces the earlier bespoke HMAC draft.
Package: existing `@forge-ahead/triggers` repository.
Parent: [ecosystem architecture](connection-ecosystem.md).
Peers: [client](webtrigger-client.md), [connections](connections-library.md),
[reference app](connection-reference-implementation.md).

This document is the normative enhanced wire-profile contract for this spec set.
Proposed profile identifier: `forge-ahead-connection-v1`.

## 1. Goals and compatibility

Add opt-in authenticated JSON request admission while preserving every existing
trigger contract/helper. The receiver must authenticate a credential-bound
principal, validate the request, check current application authority, and prevent
replay before returning a payload eligible for business execution.

Use the reviewed [RFC-141](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029)
signature format unchanged. Do not introduce `x-forge-ahead-*` authentication
headers, a custom signing string, or an algorithm negotiation mechanism.

The RFC was reviewed on 2026-09-08; shipping status and concrete SDK APIs were
not established. Native integration is gated on actual platform verification.
This profile is stricter than the RFC: an enhanced request is RFC-compatible,
but an arbitrary RFC-valid request need not satisfy this profile.

## 2. RFC signing contract

- Header: `x-webtrigger-signature: sha256=<64 lowercase hex characters>`.
- Enhanced requests require `x-webtrigger-timestamp`.
- Secret provisioning uses base64 text; HMAC uses decoded secret bytes, not the
  base64 characters. Accept only the agreed canonical base64 representation.
  New app-generated keys contain at least 32 random bytes; confirm platform
  generation/acceptance constraints before finalizing provisioning.
- HMAC input is UTF-8 encoding of the exact timestamp header string, one literal
  period, then the exact body string: `<timestamp>.<body>`.
- Compute with `crypto.createHmac('sha256', secretBytes)`.
- Library verification strictly decodes a 32-byte supplied MAC and compares it
  with the expected 32 bytes using `crypto.timingSafeEqual`. No MAC string equality.
  Format/length rejection is allowed; the entire request path is not claimed to
  execute in constant time.

The plain RFC mode without a timestamp signs just the body. The client may
explicitly support that mode for other receivers, but this enhanced receiver
never accepts it or falls back to it.

## 3. Enhanced request shape

### Transport constraints

HTTPS POST; `Content-Type: application/json` optionally with `charset=utf-8`.
Reject content encoding, nonempty query parameters, unsupported methods, and
unexpected `userPath`. No unsigned header may affect resource identity, business
routing, or authorization.

The default expected `userPath` is empty. A configured nonempty path contains
literal ASCII segments of letters, digits, `_`, or `-`, separated by `/` with
a leading `/`; percent escapes, empty segments, dot segments, and normalization
are unsupported. The receiver checks the configured path exactly.

Maximum body size is 256 KiB in UTF-8. Callers may lower this limit; raising it
is outside v1. Sender serializes once; receiver never reserializes for MAC
verification. Reject ill-formed Unicode rather than replace it silently.
Actual Forge preservation of the body string, headers, and path is a release gate.

### Header handling

Required authentication and content-type headers are single-valued across all
case-insensitive name matches. Reject missing, empty, duplicate, casing-duplicate,
and comma-combined values; do not choose the first value or trim/repair input.
Header names are case-insensitive; signed values are exact.

### Timestamp subset

Use the canonical UTC RFC 3339 subset `YYYY-MM-DDTHH:mm:ss.sssZ`, exactly as
emitted by a valid four-digit-year JavaScript `Date.toISOString()` value.
Validate calendar correctness by exact round-trip, not permissive `Date.parse`
alone. This deliberately narrower subset avoids ambiguous normalization.

For trusted receiver epoch milliseconds `now` and decoded `issuedAt`:

- `now - issuedAt <= 300000` (exactly five minutes old accepted).
- `issuedAt - now <= 30000` (at most 30 seconds into the future).

The optional RFC platform ±10-minute window does not relax this check. The
receiver rechecks freshness after awaited work immediately before nonce claim.

### Signed JSON envelope

```json
{
  "profile": "forge-ahead-connection-v1",
  "connectionId": "receiver-issued-connection-id",
  "audience": "receiver-issued-operation-audience",
  "nonce": "32-lowercase-hex-characters",
  "payload": {}
}
```

- Envelope is a strict object with exactly these five properties.
- `connectionId`: 1–128 ASCII letters, digits, `_`, or `-`.
- `audience`: 1–256 ASCII letters, digits, `_`, `-`, `.`, `:`, or `/`.
- `nonce`: 16 cryptographically random bytes encoded as 32 lowercase hex chars.
- `payload`: valid JSON subsequently parsed by the purpose's Zod schema.

IDs/audience are provisioned to the sender. The receiver binds them to its own
installation, environment, purpose version, direction, operation, and expected
path. No credential lookup or permission decision trusts these fields alone.

V1 defines two distinct operation audiences per purpose: `probe` and `execute`.
Exact audience strings are opaque, receiver-issued values, not client-constructed
suffixes. They may share a module but must not share an audience. The handler
selects only from its server-configured operation set and rejects substitutions.
Probe payload/schema is defined by the reference purpose and is non-mutating.
A probe never approves, renews, resumes, or changes grant scope.

Changing method/path cannot confer different authority: POST/path are fixed,
and the signed audience selects an explicitly allowed operation. The same
Zod-parsed value is used for authorization and business execution.

## 4. Principal binding and platform verification

Initial binding is one managed connection per webtrigger module/product
installation. Both platform key slots, if available as proposed, represent
credential generations for that same principal. They are not separate clients.

Proposed first receiver implementation performs app-side MAC verification
against at most the two server-configured permitted generations, even when
native Forge HMAC is enabled. This provides an explicit authenticated principal
and a testable contract without relying on undocumented verified-key metadata.
It requires a Forge secret-store copy of those generations; this is a deliberate
cost, not an assertion that duplicating platform checks is always necessary.
Verification records the matched generation internally and admission returns its
non-secret identifier. A provisioned candidate may authenticate a probe before
being promoted, but execute requires an explicitly activated generation. During
rotation, both generations may execute only within an explicitly approved overlap.
Never skip MAC verification for setup or probe. Candidate material must already
exist in both secret stores through the trusted provisioning ceremony.

Generation selection is server-owned. Do not accept an arbitrary secret path
or use body `connectionId` to select an unrelated credential. If the platform
later provides trustworthy credential/context evidence, a separately reviewed
implementation may eliminate duplicate verification without weakening binding.

Native Forge rejection remains defense before invocation. App-side verification
alone is not described as native RFC-141 deployment. A reference experiment on
an ordinary webtrigger must be explicitly labeled app-verified and separately
approved; there is no automatic downgrade during deployment or request handling.

## 5. Admission sequence

1. Check method, path, query, body size, media type, and bounded header formats.
2. Validate timestamp and retrieve only the configured permitted secret generations.
3. Verify HMAC and freshness. Invalid MACs cause no JSON parsing or nonce writes.
4. Decode JSON; validate strict envelope and expected profile/connection/audience;
   parse payload with the operation's caller-supplied Zod schema.
5. Ask the application for current authorization of the authenticated principal,
   matched credential generation, operation, and parsed resource/payload.
   Infrastructure failure is not denial evidence; return unavailable and do not
   execute business work.
6. Recheck time and atomically claim nonce.
7. Return admitted principal, generation ID, operation, and Zod output. The app executes its
   business function and chooses `asApp()` explicitly.

Schema refinements/transforms and authorization checks must not perform the
requested business mutation. Use `safeParseAsync` to support sync and async Zod
schemas consistently; authorization/execution receive the schema output type.

The library does not invoke business handlers, synthesize Forge principals,
impersonate account IDs from a body, or fall back to a broader execution identity.
Probe admission may use an approved/current grant with candidate credentials for
setup; execute admission additionally requires completed current provisioning.
The application owns those lifecycle rules.

## 6. Replay store

Nonce uniqueness is scoped by receiving installation and stable connection ID,
across all credential generations and operation audiences for that connection.
Do not reset the replay namespace on rotation. Nonces are distinct from business
idempotency keys and request correlation IDs.

An authenticated, authorized request claims the nonce with a persistent atomic
insert-if-absent. Exactly one concurrent claimant may succeed. Retain the claim
for at least six minutes from claim time. TTL is cleanup only; delayed deletion
may conservatively reject nonce reuse. Never release a nonce after business
failure, timeout, or ambiguous execution.

`get` then `set`, a process-local map, and last-write-wins writes do not qualify.
Current Forge docs describe `kvs.set` with `keyPolicy: 'FAIL_IF_EXISTS'` and TTL;
minimum SDK, exact conflict error, and deployed concurrency behavior must be
verified. Only confirmed key-exists means replay. Other or ambiguous storage
outcomes fail closed as unavailable.

Retry requires a new timestamp, nonce, and signature. Business idempotency and
retry safety are separate application responsibilities.

## 7. Proposed public interface and layout

- `/webtrigger/auth`: narrow result/options types and a deterministic
  `verifySignedRequest` public seam for RFC MAC, bounded transport, and time
  checks. It accepts request, configured key bytes, expected path, and `now` as
  values; it performs no storage, network, clock, or logging I/O. Its success is
  explicitly named verified, not admitted; it is not a replacement for replay
  and authorization checks.
- `/webtrigger/auth/forge`: `createForgeWebTriggerAuthenticator`, the recommended
  high-level enhanced admission interface. Configuration supplies connection
  binding, permitted secret references, operation audiences/Zod schemas, and a
  required application authorization capability. The Forge adapter owns current
  time, secret reads, and persistent nonce claims.

Do not initially export a generic pluggable authenticator/store framework.
Internal seams may support deterministic tests. The high-level interface has
no allow-all default and no option to disable timestamps, nonce claims, or MAC.

Return `Result<Admission, WebTriggerResponse>` using the existing errors package,
consistent with `parseJsonBody`. The pure verifier returns a typed verification
failure; the Forge interface maps failures to safe responses. Exact TypeScript
signatures are finalized during implementation and tested through built imports.

Add isolated source/build entries, export-map and legacy consumer-resolution
entries for the new subpaths. Existing `defineWebTrigger`, `parseJsonBody`, all
response builders, root exports, and trigger-family behaviors remain unchanged.
Zod major version and minimum KVS dependency are explicit implementation gates.
Root imports must not instantiate Forge services or load storage side effects.

## 8. Responses and observability

| Failure | Default response |
| --- | --- |
| Missing/invalid MAC, timestamp, nonce format, or replay | 401 `unauthenticated` |
| Authenticated but wrong connection/audience or denied grant/resource | 403 `forbidden` |
| Authenticated invalid JSON/envelope/payload | 400 `invalid-request-body` |
| Unsupported method | 405 with `Allow: POST` |
| Unexpected path/query | 400 |
| Oversized body | 413 |
| Unsupported media type/encoding | 415 |
| Invalid server configuration | 500, sanitized |
| Secret, grant, or nonce infrastructure unavailable/ambiguous | 503, sanitized |

Errors use existing Forge-compatible array-valued response headers and
`Cache-Control: no-store`. Do not leak key existence, supplied signatures,
schema input values, or storage errors. A malformed body cannot establish a
valid envelope; invalid nonce syntax inside an otherwise parsed envelope maps
to the generic 401 response stated above.

Optional caller-owned diagnostic reporting receives sanitized categories, not
headers, payloads, credentials, or full URLs. Native platform failures occur
before this code and may have different response bodies. Clients must not infer
specific revocation solely from a generic 401/403.

## 9. Acceptance criteria

- Independent known-answer MAC vectors; interoperability with the client and
  native Forge once available. Verify base64 decoding and exact timestamp bytes.
- Unicode, whitespace, property order, escapes, and final body newlines preserved;
  tampering with signed timestamp or any envelope/payload value fails.
- Missing/duplicate/casing-duplicate headers and invalid hex/base64/time fail safely.
- Boundary tests at five minutes and 30 seconds future, plus delayed secret and
  authorization reads; no system clock dependency in pure tests.
- Concurrent identical nonces admit at most once across independent invocations;
  rotation does not permit replay, and business failure never frees a nonce.
- Schema transformations and async validation are preserved; malformed/unauthorized
  requests cause no business effect. Invalid MACs cause no schema/nonce work.
- Current revocation blocks a valid signature; unavailable grant reads fail closed.
- Probe cannot execute business mutations or change authority. Execute cannot use
  incomplete provisioning. Correct signatures do not excuse wrong audience/path.
- Source tests, typechecking, build, formatting, lint, ESM/CommonJS built-consumer
  fixtures, and legacy resolution checks pass with existing contracts unchanged.
- Deployed tests establish Forge body/header forwarding, KVS atomic insertion,
  key rotation scope, and actual platform/native compatibility.

## 10. Non-goals and sources

No client HTTP library, connection admin UI, OAuth callback/server framework,
manifest registration service, arbitrary router, user impersonation, or business
idempotency framework. The original browser-auth exploration is deferred to a
separate future spec, not silently removed as a security requirement.

Sources:

- [RFC-141](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029)
- [Forge webtrigger contract](https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/)
- [Forge KVS](https://developer.atlassian.com/platform/forge/storage-reference/kvs-api/)
- [Forge secret storage](https://developer.atlassian.com/platform/forge/storage-reference/kvs-api-secret/)

RFC compatibility, concurrency, and exact SDK availability remain release gates;
this specification does not claim those deployed checks have already passed.
