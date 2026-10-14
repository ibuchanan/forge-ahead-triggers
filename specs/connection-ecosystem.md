# Specification: connection ecosystem and library relationships

Status: proposed design, 2026-09-08. Implementation is not authorized by this
specification. Package names and interfaces are proposed. Documents may move to
separate repositories; filenames below identify their companion contracts.

## 1. Specification set and authority

| Document | Owns |
| --- | --- |
| [This architecture specification](connection-ecosystem.md) | Terminology, responsibilities, dependencies, integration contracts, delivery sequence. |
| [Connection library](connections-library.md) | Relationship lifecycle, grant authority, provisioning state, safe projections, persistence requirements. |
| [Receiver enhancements](webtrigger-auth.md) | Enhanced machine wire profile and receiver admission. Normative authority for wire bytes, envelope, freshness, and nonce rules. |
| [Client library](webtrigger-client.md) | Sender interface and RFC-compatible signing. Implements, but does not redefine, the enhanced wire profile. |
| [Reference implementation](connection-reference-implementation.md) | Concrete purposes, Forge UI, administrative authorization, provisioning ceremony, and end-to-end evidence. |

This set supersedes the earlier bespoke HMAC protocol in `webtrigger-auth.md`.
Existing extraction and response-adapter specifications remain applicable except
that opt-in machine authentication is now an allowed addition to triggers.
No generic authorization framework is added to the existing trigger helpers.

## 2. Problem and outcomes

A webtrigger integration has both a sender and receiver. Making the receiver
secure creates obligations on clients. RFC-141 proposes a Forge-specific HMAC
format, not an Internet-standard protocol with ubiquitous client support.

The ecosystem must:

- Make compliant requests straightforward for developers who control senders.
- Enforce authentication, validation, freshness, replay defense, and business
  authorization even when a sender is malicious or broken.
- Give administrators named, purpose-specific relationships they can inspect,
  constrain, suspend, renew, and revoke without managing webtrigger internals.
- Keep those administrative capabilities useful for non-webtrigger integrations.
- State platform limitations and incomplete cleanup honestly.

Unmodifiable external webhook producers are not made compatible by publishing
an SDK. They need their own supported authentication profile or an explicitly
reviewed intermediary; silent security downgrades are prohibited.

## 3. Domain glossary

| Term | Meaning |
| --- | --- |
| Purpose | An app-defined business capability, with a recorded version and permission meaning, such as submitting delivery updates. |
| Connection | A managed relationship between systems for a purpose. Its usability depends on configuration and authority; it is not a URL or key. |
| Connection request | A proposal to establish that relationship. It conveys intent, not authority or verified identity by itself. |
| Access grant | The receiver's authoritative approval of a principal, purpose version, resource scope, and lifetime. |
| Principal | The credential-bound system identity admitted by the receiver; not an arbitrary identifier supplied in a payload. |
| Provisioning | Establishing endpoint/configuration and credential material needed to use an approved connection. |
| Credential generation | One version of signing/authentication material. Rotation replaces generations without renewing the grant. |
| Proof | A successful authenticated, non-mutating protocol exchange for the intended destination and purpose. |
| Health observation | A time-stamped observation of connectivity or delivery. It is not authorization. |
| Suspension | Reversible denial under a still-existing relationship. |
| Revocation | Permanent withdrawal of a grant; a new grant is required to reconnect. |
| Local disconnect | Stopping the client's participation; does not prove receiver-side revocation. |
| Platform retirement | Disabling an endpoint or credential at the transport platform before application invocation. |
| Readiness | An application-derived answer about whether a feature can currently use its required connection and resource. |

The sender and receiver maintain local views, not a magically shared distributed
record. Receiver grant state is authoritative for incoming access. A sender's
knowledge of remote grant status can be stale. Bidirectional relationships have
separate directional grants and credentials, even if grouped in one UI.

## 4. Jobs and control

Two jobs exist regardless of whether one or two people perform them:

- **Connect a system:** configure a sender and request useful access.
- **Govern incoming access:** approve, constrain, observe, and withdraw access.

Setup is client-initiated and receiver-approved. It is resumable across sessions
and people. A single person with both permissions still makes an explicit
receiver approval decision. Predefined purposes replace arbitrary permission
pickers. Receiver-owned resource selection is the recommended reference default;
initiator-supplied resource information is only a suggestion.

## 5. Module and package allocation

### `@forge-ahead/connections`

Transport-independent lifecycle module plus an optional Forge persistence
adapter. Owns valid transitions, expiry evaluation, credential-generation
references, audit facts, recovery states, and safe status projections.
Does not own HTTP, HMAC, React, identity-provider protocols, or business policy.

### `@forge-ahead/triggers`

Preserves existing contracts and helpers. Adds opt-in receiver admission through
`/webtrigger/auth` and a Forge adapter through `/webtrigger/auth/forge`.
Owns the enhanced request protocol, Zod validation, and atomic replay defense.
Accepts a narrow application authorization capability rather than importing the
connection package or selecting `asApp()`/`asUser()` itself.

### `@forge-ahead/webtrigger-client`

Standalone Node.js sender package. Owns RFC-141 signing and explicit enhanced
request preparation. Does not depend on Forge, triggers, or connections. No
automatic HTTP, retry, secret-manager, registration, or key-renewal framework.
Node.js 22+ is the proposed initial target; browser and edge support is deferred.

### Reference application repository

Composes the libraries, defines business purposes and resource policy, provides
trusted Forge administration surfaces, and implements the provisioning ceremony.
It is the executable example and end-to-end contract test, not a dependency of
any library.

### Dependencies

```text
Reference app
  ├── connections (+ Forge adapter)
  ├── triggers/webtrigger/auth (+ Forge adapter)
  └── webtrigger-client

Connections core: no Forge/network/UI dependency
Client: Node crypto; no Forge/receiver/lifecycle dependency
Receiver: existing trigger/result contracts + Zod
Forge adapters: Forge secret/persistence APIs
```

The application translates a current connection grant into the receiver's
structural authorization result. No shared protocol package is introduced
initially. Wire vectors are versioned as interoperability artifacts; agreement
between two copies of the same algorithm is not sufficient verification. Shared
JSON known-answer fixtures are allowed. A reference integration test may import
both built packages and call their public interfaces in process. The prohibition
is on runtime library coupling or using the receiver's signing implementation
as the sole expected-output oracle, not on cross-package integration tests.
Repository layout and distribution channel are separate decisions. This work
must not convert the current repository into a monorepo merely to explore it.

## 6. Shared security contract

- RFC-compatible MACs use `crypto.createHmac('sha256', secretBytes)`.
  Library MAC verification uses equal-length buffers and `timingSafeEqual`.
- Enhanced requests require a signed timestamp and signed-body nonce; age is
  at most five minutes, with bounded future skew and persistent atomic claims.
- Zod validates untrusted envelopes and payloads; validation is not authority.
- Forge-held credentials use secret APIs, never ordinary KV values prefixed
  with a marker. Sender secrets use the sender's own protected storage.
- Credentials, full endpoint URLs, and payloads are excluded from default logs
  and user-facing status. Administrative audit records contain no secrets.
- No fallback to environment credentials, another profile, or `asApp()` may
  undo denial or revocation.
- Neither UI placement nor a client-supplied actor establishes admin authority.
- Saving settings is not approval; key rotation is not access renewal; health
  success cannot change a grant; deleting a local secret is not platform revocation.
- Concurrent or stale provisioning completion must not reactivate revoked
  access. Unknown infrastructure outcomes fail closed and remain recoverable.

## 7. RFC-141 compatibility and platform constraints

Source: [RFC-141 and discussion](https://community.developer.atlassian.com/t/rfc-141-hmac-authenticated-web-triggers/102029),
reviewed 2026-09-08. Its resolved status is not evidence of released SDK support.

The reviewed proposal uses `x-webtrigger-signature: sha256=<hex>` and a
base64-encoded shared secret decoded before HMAC. With the optional
`x-webtrigger-timestamp`, the input is `<timestamp>.<body>`; otherwise it is the
body. The proposed timestamp is RFC 3339 with a platform window of ±10 minutes.
Two keys per webtrigger module/product installation support rotation. The
proposal does not establish a general independently revocable client registry.

Our enhanced profile is a strict subset: mandatory timestamp, narrower window,
signed envelope, and nonce enforcement without changing RFC signature bytes.
It is not a replacement HMAC scheme or an Internet-standard OAuth flow.

Initial receiver binding is one managed connection per authenticated module and
installation, with its two rotation generations. Do not assume another generated
URL creates another credential namespace. A signed `connectionId` is not an
independent identity when callers share a key. Multi-client admission requires a
separately specified credential-binding solution.

Before claiming native compatibility, verify actual SDK availability, header/body
forwarding, signing format, secret decoding, module/key scope, rotation behavior,
and platform retirement APIs. Missing features are recorded as blocked; do not
invent API names or silently substitute a custom signature protocol.

## 8. Common lifecycle and integration contracts

1. Initiator creates a bounded, expiring connection request for a known purpose.
2. Receiver authenticates its admin, verifies the requester through the chosen
   provisioning ceremony, and records an explicit scoped grant.
3. Provisioning installs credential material through a trusted channel. Long-lived
   secrets never travel in approval links or arbitrary callbacks.
4. Non-mutating proof checks protocol and resource binding. Only a current,
   approved grant plus completed provisioning permits business admissions.
5. Client prepares a signed request. Receiver validates it, obtains current grant
   authorization, claims a nonce, and returns the parsed payload for execution.
6. Suspension/revocation blocks new admissions. Platform retirement is tracked
   separately; previously admitted work cannot be recalled. Deferred execution
   rechecks authorization before privileged effects.

Grant revision and credential generation travel through provisioning work as
expected-version references. Time, actor, operation IDs, and proof provenance
come from trusted execution boundaries, not unchecked UI claims.

## 9. Delivery and acceptance

Deliver vertically, not by implementing all package surfaces first:

1. Refine the existing Bearer reference to prove honest state, protected admin
   commands, secret separation, partial failure recovery, and local disconnect.
2. Establish independently checked RFC/enhanced signing vectors and receiver
   admission tests without waiting for admin automation.
3. Prove a single paired webtrigger purpose, explicit receiver approval, secure
   manual provisioning, and application revocation; label native-platform gaps.
4. Extract lifecycle behavior genuinely shared by both examples, then validate
   packaged imports and repeat the end-to-end scenarios using package artifacts.

Cross-package acceptance includes a valid enhanced request, tampering rejection,
strict freshness, concurrent nonce replay rejection, wrong resource denial,
revocation despite a valid key, rotation without renewed grant lifetime, and
incomplete platform retirement accurately shown in the UI.

## 10. Deferred decisions

- Fully automated bootstrap/credential exchange; no protocol has been approved.
- Multiple independently credentialed callers per receiver module.
- Exact concurrency primitive for revision-protected lifecycle updates. Atomic
  nonce insertion alone does not establish compare-and-swap for lifecycle state.
- OAuth client versus authorization-server role, provider selection, sessions,
  identity mapping, user grant policy, and offline Forge impersonation.
- Reusable UI package, generic workflow engine, event sourcing, automatic retries,
  reconciliation scheduler, and transport-provider plugin framework.

Machine profiles never grant arbitrary user impersonation. Any later user flow
needs a separate reviewed specification; external OAuth consent does not create
Forge `asUser(accountId)` authority.
