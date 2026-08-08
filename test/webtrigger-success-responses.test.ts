import { describe, expect, it } from "vitest";

import {
  buildEmptySuccessResponse,
  buildSuccessResponse,
} from "../src/webtrigger.js";

describe("buildSuccessResponse", () => {
  it("serializes a supplied JSON value into a Forge-compatible response", () => {
    expect(
      buildSuccessResponse({ orderId: "order-123", accepted: true }),
    ).toEqual({
      body: '{"orderId":"order-123","accepted":true}',
      headers: { "content-type": ["application/json"] },
      statusCode: 200,
      statusText: "OK",
    });
  });

  it("uses the documented payload when no JSON value is supplied", () => {
    expect(buildSuccessResponse()).toEqual({
      body: '{"message":"OK"}',
      headers: { "content-type": ["application/json"] },
      statusCode: 200,
      statusText: "OK",
    });
  });
});

describe("buildEmptySuccessResponse", () => {
  it("returns exactly an empty 204 No Content response", () => {
    expect(buildEmptySuccessResponse()).toEqual({
      statusCode: 204,
      statusText: "No Content",
    });
  });
});
