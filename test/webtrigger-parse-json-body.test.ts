import { describe, expect, it } from "vitest";

import {
  buildErrorCodeResponse,
  parseJsonBody,
  type WebTriggerEvent,
} from "../src/webtrigger.js";

interface SeedRequest {
  readonly pairingId: string;
  readonly role: "source" | "destination";
}

const isSeedRequest = (value: unknown): value is SeedRequest =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as SeedRequest).pairingId === "string" &&
  ["source", "destination"].includes((value as SeedRequest).role);

const baseEvent: WebTriggerEvent = {
  headers: {},
  method: "POST",
  path: "/trigger",
  queryParameters: {},
  userPath: "/",
};

describe("parseJsonBody", () => {
  it("returns ok(parsed) when the body is valid JSON and passes the guard", () => {
    const body = JSON.stringify({ pairingId: "pair-123", role: "source" });
    const result = parseJsonBody({ ...baseEvent, body }, isSeedRequest);

    expect(result.isOk()).toBe(true);
    expect(result.isOk() ? result.value : null).toEqual({
      pairingId: "pair-123",
      role: "source",
    });
  });

  it("returns err(response) when the body is missing", () => {
    const result = parseJsonBody(baseEvent, isSeedRequest);

    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : null).toEqual({
      body: '{"error":"invalid-request-body"}',
      headers: { "content-type": ["application/json"] },
      statusCode: 400,
    });
  });

  it("returns err(response) when the body is empty", () => {
    const result = parseJsonBody({ ...baseEvent, body: "" }, isSeedRequest);

    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : null).toEqual({
      body: '{"error":"invalid-request-body"}',
      headers: { "content-type": ["application/json"] },
      statusCode: 400,
    });
  });

  it("returns err(response) when the body is malformed JSON", () => {
    const result = parseJsonBody(
      { ...baseEvent, body: "{not-json" },
      isSeedRequest,
    );

    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : null).toEqual({
      body: '{"error":"invalid-request-body"}',
      headers: { "content-type": ["application/json"] },
      statusCode: 400,
    });
  });

  it("returns err(response) when the body fails the guard", () => {
    const body = JSON.stringify({ pairingId: "pair-123", role: "unknown" });
    const result = parseJsonBody({ ...baseEvent, body }, isSeedRequest);

    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : null).toEqual({
      body: '{"error":"invalid-request-body"}',
      headers: { "content-type": ["application/json"] },
      statusCode: 400,
    });
  });

  it("uses custom status code, error code, and headers when provided", () => {
    const result = parseJsonBody(baseEvent, isSeedRequest, {
      statusCode: 422,
      errorCode: "invalid-seed-request",
      headers: { "content-type": ["application/json"], "x-custom": ["yes"] },
    });

    expect(result.isErr()).toBe(true);
    expect(result.isErr() ? result.error : null).toEqual({
      body: '{"error":"invalid-seed-request"}',
      headers: {
        "content-type": ["application/json"],
        "x-custom": ["yes"],
      },
      statusCode: 422,
    });
  });
});

describe("buildErrorCodeResponse", () => {
  it("serializes a domain error body with default JSON headers", () => {
    expect(buildErrorCodeResponse(400, { error: "invalid-seed-role" })).toEqual(
      {
        body: '{"error":"invalid-seed-role"}',
        headers: { "content-type": ["application/json"] },
        statusCode: 400,
      },
    );
  });

  it("includes detail when provided", () => {
    expect(
      buildErrorCodeResponse(400, {
        error: "invalid-seed-request",
        detail: "Missing pairingId",
      }),
    ).toEqual({
      body: '{"error":"invalid-seed-request","detail":"Missing pairingId"}',
      headers: { "content-type": ["application/json"] },
      statusCode: 400,
    });
  });

  it("uses custom headers when provided", () => {
    expect(
      buildErrorCodeResponse(
        503,
        { error: "service-unavailable" },
        { "content-type": ["application/json"], "retry-after": ["60"] },
      ),
    ).toEqual({
      body: '{"error":"service-unavailable"}',
      headers: { "content-type": ["application/json"], "retry-after": ["60"] },
      statusCode: 503,
    });
  });
});
