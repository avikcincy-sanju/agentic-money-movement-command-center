import type { Incident, Transaction } from "../types";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function detectIncidents(tx: Transaction): Incident[] {
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
      severity: exposure > 10 ? "high" : "medium",
      detectedAt: reconciliationStage.actualAt ?? Date.now(),
      summary:
        `Settlement mismatch on ${tx.id}: ` +
        `processor settlement file shows ` +
        `$${settlementStage.amount?.toFixed(2)}, bank credited ` +
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
        `$${exposure.toFixed(2)} difference was intentionally withheld or is a processor error requiring a corrective journal entry.`,
      suggestedOwner: "Finance Operations — Settlement Reconciliation",
      status: "open",
      auditEvidence: [
        settlementStage.identifier,
        bankStage.identifier,
        reconciliationStage.identifier,
      ],
    });
  }

  const policyStage = tx.stages.find(
    (stage) => stage.name === "policy_validation",
  );

  if (
    tx.status === "blocked" &&
    policyStage?.status === "exception"
  ) {
    incidents.push({
      id: makeId("inc"),
      transactionId: tx.id,
      type: "policy_block",
      severity: "low",
      detectedAt: policyStage.actualAt ?? Date.now(),
      summary:
        `Agent request blocked at policy validation: ` +
        tx.intent.explanation,
      financialExposure: 0,
      systemsAffected: ["Policy Engine"],
      probableCause:
        "The request failed one or more mandatory input, credential, transaction-limit, merchant-category, daily-velocity, or geography controls.",
      recommendedAction:
        "Review the failed checks. Route the request for human review when appropriate, or update the approved policy configuration only when the business control should genuinely change.",
      suggestedOwner: "Agent Governance — Policy Operations",
      status: "open",
      auditEvidence: [policyStage.identifier],
    });
  }

  const routingStage = tx.stages.find(
    (stage) => stage.name === "credential_provisioning",
  );

  if (
    tx.status === "blocked" &&
    policyStage?.status === "completed" &&
    routingStage?.status === "exception"
  ) {
    incidents.push({
      id: makeId("inc"),
      transactionId: tx.id,
      type: "no_eligible_rail",
      severity: "medium",
      detectedAt: routingStage.actualAt ?? Date.now(),
      summary: `No eligible payment rail was available for ${tx.id}.`,
      financialExposure: 0,
      systemsAffected: [
        "Routing Engine",
        "Payment Orchestration Engine",
      ],
      probableCause:
        routingStage.note ??
        "All permitted rails were ineligible because of deadline, credential, acceptance, or policy constraints.",
      recommendedAction:
        "Review the requested completion deadline and the agent's authorized rails. Extend the deadline, enable an approved rail, or route the request to Payments Operations for an alternate compliant path.",
      suggestedOwner: "Payments Operations — Routing",
      status: "open",
      auditEvidence: [routingStage.identifier],
    });
  }

  return incidents;
}
