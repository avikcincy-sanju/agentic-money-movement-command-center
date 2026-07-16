import { describe, expect, it } from "vitest";

import {
  AGENTS,
  POLICIES,
} from "../../data/seed";

import {
  scoreRails,
  selectRail,
} from "../routingEngine";

import type {
  Agent,
  PaymentIntentRequest,
  Policy,
} from "../../types";

const now = 1_700_000_000_000;

function request(
  overrides: Partial<PaymentIntentRequest> = {},
): PaymentIntentRequest {
  return {
    agentId: "agent-test",
    purpose: "Test routing",
    maxAmount: 100,
    merchant: "Test Merchant",
    merchantCategory: "saas",
    country: "US",
    preferredSettlementCurrency: "USD",
    requestedBy:
      now + 2_000 * 60_000,
    ...overrides,
  };
}

function routingAgent(
  overrides: Partial<Agent> = {},
): Agent {
  return {
    ...AGENTS[0],
    id: "agent-test",
    name: "Routing Test Agent",
    allowedRails: [
      "ach",
      "stablecoin",
    ],
    ...overrides,
  };
}

function withStablecoinPolicy(
  enabled: boolean,
): Policy[] {
  return POLICIES.map(
    (policy) =>
      policy.kind ===
      "stablecoin_eligibility"
        ? {
            ...policy,
            enabled,
          }
        : policy,
  );
}

describe("routing engine", () => {
  it("makes ACH ineligible when it cannot meet the deadline", () => {
    const candidates = scoreRails(
      request({
        requestedBy:
          now + 30 * 60_000,
      }),
      routingAgent(),
      POLICIES,
      1,
      now,
    );

    const ach = candidates.find(
      (candidate) =>
        candidate.rail === "ach",
    );

    expect(
      ach?.meetsDeadline,
    ).toBe(false);

    expect(
      ach?.eligible,
    ).toBe(false);

    expect(
      ach?.ineligibleReason,
    ).toContain("cannot meet");
  });

  it("enforces the configured stablecoin savings threshold when enabled", () => {
    const candidates = scoreRails(
      request(),
      routingAgent(),
      withStablecoinPolicy(true),
      1,
      now,
    );

    const stablecoin =
      candidates.find(
        (candidate) =>
          candidate.rail ===
          "stablecoin",
      );

    expect(
      stablecoin?.eligible,
    ).toBe(false);

    expect(
      stablecoin?.ineligibleReason,
    ).toContain(
      "configured 1% threshold",
    );
  });

  it("allows stablecoin to compete normally when the policy is disabled", () => {
    const candidates = scoreRails(
      request(),
      routingAgent(),
      withStablecoinPolicy(false),
      1,
      now,
    );

    const stablecoin =
      candidates.find(
        (candidate) =>
          candidate.rail ===
          "stablecoin",
      );

    expect(
      stablecoin?.eligible,
    ).toBe(true);
  });

  it("returns a route decision with cost and deadline evidence", () => {
    const route = selectRail(
      request({
        requestedBy:
          now + 30 * 60_000,
      }),
      routingAgent({
        allowedRails: [
          "stablecoin",
        ],
      }),
      POLICIES,
      "intent-test",
      1,
      now,
    );

    expect(
      route.selectedRail,
    ).toBe("stablecoin");

    expect(
      route.reason,
    ).toContain("estimated cost");

    expect(
      route.candidates[0],
    ).toHaveProperty(
      "meetsDeadline",
    );
  });
});
