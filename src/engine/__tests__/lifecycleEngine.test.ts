import { describe, expect, it } from "vitest";

import {
  AGENTS,
  POLICIES,
} from "../../data/seed";

import { evaluateIntent } from "../policyEngine";
import { selectRail } from "../routingEngine";
import { buildTransaction } from "../lifecycleEngine";

import type {
  PaymentIntentRequest,
} from "../../types";

function approvedRequest(): PaymentIntentRequest {
  return {
    agentId: AGENTS[0].id,
    purpose: AGENTS[0].purpose,
    maxAmount: 640,
    merchant: "AWS",
    merchantCategory: "cloud_infrastructure",
    country: "US",
    preferredSettlementCurrency: "USD",
    requestedBy:
      Date.now() + 60 * 60_000,
  };
}

describe("lifecycle engine", () => {
  it("preserves expected settlement and actual bank credit separately", () => {
    const request = approvedRequest();

    const intent = evaluateIntent(
      request,
      AGENTS[0],
      POLICIES,
    );

    const route = selectRail(
      request,
      AGENTS[0],
      POLICIES,
      intent.intentId,
      1,
    );

    const tx = buildTransaction(
      intent,
      route,
      AGENTS[0].id,
      "settlement_mismatch",
    );

    expect(tx.status).toBe(
      "exception",
    );

    expect(
      tx.fees
        ?.expectedNetToMerchant,
    ).toBeGreaterThan(
      tx.fees?.actualBankCredit ?? 0,
    );

    expect(
      tx.fees
        ?.reconciliationDifference,
    ).toBeCloseTo(13.44, 2);

    expect(
      tx.stages.find(
        (stage) =>
          stage.name === "settlement",
      )?.amount,
    ).toBe(
      tx.fees
        ?.expectedNetToMerchant,
    );

    expect(
      tx.stages.find(
        (stage) =>
          stage.name === "bank_credit",
      )?.amount,
    ).toBe(
      tx.fees?.actualBankCredit,
    );
  });

  it("lets a policy-violation scenario proceed when policies actually approve it", () => {
    const request = approvedRequest();

    const intent = evaluateIntent(
      request,
      AGENTS[0],
      POLICIES,
    );

    const route = selectRail(
      request,
      AGENTS[0],
      POLICIES,
      intent.intentId,
      2,
    );

    const tx = buildTransaction(
      intent,
      route,
      AGENTS[0].id,
      "policy_violation",
    );

    expect(intent.decision).toBe(
      "approved",
    );

    expect(tx.status).toBe(
      "reconciled",
    );

    expect(tx.stages).toHaveLength(
      10,
    );
  });
});
