import type {
  InstallationEvent,
  LifecycleEvent,
  LifecycleHandler,
  UpgradeEvent,
} from "@forge-ahead/triggers/lifecycle";
import type {
  ProductEvent,
  ProductHandler,
} from "@forge-ahead/triggers/product";
import type {
  ScheduledEvent,
  ScheduledHandler,
} from "@forge-ahead/triggers/scheduled";

const installation = {
  app: {
    id: "406d303d-0393-4ec4-ad7c-1435be94583a",
    name: "My App Name",
    ownerAccountId: "3bc8aa0c52dc1b310a791d34",
    version: "9.0.0",
  },
  environment: { id: "23863033-1de4-4ebf-b30d-c906264a1e92" },
  id: "fff8e466-31f4-4c73-a337-c3309dd930dc",
  installerAccountId: "4ad9aa0c52dc1b420a791d12",
} satisfies InstallationEvent;

const upgrade = {
  app: {
    id: "406d303d-0393-4ec4-ad7c-1435be94583a",
    name: "My App Name",
    ownerAccountId: "3bc8aa0c52dc1b310a791d34",
    version: "9.0.0",
  },
  environment: { id: "23863033-1de4-4ebf-b30d-c906264a1e92" },
  id: "fff8e466-31f4-4c73-a337-c3309dd930dc",
  upgraderAccountId: "4ad9aa0c52dc1b420a791d12",
} satisfies UpgradeEvent;

const installationHandler: LifecycleHandler<InstallationEvent> = (
  event,
  context,
) => {
  const installerAccountId: string | undefined = event.installerAccountId;
  void installerAccountId;
  void context.installContext;
};

const upgradeHandler: LifecycleHandler<UpgradeEvent> = (event, context) => {
  const upgraderAccountId: string | undefined = event.upgraderAccountId;
  void upgraderAccountId;
  void context.installContext;
};

const productHandler: ProductHandler = (event, context) => {
  const productEvent: ProductEvent = event;
  void productEvent;
  void context.installContext;
};

const scheduledHandler: ScheduledHandler = (event, context) => {
  const scheduledEvent: ScheduledEvent = event;
  void scheduledEvent;
  void context.installContext;
};

const lifecycleEvent: LifecycleEvent = installation;

void lifecycleEvent;
void installationHandler(installation, {
  installContext: "ari:cloud:ecosystem::app/123",
});
void upgradeHandler(upgrade, {
  installContext: "ari:cloud:ecosystem::app/123",
});
void productHandler({}, { installContext: "ari:cloud:ecosystem::app/123" });
void scheduledHandler({}, { installContext: "ari:cloud:ecosystem::app/123" });
