import { RAIL_BASE } from "../data/seed";
import type {
  FeeBreakdown,
  IntentResult,
  RouteDecision,
  Transaction,
  TxStage,
  TxStageName,
} from "../types";

const STAGE_SEQUENCE: { name: TxStageName; system: string }[] = [
  { name: "agent_intent", system: "Command Center" },
  { name: "policy_validation", system: "Policy Engine" },
  { name: "credential_provisioning", system: "Credential Vault" },
  { name: "authorization", system: "PSP" },
  { name: "capture", system: "PSP" },
  { name: "ledger_posting", system: "Internal Ledger" },
  { name: "settlement", system: "Processor" },
  { name: "bank_credit", system: "Settlement Bank" },
  { name: "erp_posting", system: "ERP" },
  { name: "reconciliation", system: "Reconciliation Engine" },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function computeFees(
  amount: number,
  rail: keyof typeof RAIL_BASE,
): FeeBreakdown {
  const base = RAIL_BASE[rail];

  const processingFee =
    Math.round(
      (amount * (base.costPct / 100) + base.costFlat) * 100,
    ) / 100;

  const platformFee =
    Math.round(amount * 0.0025 * 100) / 100;

  const reserve =
    Math.round(amount * 0.02 * 100) / 100;

  const expectedNetToMerchant =
    Math.round(
      (amount -
        processingFee -
        platformFee -
        reserve) *
        100,
    ) / 100;

  return {
    processingFee,
    platformFee,
    reserve,
    expectedNetToMerchant,
    actualBankCredit: expectedNetToMerchant,
    reconciliationDifference: 0,
  };
}

export function buildPendingApprovalTransaction(
  intent: IntentResult,
  agentId: string,
  scenario: Transaction["scenario"],
): Transaction {
  const txId = makeId("txn");
  const now = Date.now();
  const amount = intent.request.maxAmount;

  const stages: TxStage[] = [
    {
      name: "agent_intent",
      system: "Command Center",
      status: "completed",
      amount,
      currency:
        intent.request.preferredSettlementCurrency,
      identifier: intent.intentId,
      expectedAt: now,
      actualAt: now,
    },
    {
      name: "policy_validation",
      system: "Policy Engine",
      status: "pending",
      amount,
      currency:
        intent.request.preferredSettlementCurrency,
      identifier: `policy-check-${txId}`,
      expectedAt: now + 500,
      actualAt: null,
      note: `Awaiting human approval: ${intent.explanation}`,
    },
  ];

  return {
    id: txId,
    agentId,
    intent,
    route: null,
    stages,
    fees: null,
    createdAt: now,
    scenario,
    status: "awaiting_approval",
  };
}

export function buildResumedTransaction(
  originalTxId: string,
  intent: IntentResult,
  route: RouteDecision | null,
  agentId: string,
  scenario: Transaction["scenario"],
): Transaction {
  const built = buildTransaction(
    intent,
    route,
    agentId,
    scenario,
  );

  return {
    ...built,
    id: originalTxId,
  };
}

function buildBlockedTransaction(
  txId: string,
  now: number,
  intent: IntentResult,
  route: RouteDecision | null,
  agentId: string,
  scenario: Transaction["scenario"],
): Transaction {
  const amount = intent.request.maxAmount;

  const policyDeclined =
    intent.decision === "declined" ||
    intent.decision === "credential_suspended";

  const stages: TxStage[] = [
    {
      name: "agent_intent",
      system: "Command Center",
      status: "completed",
      amount,
      currency:
        intent.request.preferredSettlementCurrency,
      identifier: intent.intentId,
      expectedAt: now,
      actualAt: now,
    },
    {
      name: "policy_validation",
      system: "Policy Engine",
      status: policyDeclined
        ? "exception"
        : "completed",
      amount,
      currency:
        intent.request.preferredSettlementCurrency,
      identifier: `policy-check-${txId}`,
      expectedAt: now + 500,
      actualAt: now + 500,
      note: policyDeclined
        ? intent.explanation
        : "All hard policy controls passed.",
    },
  ];

  if (!policyDeclined) {
    stages.push({
      name: "credential_provisioning",
      system: "Payment Orchestration Engine",
      status: "exception",
      amount,
      currency:
        intent.request.preferredSettlementCurrency,
      identifier: `route-check-${txId}`,
      expectedAt: now + 900,
      actualAt: now + 900,
      note:
        route?.reason ??
        "No route decision was available.",
    });
  }

  return {
    id: txId,
    agentId,
    intent,
    route,
    stages,
    fees: null,
    createdAt: now,
    scenario,
    status: "blocked",
  };
}

/**
 * Builds a transaction's stage journey.
 *
 * The scenario only injects the settlement mismatch.
 * Whether a request is blocked is determined by the
 * policy and routing engines, so disabling a policy can
 * genuinely change the outcome of the same demo scenario.
 */
export function buildTransaction(
  intent: IntentResult,
  route: RouteDecision | null,
  agentId: string,
  scenario: Transaction["scenario"],
): Transaction {
  const txId = makeId("txn");
  const now = Date.now();
  const amount = intent.request.maxAmount;

  const approved =
    intent.decision === "approved" ||
    intent.decision ===
      "approved_with_conditions";

  if (!approved || !route?.selectedRail) {
    return buildBlockedTransaction(
      txId,
      now,
      intent,
      route,
      agentId,
      scenario,
    );
  }

  const rail = route.selectedRail;
  const baseFees = computeFees(amount, rail);

  const isMismatch =
    scenario === "settlement_mismatch";

  const mismatchDelta = isMismatch
    ? Math.round(amount * 0.021 * 100) / 100
    : 0;

  const actualBankCredit =
    Math.round(
      (baseFees.expectedNetToMerchant -
        mismatchDelta) *
        100,
    ) / 100;

  const fees: FeeBreakdown = {
    ...baseFees,
    actualBankCredit,
    reconciliationDifference: mismatchDelta,
  };

  let cursor = now;

  const stages: TxStage[] = STAGE_SEQUENCE.map(
    ({ name, system }) => {
      let stageAmount = amount;

      if (name === "settlement") {
        stageAmount = fees.expectedNetToMerchant;
      }

      if (
        name === "bank_credit" ||
        name === "erp_posting"
      ) {
        stageAmount = fees.actualBankCredit;
      }

      if (name === "reconciliation") {
        stageAmount =
          fees.reconciliationDifference;
      }

      cursor += 400 + Math.random() * 800;

      const stage: TxStage = {
        name,
        system,
        status: "completed",
        amount: stageAmount,
        currency:
          intent.request.preferredSettlementCurrency,
        identifier: `${name
          .toUpperCase()
          .slice(0, 3)}-${txId.slice(-6)}`,
        expectedAt: cursor,
        actualAt: cursor,
      };

      if (
        name === "bank_credit" &&
        isMismatch
      ) {
        stage.note =
          `Processor settlement file indicates ` +
          `$${fees.expectedNetToMerchant.toFixed(
            2,
          )}, but the bank credited ` +
          `$${fees.actualBankCredit.toFixed(2)}.`;
      }

      if (name === "reconciliation") {
        if (isMismatch) {
          stage.status = "exception";
          stage.note =
            `Unreconciled: ` +
            `$${fees.reconciliationDifference.toFixed(
              2,
            )} shortfall between expected processor ` +
            `settlement and actual bank credit.`;
        } else {
          stage.note =
            "Expected settlement and actual bank credit matched.";
        }
      }

      return stage;
    },
  );

  return {
    id: txId,
    agentId,
    intent,
    route,
    stages,
    fees,
    createdAt: now,
    scenario,
    status: isMismatch
      ? "exception"
      : "reconciled",
  };
}
