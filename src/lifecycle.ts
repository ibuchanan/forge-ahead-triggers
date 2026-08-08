/**
 * Lifecycle trigger contracts.
 */
import type { TriggerHandler } from "./core.js";

/** Details about the Forge app involved in a lifecycle invocation. */
export interface LifecycleApp {
  id: string;
  name: string;
  ownerAccountId: string;
  version: string;
}

/** Details about the Forge environment receiving a lifecycle invocation. */
export interface LifecycleEnvironment {
  id: string;
}

/** An event emitted when a Forge app is installed. */
export type InstallationEvent = {
  app: LifecycleApp;
  environment?: LifecycleEnvironment;
  id: string;
  installerAccountId?: string;
};

/** An event emitted when a Forge app is upgraded. */
export type UpgradeEvent = {
  app: LifecycleApp;
  environment?: LifecycleEnvironment;
  id: string;
  upgraderAccountId?: string;
};

/** A Forge app lifecycle event. */
export type LifecycleEvent = InstallationEvent | UpgradeEvent;

/** A handler for Forge app lifecycle events. */
export type LifecycleHandler<Event extends LifecycleEvent = LifecycleEvent> =
  TriggerHandler<Event>;
