import { describe, expect, it, vi } from "vitest";

import { type InvocationContext, withInvocationLogging } from "../src/index.js";

describe("withInvocationLogging", () => {
  it("logs the original event once before a synchronous handler and returns its result", () => {
    const event = { attempt: 1 };
    const context: InvocationContext = {
      installContext: "ari:cloud:ecosystem::app/123",
    };
    const result = { accepted: true };
    const calls: string[] = [];
    const logger = {
      forgeInvocation: vi.fn((observedEvent: unknown) => {
        calls.push("logger");
        expect(observedEvent).toBe(event);
      }),
    };
    const handler = vi.fn((receivedEvent, receivedContext) => {
      calls.push("handler");
      expect(receivedEvent).toBe(event);
      expect(receivedContext).toBe(context);
      return result;
    });

    const loggedHandler = withInvocationLogging(logger, handler);

    expect(loggedHandler(event, context)).toBe(result);
    expect(logger.forgeInvocation).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledOnce();
    expect(calls).toEqual(["logger", "handler"]);
  });

  it("returns a handler-owned promise unchanged after logging the invocation", async () => {
    const event = { attempt: 2 };
    const context: InvocationContext = {
      installContext: "ari:cloud:ecosystem::app/123",
    };
    const result = Promise.resolve({ accepted: true });
    const calls: string[] = [];
    const logger = { forgeInvocation: vi.fn(() => calls.push("logger")) };
    const handler = vi.fn(() => {
      calls.push("handler");
      return result;
    });

    const loggedHandler = withInvocationLogging(logger, handler);
    const returnedResult = loggedHandler(event, context);

    expect(returnedResult).toBe(result);
    await expect(returnedResult).resolves.toEqual({ accepted: true });
    expect(calls).toEqual(["logger", "handler"]);
  });

  it("preserves a handler's synchronous thrown error after logging the invocation", () => {
    const event = { attempt: 3 };
    const context: InvocationContext = {
      installContext: "ari:cloud:ecosystem::app/123",
    };
    const error = new Error("handler failed");
    const calls: string[] = [];
    const logger = { forgeInvocation: vi.fn(() => calls.push("logger")) };
    const handler = vi.fn(() => {
      calls.push("handler");
      throw error;
    });

    const loggedHandler = withInvocationLogging(logger, handler);

    expect(() => loggedHandler(event, context)).toThrow(error);
    expect(calls).toEqual(["logger", "handler"]);
  });

  it("preserves a handler-owned rejected promise after logging the invocation", async () => {
    const event = { attempt: 4 };
    const context: InvocationContext = {
      installContext: "ari:cloud:ecosystem::app/123",
    };
    const error = new Error("handler rejected");
    const result = Promise.reject(error);
    const calls: string[] = [];
    const logger = { forgeInvocation: vi.fn(() => calls.push("logger")) };
    const handler = vi.fn(() => {
      calls.push("handler");
      return result;
    });

    const loggedHandler = withInvocationLogging(logger, handler);
    const returnedResult = loggedHandler(event, context);

    expect(returnedResult).toBe(result);
    await expect(returnedResult).rejects.toBe(error);
    expect(calls).toEqual(["logger", "handler"]);
  });
});
