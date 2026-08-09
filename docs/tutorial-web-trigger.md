# Tutorial: return JSON from a Forge web trigger

In this tutorial, you will create a Forge web trigger that returns the
caller-controlled part of its URL as JSON. The handler uses
`@forge-ahead/triggers` to produce a Forge-compatible response.

## Before you start

This tutorial assumes that your Forge app already has
`@forge-ahead/triggers` available as a dependency and that you can deploy the
app with the Forge CLI.

## 1. Declare a dynamic web trigger

Add a function and a [web trigger module][forge-web-triggers] to your app's `manifest.yml`.

```yaml
modules:
  function:
    - key: path-handler
      handler: index.run
  webtrigger:
    - key: path-web-trigger
      function: path-handler
      urlFormat: v2
      response:
        type: dynamic
```

## 2. Create the handler

Create `src/index.ts` in your Forge app with this handler:

```ts
import {
  buildSuccessResponse,
  defineWebTrigger,
} from "@forge-ahead/triggers/webtrigger";

export const run = defineWebTrigger((event) =>
  buildSuccessResponse({ userPath: event.userPath }),
);
```

`buildSuccessResponse` serializes the object and supplies the `200 OK` status
and JSON content type.

## 3. Deploy and install the app

Deploy the app and install or upgrade it in a development site:

```sh
forge deploy
forge install
```

## 4. Create a web-trigger URL

Create a URL for the configured web trigger with the [Forge webtrigger CLI][forge-webtrigger-cli]:

```sh
forge webtrigger create
```

Choose the development installation and the `path-web-trigger` function when
prompted. Keep the generated URL private while you are learning; Forge does
not add [platform authentication][forge-web-triggers] to web-trigger URLs.

## 5. Call the trigger with a path

Append `/orders/42` to the generated URL and send a request:

```sh
curl "https://your-web-trigger-url/orders/42"
```

The response body is JSON equivalent to:

```json
{"userPath":"/orders/42"}
```

You have now returned a typed, Forge-compatible JSON response. The complete
request path remains available as `event.path`, while
[`event.userPath`][forge-web-trigger-events] is the suffix after the
web-trigger identifier.

<!-- markdownlint-disable MD013 -->
[forge-web-triggers]: https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/
[forge-webtrigger-cli]: https://developer.atlassian.com/platform/forge/cli-reference/webtrigger/
[forge-web-trigger-events]: https://developer.atlassian.com/platform/forge/events-reference/web-trigger/
<!-- markdownlint-enable MD013 -->
