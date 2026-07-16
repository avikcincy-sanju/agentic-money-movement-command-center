import { describe, expect, it } from "vitest";

import {
  AGENTS,
  POLICIES,
  deriveCredentialStatus,
} from "../../data/seed";
import { suggestedAmountForScenario } from "../../lib/scenario";
import type {
  PaymentIntentRequest,
  RouteDecision,
} from "../../types";
import { detectIncidents } from "../incidentEngine";
import { buildTransaction } from "../lifecycleEngine";
import {
  evaluateIntent,
  isValidTransactionAmount,
} from "../policyEngine";

function request(
  overrides: Partial<PaymentIntentRequest> = {},
): PaymentIntentRequest {
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

describe("audit hardening", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid amount %s",
    (amount) => {
      expect(isValidTransactionAmount(amount)).toBe(false);
      const result = evaluateIntent(
        request({ maxAmount: amount }),
        AGENTS[0],
        POLICIES,
      );
      expect(result.decision).toBe("declined");
      expect(
        result.evaluations.some(
          (evaluation) =>
            evaluation.policyId === "input-valid-amount" &&
            !evaluation.passed,
        ),
      ).toBe(true);
    },
  );

  it("creates a policy-violation amount above every selected agent limit", () => {
    for (const agent of AGENTS) {
      expect(
        suggestedAmountForScenario(
          "policy_violation",
          agent.perTransactionLimit,
        ),
      ).toBeGreaterThan(agent.perTransactionLimit);
    }
  });

  it("derives valid, expiring, and expired credential states from dates", () => {
    const now = Date.parse("2026-07-16T12:00:00Z");
    expect(deriveCredentialStatus("2026-11-01", now)).toBe(
      "valid",
    );
    expect(deriveCredentialStatus("2026-07-28", now)).toBe(
      "expiring_soon",
    );
    expect(deriveCredentialStatus("2026-07-15", now)).toBe(
      "expired",
    );
  });

  it("creates a routing incident when no compliant rail is available", () => {
    const intent = evaluateIntent(
      request(),
      AGENTS[0],
      POLICIES,
    );
    const route: RouteDecision = {
      intentId: intent.intentId,
      candidates: [],
      selectedRail: null,
      reason:
        "No eligible rail can satisfy the request deadline and controls.",
      timestamp: Date.now(),
    };
    const transaction = buildTransaction(
      intent,
      route,
      AGENTS[0].id,
      "happy_path",
    );
    const incidents = detectIncidents(transaction);

    expect(transaction.status).toBe("blocked");
    expect(
      incidents.some(
        (incident) => incident.type === "no_eligible_rail",
      ),
    ).toBe(true);
  });
});
