# Specification: `@forge-ahead/connections`

Status: proposed design, 2026-09-08; not implemented.
Parent: [ecosystem architecture](connection-ecosystem.md).
Consumers: [reference app](connection-reference-implementation.md), optionally
composed with [webtrigger admission](webtrigger-auth.md).

## 1. Scope and outcome

Provide a small, transport-independent connection lifecycle module and a Forge
persistence adapter. Replace application-wide `isConfigured` flags with named
relationships, explicit authority, recoverable provisioning, and safe status.

The module must work for the existing outgoing Bearer-token example and a
receiver-approved webtrigger integration. It must not require a webtrigger,
OAuth provider, React renderer, generic config schema, or network client.

An application may manage one connection initially. A public multi-connection
query language, generic workflow engine, and arbitrary transport plugins are
not required.

## 2. Domain data

These are logical records, not a requirement for separate database tables.

| Record | Required meaning |
| --- | --- |
| Connection | Stable local ID; incoming/outgoing direction; purpose ID/version; peer reference; installation/environment binding; owner; revision. |
| Request | Requested purpose/resources, initiator provenance, creation and expiry times, pending/approved/rejected/cancelled/expired outcome. |
| Grant | Receiver-approved principal, purpose version, allowed resource scope, approver, approval time, expiry, suspension/revocation facts. |
| Provisioning | Pending/ready/failed status, operation ID, expected grant revision, credential generation, sanitized failure and cleanup status. |
| Credential reference | Opaque secret reference and generation metadata; never raw secret in domain records. |
| Health observation | Result, observation time, credential/configuration revision tested, sanitized cause. No authorization effect. |
| Audit fact | Actor, action, connection/grant ID, previous/new revision, time, reason, outcome; no credential or payload. |

The authoritative incoming grant and the outgoing client's observation of a
remote grant are distinct. The module must represent unknown remote authority
rather than assert approval merely because a local credential exists. A Bearer
integration may rely on externally administered authority; local enablement is
not proof of remote consent or revocation support.

Purpose-specific resource values are application-owned validated data. A grant
captures the approved permission meaning/version; changing purpose code cannot
silently expand old grants.

## 3. State rules

Do not collapse all fields into a single giant status enum.

- Request decisions: pending → approved/rejected/cancelled; expiry is enforced
  from trusted current time. Approval of an expired request is denied.
- Grant access: active ↔ suspended; active/suspended → revoked. Revoked is
  terminal. Expiry is evaluated on every use, not only by a scheduled job.
- Renewal requires explicit authorized approval of a new expiry/revision.
  Revoked grants cannot be renewed. Reconnection creates a new grant identity.
- Provisioning: pending → ready/failed. Recovery creates/retries an identifiable
  operation against the current expected revision, never unconditional activation.
- Rotation creates a candidate credential generation and bounded overlap.
  Promoting it does not extend grant expiry or remove suspension/revocation.
- Incoming credential use always requires a current, unexpired, non-revoked
  grant and the permission required for that operation. Rotation starts only
  under authorized current grant policy; an expired grant must be renewed
  explicitly first. Expiry during rotation prevents activation until separately
  authorized renewal and a fresh revision-checked completion.
- Health is unknown/healthy/unhealthy with an observation time. Old health may
  be displayed as stale; it is not used to grant access.
- Local disconnect immediately prevents new local sending when committed,
  independently of whether remote retirement succeeds.

Readiness is derived for a purpose/resource from current authority and required
provisioning. Historical proof establishes setup completion, not perpetual
network health. Later network failures do not revoke the grant or require new
approval automatically.

## 4. Proposed interface

Exact TypeScript names remain subject to implementation review. The initial
interface consists of a deterministic decision/projection module and a small
command service using the Forge adapter.

### Decision and projection module

- Accept current state, a recognized command, trusted actor authorization facts,
  expected revision, operation ID, and current time as values.
- Return a decision containing state changes, audit facts, and required external
  work, or a typed denial/conflict. No network, clock, storage, or logging calls.
- Project a redacted admin summary and a minimal feature-readiness result from
  state. Do not return raw credentials or confidential endpoint details.

Use a closed set of meaningful commands, not an arbitrary `setState` method:
request, approve, reject, cancel, suspend, resume, renew, revoke, disconnect,
record provisioning/proof outcomes, and rotate/retire credential generations.
Implement only commands exercised by the two reference scenarios first.

### Application service and Forge adapter

- Read versioned records and execute decisions with protected commits.
- Require an application-supplied admin authorization check using trusted Forge
  invocation identity and resource permissions before privileged commands.
- Persist secrets through `kvs.setSecret/getSecret/deleteSecret`; legacy callers
  may load via `storage.getSecret`, but must meet the same lifecycle guarantees.
- Keep secret access backend-only. UI summaries expose presence and generation
  metadata, not secret material.
- Return explicit outcomes: applied, already-applied, denied, conflict,
  unavailable, or external-work-pending. Do not disguise read failure as absence.

The command service is not a resolver registrar or UI framework. The application
binds Forge resolvers, manifests, remote operations, and purpose policy.

## 5. Persistence and concurrency invariants

The persistence implementation must establish actual conditional-update or
serialization guarantees across invocations before release. A version field
checked only in application memory is insufficient. `Promise.all`, sequential
writes, and ordinary last-write-wins KV transactions do not solve stale writes.

Required behaviors:

1. No settings/secret partial write may mark a connection ready.
2. Secret generations are provisioned separately, then referenced by a protected
   metadata commit. Failure leaves an unreferenced candidate eligible for cleanup,
   not an active connection with missing material.
3. Completion carries the operation ID and expected grant/configuration revision.
   Stale completion after revoke, suspend, expiry, or replacement cannot restore
   access or overwrite newer configuration.
4. Retrying the same command operation ID does not duplicate grant creation or
   audit facts. Reusing it for different input is rejected.
5. Install/upgrade initialization must not overwrite existing records under races.
   Prefer absence meaning no connection over a mandatory mutable sentinel.
6. Audit facts and committed transitions must not silently diverge. Use supported
   atomic persistence or durable pending audit delivery; no full event-sourcing
   system is required.
7. Errors and timeouts can leave external operations uncertain. Persist enough
   operation identity to reconcile; do not blindly repeat destructive rotation.

The selected Forge store/primitive and minimum SDK version are release gates.
Do not claim KVS `FAIL_IF_EXISTS` provides general compare-and-swap. If the
required lifecycle commit cannot be implemented safely with the chosen store,
change the adapter or narrow the supported workflow before shipping.

## 6. Revocation, disconnect, and cleanup

Revocation commits denial first. Secret deletion and platform retirement are
subsequent tracked work. Failure to retire a platform key must not restore the
grant. Preserve revocation evidence for the chosen retention period; do not
represent revocation as missing configuration with an environment fallback.

Admin status distinguishes:

- Local access denied.
- Remote/platform retirement pending, confirmed, unsupported, or failed.
- Local credential cleanup pending/completed.

A successful revoke response means the denial record is committed, not that all
in-flight work stopped. Storage consistency and maximum propagation behavior
must be documented and tested. Avoid cross-invocation authorization caches in v1.
Previously admitted work cannot be recalled; queued/deferred effects recheck
current grants before acting.

Pre-uninstall cleanup is best effort. Normal disconnect/revoke handles remote
retirement while the app is still operational. After uninstall there may be no
runtime to retry cleanup; the UI must not promise otherwise. Record/secret/audit
retention and any external deprovisioning procedure are application policy.

## 7. Administration and status contract

Provide values useful to existing Configure, Get Started, admin, and product
surfaces, without hardcoding their UI wording or module keys:

- Purpose/peer/owner and access scope.
- Setup progress and recoverable next action.
- Grant state and expiry, with authoritative versus observed provenance.
- Credential generation/expiry presence, not values.
- Last proof/health/delivery observation and age.
- Retirement/cleanup state.
- Actions permitted for the current viewer, derived server-side.

Missing state, unknown state due to outage, and denied access are distinct.
Feature projections reveal only what the viewer needs and must not expose a
full secret-bearing URL. UI gating is explanatory; business functions independently
enforce current authorization.

## 8. Reference-derived requirements

The [explore-forge-config-lifecycle example](https://github.com/ibuchanan/explore-forge-config-lifecycle) demonstrates:

- `src/resolvers/config.ts`: URL/secret separation, safe `hasToken` reads,
  save/reset, and a single configured flag.
- `src/resolvers/health.ts`: outgoing authenticated probe, separate configuration
  and connectivity results.
- `src/resolvers/lifecycle.ts` and `cleanup.ts`: installation and uninstall intent.
- `src/frontend/*`: onboarding, configuration, operations, and feature gating.

Preserve these jobs, not their conflation of saved/authorized/connected state.
Its parallel writes are not a safe activation commit. Its fail-to-unconfigured
reads and missing UI rejection paths must not become library behavior.

The older vendored `forge-ahead/config` utility is not adopted unchanged: its
ordinary-KV secret prefix is not secret storage, and its environment fallback
must not bypass a revocation tombstone. Configuration resolution and access
lifecycle are different responsibilities.

## 9. Acceptance criteria

- Deterministic tests cover each legal and forbidden transition through the
  public decision interface, including expiry without a background task.
- Non-admin mutation, forged actor, wrong installation, and unapproved purpose
  expansion are denied before privileged effects.
- Duplicate operation IDs are idempotent; altered input with the same ID fails.
- Competing approve/revoke, rotate/revoke, and initialization/save operations
  preserve denial and latest-state invariants under real persistence concurrency.
- Secret-write and metadata-write failures cannot yield ready state.
- Health success never resumes revoked/suspended access; changing credentials
  never extends grant lifetime.
- Read outages produce unavailable status, not first-run configuration prompts.
- Local disconnect does not claim remote revocation; unsupported platform cleanup
  is represented explicitly.
- Bearer and HMAC references consume the same lifecycle module without putting
  transport code into its core.
- Built consumer tests verify proposed root and `/forge` imports, ESM/CommonJS
  behavior, type declarations, and absence of Forge runtime loads in the pure core.

## 10. Non-goals

No arbitrary workflow language, transport-provider registry, generic config form
renderer, secret manager implementation, automatic reconciliation scheduler,
OAuth server/client suite, or cross-installation database. Application policy,
trusted peer bootstrap, resource authorization, and UI stay in the reference app.
