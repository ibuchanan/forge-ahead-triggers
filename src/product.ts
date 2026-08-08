/**
 * Product trigger contracts.
 */
import type { TriggerEvent, TriggerHandler } from "./core.js";

/** A Forge product-trigger event. */
export type ProductEvent = TriggerEvent;

/** A handler for Forge product-trigger events. */
export type ProductHandler = TriggerHandler<ProductEvent>;
