import type { Incident, Transaction } from "../types";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function detectIncidents(
  tx: Transaction,
): Incident[] {
  const incidents: Incident[] = [];

  const reconciliationStage = tx.stages.find(
    (stage) => stage.name === "reconciliation",
  );

  const bankStage = tx.stages.find(
    (stage) => stage.name === "bank_credit",
  );

  const settlementStage = tx.stages.find(
    (stage) => stage.name === "settlement",
  );

  if (
    reconciliationStage?.status === "exception" &&
    bankStage &&
    settlementStage
  ) {
    const exposure =
      Math.round(
        ((settlementStage.amount ?? 0) -
          (bankStage.amount ?? 0)) *
          100,
      ) / 100;

    incidents.push({
      id: makeId("inc"),
      transactionId: tx.id,
      type: "settlement_mismatch",
      severity:
        exposure > 10 ? "high" : "medium",
      detectedAt:
        reconciliationStage.actualAt ??
        Date.now(),
      summary:
        `Settlement mismatch on ${tx.id}: ` +
        `processor settlement file shows ` +
        `$${settlementStage.amount?.toFixed(
          2,
        )}, bank credited ` +
        `$${bankStage.amount?.toFixed(2)}.`,
      financialExposure: exposure,
      systemsAffected: [
        "Processor",
        "Settlement Bank",
        "Reconciliation Engine",
      ],
      probableCause:
        "Reserve or fee deduction applied at settlement was not reflected in the bank credit. The most common causes are an unreported reserve withholding or an FX rounding difference in the settlement batch.",
      recommendedAction:
        `Compare reserve ledger entries against settlement batch ` +
        `${settlementStage.identifier} and confirm whether the ` +
        `$${exposure.toFixed(
          2,
        )} difference was intentionally withheld or is a processor error requiring a corrective journal entry.`,
      suggestedOwner:
        "Finance Operations — Settlement Reconciliation",
      status: "open",
      auditEvidence: [
        settlementStage.identifier,
        bankStage.identifier,
        reconciliationStage.identifier,
      ],
    });
  }

  const policyStage = tx.stages.find(
    (stage) =>
      stage.name === "policy_validation",
  );

  if (
    tx.status === "blocked" &&
    policyStage?.status === "exception"
  ) {
    incidents.push({
      id: makeId("inc"),
      transactionId: tx.id,
      type: "agent_limit_exceeded",
      severity: "low",
      detectedAt:
        policyStage.actualAt ?? Date.now(),
      summary:
        `Agent request blocked at policy validation: ` +
        tx.intent.explanation,
      financialExposure: 0,
      systemsAffected: ["Policy Engine"],
      probableCause:
        "The requested amount, merchant category, geography, or cumulative daily spend fell outside the agent's approved policy configuration.",
      recommendedAction:
        "Review the failed policy checks. Route the request for human review when appropriate, or adjust the agent's policy configuration if this type of transaction should be permitted in the future.",
      suggestedOwner: tx.intent.request.agentId,
      status: "open",
      auditEvidence: [policyStage.identifier],
    });
  }

  return incidents;
}
