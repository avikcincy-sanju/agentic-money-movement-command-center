import { describe, expect, it } from "vitest";
import { AGENTS, POLICIES } from "../../data/seed";
import { evaluateIntent, getHardPolicyFailures } from "../policyEngine";
import type { PaymentIntentRequest } from "../../types";

function request(overrides: Partial<PaymentIntentRequest> = {}): PaymentIntentRequest {
  return {
    agentId: AGENTS[0].id,
    purpose: AGENTS[0].purpose,
    maxAmount: 475,
    merchant: "Northstar Cloud",
    merchantCategory: "cloud_infrastructure",
    country: "US",
    preferredSettlementCurrency: "USD",
    requestedBy: Date.now() + 60 * 60_000,
    ...overrides,
  };
}

describe("policy engine", () => {
  it("approves a request that passes all enabled controls", () => {
    const result = evaluateIntent(request(), AGENTS[0], POLICIES);
    expect(result.decision).toBe("approved");
    expect(result.evaluations.every((evaluation) => evaluation.passed)).toBe(true);
  });

  it("declines a request from an unapproved country", () => {
    const result = evaluateIntent(request({ country: "XX" }), AGENTS[0], POLICIES);
    expect(result.decision).toBe("declined");
    expect(result.evaluations.find((evaluation) => evaluation.policyId === "policy-geography")?.passed).toBe(false);
  });

  it("treats the human approval threshold as a soft failure", () => {
    const result = evaluateIntent(request({ maxAmount: 1000 }), AGENTS[0], POLICIES);
    expect(result.decision).toBe("human_approval_required");
    expect(getHardPolicyFailures(result.evaluations, POLICIES)).toHaveLength(0);
  });

  it("catches a modified approval amount that breaches hard limits", () => {
    const result = evaluateIntent(request({ maxAmount: 100_000 }), AGENTS[0], POLICIES);
    const hardFailures = getHardPolicyFailures(result.evaluations, POLICIES);
    expect(result.decision).toBe("declined");
    expect(hardFailures.some((failure) => failure.policyId === "policy-max-tx")).toBe(true);
  });
});
