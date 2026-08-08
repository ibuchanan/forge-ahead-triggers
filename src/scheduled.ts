/**
 * Scheduled trigger contracts.
 */
import type { TriggerEvent, TriggerHandler } from "./core.js";

/** A Forge scheduled-trigger event. */
export type ScheduledEvent = TriggerEvent;

/** A handler for Forge scheduled-trigger events. */
export type ScheduledHandler = TriggerHandler<ScheduledEvent>;
