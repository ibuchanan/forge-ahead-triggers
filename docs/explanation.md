# Explanation: triggers as the backbone of Forge backends

A Forge application is more
than the UI modules that users can see.
Its backend is a collection of [serverless functions][forge-functions] that run
when the platform, an Atlassian product, time, or an external caller
gives the application a reason to act.
Triggers are the connection between those reasons
and the functions that carry out the work.
They are the backbone of an event-driven architecture in the Atlassian cloud ecosystem.

This perspective changes how a backend is organised.
In a request-response application,
the user action is usually the centre of gravity:
a request arrives,
a service does work,
and a response returns to the same user.
In a trigger-driven application,
the important fact is that something happened.
A Jira issue changed,
an app was installed,
an interval elapsed,
or another system called a web endpoint.
The handler turns that occurrence into domain work:
it updates derived state,
synchronises data,
applies policy,
sends a notification,
or begins a longer workflow.

## One execution model, several sources of work

Forge functions provide one serverless execution environment,
but different triggers place a function at different architectural boundaries.
[Product and Forge events][forge-events] allow an app
to react to changes in Atlassian cloud products
and the Forge platform
without a person directly invoking the app.
[Lifecycle events][forge-lifecycle-events] make installation
and major upgrade moments
available to application code,
so an app can establish or evolve its own state as its installation changes.
[Scheduled triggers][forge-scheduled-triggers] make time itself a source of work.
[Web triggers][forge-web-triggers] make an HTTP call from outside the
platform a source of work.

These sources are complementary rather than interchangeable.
Product events are a natural fit
when the work follows a known change in Jira or Confluence.
A schedule suits periodic maintenance, reconciliation, or work
whose source cannot signal a change.
A lifecycle event establishes the application's own history in an installation.
A web trigger admits an external system into that history.
Together, they let a Forge app behave as a backend
that is embedded in Atlassian cloud
rather than as a UI
that must constantly ask whether anything has changed.

## Events replace much of the need for polling

The architectural value of an event is selectivity.
A product event invokes work because a relevant change occurred;
a polling loop invokes work to find out whether a change occurred.
Where an appropriate event exists,
the former usually produces a backend
that is both
more responsive to the domain
and less wasteful of invocations.
The application can preserve and project
its own view of activity as changes arrive
instead of repeatedly rediscovering it.

This does not make scheduled work obsolete.
Some responsibilities are inherently time-based:
expiring records,
refreshing a derived result,
reconciling a remote system,
or examining a backlog that may have been missed.
The distinction matters
because a schedule is a periodic opportunity to work,
not proof that work exists.
In the same way,
an event is a reason to examine a change,
not a guarantee that every downstream effect has already been applied.
Good backend design treats both as inputs to a domain decision
rather than as commands that must always cause a large operation.

## Triggered work is asynchronous work

A user changing an issue and a handler observing that change
are not one synchronous conversation.
Forge documents that [trigger-module event delivery][forge-trigger-module]
can take up to three minutes because events are queued and delivered
asynchronously.
That delay is not merely an operational footnote;
it is a boundary in the architecture.
Event handlers should be understood as consumers of a stream of facts,
not as an extension of the screen that caused the fact.

This separation has consequences for expectations and state.
An application cannot assume
that the product UI is still in the same moment
when its handler runs.
It cannot treat a single delivery as a user session,
and it should not make an interactive experience
depend on an event handler completing immediately.
Instead, triggers are well suited to eventually consistent behaviours
such as updating projections, calculating aggregates, initiating follow-up work,
and communicating changes across system boundaries.

[Scheduled triggers][forge-scheduled-triggers] make the same point in a
different way.
They run without a user principal,
distribute invocations across installations,
and can be invoked more than once in exceptional cases.
Their results are not returned to a user.
They are backend maintenance mechanisms,
so their work should be safe to repeat
and meaningful even when no one is watching.

## Identity and authority live at the boundary

Because event-driven code is not a user's interactive session,
its identity is not the identity of the person who caused the event.
Forge [event handlers][forge-events] run under the app system user,
and scheduled work has no user principal.
This makes triggers useful for application-owned automation,
but it also means permissions and authorization
should be considered as properties of the application and its installation
rather than assumed to flow from a current user.

Web triggers make the boundary even clearer.
They let an external service or client enter a Forge backend through HTTPS,
but [Forge does not attach platform authentication][forge-web-triggers]
to those URLs.
The web trigger is an ingress point,
not an identity provider.
The application must decide how the caller proves its identity
and how its request is authorised.
That responsibility is distinct
from the mechanics of receiving an HTTP request,
just as app-system authority is distinct
from the event that woke a handler.

## Small contracts preserve the boundary

`@forge-ahead/triggers` sits beneath this architectural model.
It does not try to become an event bus, a scheduler, a router,
or an authorization system.
Those are application choices,
and their correct form depends on the domain.
Instead, the package supplies narrow contracts
for the common invocation shape
and each trigger family,
plus web-trigger utilities that make Forge's array-valued header rule
difficult to misuse.

The package's restraint is intentional.
A shared handler vocabulary lets an application recognise the common shape
of triggered work,
while family-specific contracts preserve the different meanings of
lifecycle, product, scheduled, and web-trigger invocations.
Pure response and header helpers keep protocol transformations testable.
Caller-owned invocation logging observes the boundary
without owning transport or policy.
The result is a small foundation for a larger architecture:
Forge triggers decide when the backend runs;
application code decides what the resulting fact means.

<!-- markdownlint-disable MD013 -->
[forge-functions]: https://developer.atlassian.com/platform/forge/function-reference/
[forge-events]: https://developer.atlassian.com/platform/forge/events/
[forge-lifecycle-events]: https://developer.atlassian.com/platform/forge/events-reference/life-cycle/
[forge-scheduled-triggers]: https://developer.atlassian.com/platform/forge/manifest-reference/modules/scheduled-trigger/
[forge-trigger-module]: https://developer.atlassian.com/platform/forge/manifest-reference/modules/trigger/
[forge-web-triggers]: https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/
<!-- markdownlint-enable MD013 -->
