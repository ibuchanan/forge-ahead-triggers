import { describe, expect, it } from "vitest";

import { extractClientHeaders } from "../src/webtrigger.js";

describe("extractClientHeaders", () => {
  it("returns only approved client headers under canonical lowercase names", () => {
    const headers = {
      "User-Agent": ["browser/1.0"],
      "ATL-TraceId": ["trace-123"],
      authorization: ["Bearer secret"],
      cookie: ["session=secret"],
      host: ["example.atlassian.net"],
    };

    expect(extractClientHeaders(headers)).toEqual({
      "atl-traceid": ["trace-123"],
      "user-agent": ["browser/1.0"],
    });
  });

  it("merges case-variant approved headers in encounter order without sharing arrays", () => {
    const edgeTags = ["trusted"];
    const headers = {
      "atl-edge-true-client-ip": ["203.0.113.1"],
      "ATL-EDGE-IP-TAGS": edgeTags,
      "Atl-Edge-Ip-Tags": ["vpn"],
      "user-agent": ["browser/1.0"],
      "User-Agent": ["automation/2.0"],
    };

    const clientHeaders = extractClientHeaders(headers);

    expect(clientHeaders).toEqual({
      "atl-edge-ip-tags": ["trusted", "vpn"],
      "atl-edge-true-client-ip": ["203.0.113.1"],
      "user-agent": ["browser/1.0", "automation/2.0"],
    });

    clientHeaders["atl-edge-ip-tags"].push("modified");

    expect(edgeTags).toEqual(["trusted"]);
  });
});
