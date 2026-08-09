# API reference

## Public import paths

```text
@forge-ahead/triggers
@forge-ahead/triggers/lifecycle
@forge-ahead/triggers/product
@forge-ahead/triggers/scheduled
@forge-ahead/triggers/webtrigger
```

## Root exports

### `JSONPrimitive`

`boolean | null | number | string`.

### `JSONValue`

A JSON primitive, an object whose values are JSON values, or an array of JSON
values.

### `TriggerEvent`

`Record<string, JSONValue | undefined>`.

### `InvocationContext`

| Property | Type | Required |
| --- | --- | --- |
| `installContext` | `string` | Yes |
| `principal` | `string` | No |
| `workspaceId` | `string` | No |

### `TriggerHandler<Event, Result>`

A handler receives `event: Event` and `context: InvocationContext`. It returns
`Result` or `Promise<Result>`.

`Event` defaults to `TriggerEvent`. `Result` defaults to `void`.

### `InvocationLogger`

A structural interface with this capability:

```ts
forgeInvocation(event, message?, options?): void
```

### `withInvocationLogging(logger, handler)`

Returns a handler that calls `logger.forgeInvocation(event)` once before
calling `handler(event, context)`. It preserves the original event, context,
return value, promise, and handler errors.

## Lifecycle exports

Forge describes the corresponding platform events in its [lifecycle events reference][forge-lifecycle-events].

Import from `@forge-ahead/triggers/lifecycle`.

### `LifecycleApp`

| Property | Type |
| --- | --- |
| `id` | `string` |
| `name` | `string` |
| `ownerAccountId` | `string` |
| `version` | `string` |

### `LifecycleEnvironment`

| Property | Type |
| --- | --- |
| `id` | `string` |

### `InstallationEvent`

| Property | Type | Required |
| --- | --- | --- |
| `app` | `LifecycleApp` | Yes |
| `environment` | `LifecycleEnvironment` | No |
| `id` | `string` | Yes |
| `installerAccountId` | `string` | No |

### `UpgradeEvent`

| Property | Type | Required |
| --- | --- | --- |
| `app` | `LifecycleApp` | Yes |
| `environment` | `LifecycleEnvironment` | No |
| `id` | `string` | Yes |
| `upgraderAccountId` | `string` | No |

### `LifecycleEvent`

`InstallationEvent | UpgradeEvent`.

### `LifecycleHandler<Event>`

A `TriggerHandler<Event>` where `Event` extends `LifecycleEvent`.

## Product and scheduled exports

Forge groups product, lifecycle, scheduled, and web-trigger inputs in its
[events overview][forge-events-overview].

### `@forge-ahead/triggers/product`

- `ProductEvent` is an alias of `TriggerEvent`.
- `ProductHandler` is an alias of `TriggerHandler<ProductEvent>`.

### `@forge-ahead/triggers/scheduled`

Forge documents the corresponding platform module in its [scheduled trigger reference][forge-scheduled-triggers].

- `ScheduledEvent` is an alias of `TriggerEvent`.
- `ScheduledHandler` is an alias of `TriggerHandler<ScheduledEvent>`.

## Web-trigger exports

Forge documents the platform payload and response model in its
[web-trigger events reference][forge-web-trigger-events].

Import from `@forge-ahead/triggers/webtrigger`.

### `WebTriggerEvent`

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `body` | `string` | No | Request body. |
| `headers` | `Record<string, string[]>` | Yes | Request headers. |
| `method` | `WebTriggerMethod` | Yes | HTTP method from `@forge/api`. |
| `path` | `string` | Yes | Full Forge request path. |
| `queryParameters` | `Record<string, string[]>` | Yes | Parsed query values. |
| `userPath` | `string` | Yes | Path suffix after the trigger ID. |

### `WebTriggerResponse`

Forge's `WebTriggerResponse` type from `@forge/api`.

### `WebTriggerHandler`

A `TriggerHandler<WebTriggerEvent, WebTriggerResponse>`.

### `defineWebTrigger(handler)`

A runtime identity adapter that contextually checks `handler` as a
`WebTriggerHandler`.

### `buildSuccessResponse(value?)`

Input: an optional `JSONValue`; the default is `{ message: "OK" }`.

Output: a `200 OK` response with a JSON-serialized body and this header:

```text
content-type: ["application/json"]
```

### `buildEmptySuccessResponse()`

Output: a `204 No Content` response with no body and no headers.

### `buildErrorResponse(error, status?)`

Input: an unknown error and an optional numeric status.

Output: a Problem Details JSON response with this header:

```text
content-type: ["application/problem+json"]
```

An explicit status wins. Otherwise, the helper preserves a valid normalized
Problem Details status; when no valid status exists, it uses `500`.

### `extractClientHeaders(headers)`

Input: `Record<string, string[]>`.

Output: a new header object containing only the allowed headers under canonical
lowercase names. Matching is case-insensitive, case variants are merged in
encounter order, and output arrays are copies.

Allowed headers:

```text
user-agent
atl-traceid
atl-edge-true-client-ip
atl-edge-ip-tags
```

## Compatibility

The package builds ESM and CommonJS artifacts. Consumer fixtures type-check
only the documented root and subpath imports.

<!-- markdownlint-disable MD013 -->
[forge-lifecycle-events]: https://developer.atlassian.com/platform/forge/events-reference/life-cycle/
[forge-events-overview]: https://developer.atlassian.com/platform/forge/events-reference/
[forge-scheduled-triggers]: https://developer.atlassian.com/platform/forge/manifest-reference/modules/scheduled-trigger/
[forge-web-trigger-events]: https://developer.atlassian.com/platform/forge/events-reference/web-trigger/
<!-- markdownlint-enable MD013 -->
