import type { Transaction } from "../types";

export function suggestedAmountForScenario(
  scenario: Transaction["scenario"],
  perTransactionLimit: number,
): number {
  if (scenario === "policy_violation") {
    const overage = Math.max(500, perTransactionLimit * 0.1);
    return Math.round((perTransactionLimit + overage) * 100) / 100;
  }

  const safeInPolicyAmount = Math.max(
    0.01,
    perTransactionLimit - 0.01,
  );

  return scenario === "settlement_mismatch"
    ? Math.min(640, safeInPolicyAmount)
    : Math.min(475, safeInPolicyAmount);
}
