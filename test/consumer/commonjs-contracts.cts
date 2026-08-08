import triggers = require("@forge-ahead/triggers");
import type {
  InstallationEvent,
  LifecycleHandler,
} from "@forge-ahead/triggers/lifecycle";
import type {
  ProductEvent,
  ProductHandler,
} from "@forge-ahead/triggers/product";
import type {
  ScheduledEvent,
  ScheduledHandler,
} from "@forge-ahead/triggers/scheduled";
import webtrigger = require("@forge-ahead/triggers/webtrigger");

const context: triggers.InvocationContext = {
  installContext: "ari:cloud:ecosystem::app/123",
};

const handler: triggers.TriggerHandler<
  { attempt: number },
  { accepted: boolean }
> = (event) => ({ accepted: event.attempt === 1 });

const logger: triggers.InvocationLogger = {
  forgeInvocation: () => undefined,
};

const loggedHandler = triggers.withInvocationLogging(logger, handler);

const lifecycleHandler: LifecycleHandler<InstallationEvent> = (event) => {
  const installerAccountId: string | undefined = event.installerAccountId;
  void installerAccountId;
};

const productHandler: ProductHandler = (event) => {
  const productEvent: ProductEvent = event;
  void productEvent;
};

const scheduledHandler: ScheduledHandler = (event) => {
  const scheduledEvent: ScheduledEvent = event;
  void scheduledEvent;
};

const webTriggerHandler = webtrigger.defineWebTrigger(() => ({
  headers: { "content-type": ["text/plain"] },
  statusCode: 200,
}));

void loggedHandler({ attempt: 1 }, context);
void lifecycleHandler;
void productHandler;
void scheduledHandler;
void webTriggerHandler;
