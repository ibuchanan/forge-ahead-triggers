# Specification: connection lifecycle reference implementation

Status: proposed design, 2026-09-08; repository name/location undecided.
Parent: [ecosystem architecture](connection-ecosystem.md).
Dependencies: [connections](connections-library.md), [receiver](webtrigger-auth.md),
[client](webtrigger-client.md).

## 1. Purpose and starting point

Evolve the ideas in `vendor/explore-forge-config-lifecycle` into an executable
reference for administering purpose-specific connections. Preserve its useful
Configure, Get Started, persistent admin, and product-feature surfaces while
replacing the app-wide `isConfigured` model.

This is a reference implementation, not a generic integration platform or a UI
library. Use one concrete connection per scenario first. Repository restructuring
and vendor edits are not authorized by this specification.

Two acceptance scenarios establish the library seams:

1. The current outgoing Bearer-token service connection: lifecycle without HMAC.
2. A client-initiated, receiver-approved delivery-update connection: the lifecycle,
   client signing, and receiver admission composed end to end.

## 2. Jobs and users

- **Initiating administrator:** connect a system for a predefined purpose.
- **Receiving administrator:** govern incoming access and resource scope.
- **Connection operator:** inspect status, repair setup, test, or rotate credentials
  within their permissions.
- **Feature user:** understand whether the connection needed for this resource is
  available and who can resolve problems; no credential/admin detail exposure.

These jobs may be performed by the same person at different times. Handoff is
resumable across sessions; no distinct-human requirement or implicit approval
when one person has both roles.

## 3. Scenario A: outgoing Bearer connection

Retain the existing sample purpose of displaying external service status in Jira.
URL and token are backend-owned configuration; credentials use Forge secret
storage and UI reads expose only presence/generation metadata.

Reference behaviors:

- Missing state means no connection; storage errors mean status unavailable.
- Save settings and credential candidate without claiming readiness before both
  persist successfully. Show setup incomplete on partial failure.
- Changing a label/settings does not require re-entering an unchanged credential;
  replacing a credential is an explicit operation.
- Test is a non-mutating, destination-bound authenticated request with bounded
  timeout and redirects disabled. Only approved HTTPS destinations are allowed.
- Successful transport proof records health/setup progress; it does not assert
  independently verified external authorization beyond what the service proves.
- Disconnect stops local sending and removes local material through tracked
  cleanup. If remote revocation is unsupported, say so explicitly.

The existing `httpbin.org/bearer` behavior is a demonstration endpoint, not proof
of real credential validity or a production authorization service. Only use dummy
sample tokens with it. Production claims require a meaningful service test.

## 4. Scenario B: paired delivery-update connection

Use the same Forge reference app installed in two test sites, with explicit local
sender/receiver roles. If separate app instances are needed, share the same
reference source rather than create an integration framework.

### Purpose contract

Purpose ID: `submit-delivery-update`, version 1.

Receiver administrator selects a permitted local pairing/resource and expiry.
The initiator may suggest a resource but receives no implicit permission to browse
the destination's resources. Approval records exact scope and purpose version.

Execution payload contains a purpose-defined delivery ID, permitted pairing ID,
status from a documented finite set, and source observation time. Validate with
Zod and keep the example business action small: record the accepted update in
receiver-owned storage. Avoid unrelated Jira mutations to prove transport auth.

The application defines business idempotency independently of nonces: repeated
identical delivery IDs/content are no-ops; conflicting reuse is rejected. Do not
claim exactly-once distributed execution beyond the tested storage semantics.

### Client-first journey

1. Select purpose and destination; record a pending expiring request and owner.
2. Continue on destination or share non-secret approval instructions.
3. Receiving administrator authenticates and reviews requester evidence, purpose,
   destination/environment, selected resources, and expiry.
4. Receiver approves or rejects. Approval does not immediately enable execution.
5. Provision endpoint, connection/audience values, and credential generation.
6. Sender completes a non-mutating signed `probe` operation. Record proof against
   current grant/configuration revision and credential generation.
7. Mark setup ready only if the grant remains valid. Enable signed `execute`
   operation under current grant/resource checks.

The probe and execute audiences are distinct receiver-issued values on the
module's server-configured operation set. A probe cannot mutate business data or
approve/renew/resume access. Execute is denied until provisioning completes.

### Bootstrap and credential provisioning

V1 uses an explicit manual, admin-mediated ceremony unless a separate automated
bootstrap design is approved. This is not an OAuth flow and must not be described
as automatic trusted pairing.

- Approval links contain only short-lived, single-use request references and
  non-secret context. They do not grant access or prove the named peer's identity.
- Receiver approval requires trusted platform identity and an out-of-band check
  of the intended peer through the administrators' established channel.
- Non-secret provisioning information includes destination, environment, purpose,
  connection ID, module binding, expected path, and probe/execute audiences.
- Provision signing material using the supported native RFC API/CLI mechanism
  only after verifying availability. Copy the generation into receiving Forge
  secret storage when required for app-side verification, and into the sender's
  secret store through an authorized input operation.
- Stored secrets are never returned to the UI. If native generation requires a
  one-time credential display, isolate and explicitly document that ceremony;
  no subsequent reveal action or secret in URLs/logs/audit records is allowed.
- Credential transfer must use an approved secure channel, never plain approval
  email, arbitrary callback URL, or publicly accessible polling endpoint.
- Expire/cancel abandoned setup; treat credentials exposed during a failed
  ceremony as requiring retirement, not automatic reuse.

Exact native APIs, key-generation custody, and secure transfer mechanism are
implementation gates. The reference must not pretend to solve bootstrap using
only HMAC, which requires a previously shared secret.

One connection is bound to one authenticated module/product installation, with
platform key slots reserved for rotation. The UI must not promise unlimited
independently credentialed clients on that module. Native RFC behavior unavailable
means that slice is blocked. An app-only verification demo is separately labeled
and approved, never a silent compatibility fallback.

## 5. UI structure and surfaces

Use Forge-native UI Kit surfaces first; exact manifest schema and APIs must be
verified at implementation time. No React code is generated before UI approval.

| Surface | Job and contents |
| --- | --- |
| Get Started | Select purpose, initiate connection, resume pending setup, explain who must act next. |
| Configure | Non-secret settings, explicit credential replacement input, setup recovery. No stored secret reveal. |
| Connections admin page | Persistent access, setup, health, expiry, owner, scope, and cleanup status. |
| Approval detail | Receiver's explicit grant decision, purpose version, peer evidence, allowed resource and expiry. |
| Product panel | Minimal resource-specific readiness and permitted next step, not the app-wide configured flag. |

For a single connection, use a detail view, not an empty table framework. Access
is the primary status; setup and health are separate. Technical endpoint/module/
generation details are progressively disclosed and redacted where appropriate.

Admin actions: approve/reject, suspend/resume, renew, revoke, test, replace
credential, retry supported cleanup, and local disconnect. Show actions based on
server-verified permissions; backend enforcement remains mandatory regardless of
button visibility.

### State completeness

- **Ideal:** purpose/peer/scope/owner, active access and expiry, completed setup,
  last proof/health time, and permitted actions.
- **Empty:** no connection; explain purpose and offer initiation, not an error.
- **Loading:** bounded pending UI; disable duplicate conflicting submissions and
  retain known state while refreshing with an explicit stale marker.
- **Error:** distinguish unavailable reads, failed save, incomplete provisioning,
  denied/expired/revoked access, and cleanup failure. Provide a safe next step.

Use `try/catch/finally` for bridge calls; no stuck spinner/busy state on rejection.
Unknown must not render success or first-run setup. Display long peer names,
resource names, and error summaries without exposing credentials or full URLs.

A follow-on `UI_SPEC.md` can pin down layout and ADS components before UI work;
this document defines the behavior and jobs, not pixel-level implementation.

## 6. Resolver and execution security

- Mutations obtain actor identity from trusted Forge context, perform explicit
  admin/resource permission checks, validate payloads, and pass authorized facts
  into lifecycle commands. No trusted `isAdmin` field from the browser.
- Read endpoints enforce viewer scope. Product users cannot retrieve administrative
  configuration merely because resolvers share a Forge function.
- Business handlers check current grant/resource authority server-side; frontend
  readiness is not an authorization cache.
- HTTP destination validation includes approved HTTPS origin/path and declared
  egress. Reject userinfo, arbitrary redirects, and unsupported destinations;
  do not forward stored tokens to a replacement URL without reviewed binding.
- Initialization is non-destructive under concurrent saves. Do not use a mutable
  install sentinel as the source of authorization.
- Cleanup is explicit and retryable while installed. Pre-uninstall is a bounded
  best-effort last step, not guaranteed remote retirement.

## 7. Library composition

Reference resolvers call connection commands/projections and supply actor/resource
policy. The outgoing transport calls the client request-preparation helper and
its own approved fetch implementation. The receiving transport calls the Forge
authenticator with current connection-grant policy and then the domain action.

Keep purpose schema, resource selector, peer verification ceremony, and UI in the
app. Extract only demonstrated common lifecycle behavior into connections.
Do not copy vendored implementations into libraries to bypass dependency or
artifact problems. Pin/build actual package artifacts for consumer validation.

## 8. Administrative evidence and failure scenarios

The reference must visibly demonstrate:

- Request awaiting another job, including the same admin returning later.
- Approved but not yet provisioned setup.
- Successful proof separate from access lifetime.
- Suspension blocking a correctly signed execute request.
- Revocation preserving denial despite a stored valid credential.
- Rotation not extending access expiry.
- Stale rotation/proof completing after revocation without reactivation.
- Local disconnect with remote retirement pending/unsupported.
- Application denial committed while native platform retirement is incomplete.
- Audit history of administrative decisions without secrets or payloads.

Audit events identify the actor, purpose/grant revision, action, reason, time,
and outcome. A failed cleanup is visible, not collapsed into success. Generic
401/403 from an external receiver is not shown as confirmed revocation without
trusted management evidence.

## 9. Tests and release evidence

Keep useful manifest/import/wiring tests from the original example, but add
behavioral tests through public library and resolver interfaces:

1. Non-admin mutation and forged actor/resource scope denied.
2. Secret/metadata partial writes and storage outages preserve truthful state.
3. Duplicate approval/command IDs are idempotent; conflicting input rejected.
4. Purpose-scope expansion requires new approval.
5. Grant expiry checked on use without a scheduler.
6. Competing revoke/provision/rotate commits preserve denial.
7. Real sender-to-receiver enhanced request accepted; tampering, wrong audience,
   stale timestamp, replay, and denied resource rejected.
8. Proof cannot execute a delivery update; duplicate business delivery behavior
   matches the purpose's idempotency contract.
9. Every UI surface has Ideal/Empty/Loading/Error outcomes and recovers from
   bridge rejection without secret leakage.
10. Cleanup failures and unsupported native retirement are accurately presented.

Local deterministic tests establish logic; deployed tests establish Forge body
fidelity, native HMAC compatibility, persistence concurrency, secret API behavior,
and permission enforcement. Record environments, package versions, commands,
and observed limits. No native-release claim based only on mocks or local vectors.

## 10. Suggested delivery slices

- Slice A: truthful outgoing Bearer connection and protected admin lifecycle.
- Slice B: standalone client/receiver interoperability vectors and admission.
- Slice C: one manually provisioned paired purpose with explicit approval/proof.
- Slice D: suspend/revoke/rotate recovery and administrator-visible evidence.
- Slice E: extraction of proven shared lifecycle behavior and packaged consumer
  validation, retaining simple app-owned UI and purpose policy.

No automatic client registration, arbitrary callback delivery, OAuth flow,
general connector marketplace, reusable UI package, or multi-tenant control
service belongs in the initial reference.
