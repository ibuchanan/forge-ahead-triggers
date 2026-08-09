# How-to: handle Forge web-trigger responses

Use this guide when a [Forge web trigger][forge-web-triggers] is already
declared and you need to return consistent JSON, empty, or error responses
from its handler.

## Return a JSON result

Wrap the handler with `defineWebTrigger` and return
`buildSuccessResponse(value)`:

```ts
import {
  buildSuccessResponse,
  defineWebTrigger,
} from "@forge-ahead/triggers/webtrigger";

export const getOrder = defineWebTrigger((event) =>
  buildSuccessResponse({
    orderId: event.userPath.replace("/orders/", ""),
  }),
);
```

The helper sets `statusCode` to `200`, serializes the JSON value, and
returns an array-valued `content-type` header, matching the [Forge web-trigger
response contract][forge-web-trigger-events].

## Return no body

Use `buildEmptySuccessResponse()` for a successful response that must not
include a body or content type:

```ts
import {
  buildEmptySuccessResponse,
  defineWebTrigger,
} from "@forge-ahead/triggers/webtrigger";

export const removeOrder = defineWebTrigger(() =>
  buildEmptySuccessResponse(),
);
```

## Convert failures to Problem Details

Catch the operation error at the handler boundary and return
`buildErrorResponse`:

```ts
import {
  buildErrorResponse,
  buildSuccessResponse,
  defineWebTrigger,
} from "@forge-ahead/triggers/webtrigger";

export const createOrder = defineWebTrigger(async (event) => {
  try {
    const order = await createOrderFromBody(event.body);
    return buildSuccessResponse(order);
  } catch (error) {
    return buildErrorResponse(error);
  }
});
```

Pass an explicit second argument when the handler must choose the HTTP status;
it overrides a valid status carried by the normalized Problem Details value:

```ts
return buildErrorResponse(error, 422);
```

## Forward approved request metadata

Use `extractClientHeaders` when downstream logging or diagnostics needs the
approved client-header subset:

```ts
import {
  buildSuccessResponse,
  defineWebTrigger,
  extractClientHeaders,
} from "@forge-ahead/triggers/webtrigger";

export const inspectRequest = defineWebTrigger((event) =>
  buildSuccessResponse({ clientHeaders: extractClientHeaders(event.headers) }),
);
```

The result contains only `user-agent`, `atl-traceid`,
`atl-edge-true-client-ip`, and `atl-edge-ip-tags`, with lowercase keys and
copied string arrays. Authenticate the request separately; an allowlisted
header view is not an authentication mechanism.

## Return a custom response

Construct a `WebTriggerResponse` directly when the required response is
neither JSON-bearing success, empty success, nor a Problem Details error. Keep
every header value as a string array:

```ts
import {
  defineWebTrigger,
  type WebTriggerResponse,
} from "@forge-ahead/triggers/webtrigger";

const accepted: WebTriggerResponse = {
  body: "accepted",
  headers: { "content-type": ["text/plain"] },
  statusCode: 202,
  statusText: "Accepted",
};

export const acceptRequest = defineWebTrigger(() => accepted);
```

<!-- markdownlint-disable MD013 -->
[forge-web-triggers]: https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/
[forge-web-trigger-events]: https://developer.atlassian.com/platform/forge/events-reference/web-trigger/
<!-- markdownlint-enable MD013 -->
