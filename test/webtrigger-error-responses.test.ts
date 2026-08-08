import { describe, expect, it } from "vitest";

import { buildErrorResponse } from "../src/webtrigger.js";

describe("buildErrorResponse", () => {
  it("normalizes an unknown error into a Forge Problem Details response", () => {
    expect(buildErrorResponse(new Error("Database unavailable"))).toEqual({
      body: expect.stringMatching(
        /^\{"type":"https:\/\/httpstatuses\.io\/500","title":"Internal Server Error","status":500,"detail":"Database unavailable","timestamp":"[^"\\]+"\}$/,
      ),
      headers: { "content-type": ["application/problem+json"] },
      statusCode: 500,
      statusText: "Internal Server Error",
    });
  });

  it("preserves valid domain details unless an explicit status overrides them", () => {
    const conflict = {
      detail: "The order has already shipped.",
      status: 409,
      timestamp: "2026-08-08T14:00:00.000Z",
      title: "Order conflict",
      type: "https://example.test/problems/order-conflict",
    };

    expect(buildErrorResponse(conflict)).toEqual({
      body: JSON.stringify(conflict),
      headers: { "content-type": ["application/problem+json"] },
      statusCode: 409,
      statusText: "Order conflict",
    });
    expect(buildErrorResponse(conflict, 503)).toEqual({
      body: JSON.stringify({ ...conflict, status: 503 }),
      headers: { "content-type": ["application/problem+json"] },
      statusCode: 503,
      statusText: "Order conflict",
    });
  });

  it("falls back to 500 when domain Problem Details has an invalid status", () => {
    const invalidProblem = {
      detail: "The order has already shipped.",
      status: 999,
      timestamp: "2026-08-08T14:00:00.000Z",
      title: "Order conflict",
      type: "https://example.test/problems/order-conflict",
    };

    expect(buildErrorResponse(invalidProblem)).toEqual({
      body: JSON.stringify({ ...invalidProblem, status: 500 }),
      headers: { "content-type": ["application/problem+json"] },
      statusCode: 500,
      statusText: "Order conflict",
    });
  });

  it("uses a deterministic status-specific title when Problem Details has no title", () => {
    const untitledProblem = {
      detail: "Validation failed.",
      status: 422,
      timestamp: "2026-08-08T14:00:00.000Z",
      title: "",
      type: "https://example.test/problems/validation",
    };

    expect(buildErrorResponse(untitledProblem)).toEqual({
      body: JSON.stringify(untitledProblem),
      headers: { "content-type": ["application/problem+json"] },
      statusCode: 422,
      statusText: "Error response (422)",
    });
  });
});
