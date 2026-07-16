import { describe, expect, it } from "vitest";

import { askCopilot } from "../copilot";

import type {
  AuditEvent,
  Transaction,
} from "../../types";

const tx: Transaction = {
  id: "txn-test-1",
  agentId: "agent-test",

  intent: {
    intentId: "intent-test",

    request: {
      agentId: "agent-test",
      purpose: "Test",
      maxAmount: 100,
      merchant: "Merchant",
      merchantCategory: "saas",
      country: "US",
      preferredSettlementCurrency: "USD",
      requestedBy:
        Date.now() + 60_000,
    },

    decision: "approved",
    evaluations: [],
    explanation: "Approved.",
    timestamp: Date.now(),
  },

  route: {
    intentId: "intent-test",
    candidates: [],
    selectedRail: "card",
    reason: "Card won.",
    timestamp: Date.now(),
  },

  stages: [
    {
      name: "reconciliation",
      system:
        "Reconciliation Engine",
      status: "completed",
      amount: 0,
      currency: "USD",
      identifier: "REC-1",
      expectedAt: Date.now(),
      actualAt: Date.now(),
    },
  ],

  fees: {
    processingFee: 3.2,
    platformFee: 0.25,
    reserve: 2,
    expectedNetToMerchant: 94.55,
    actualBankCredit: 94.55,
    reconciliationDifference: 0,
  },

  createdAt: Date.now(),
  scenario: "happy_path",
  status: "reconciled",
};

const auditEvent: AuditEvent = {
  id: "evt-real-audit-id",
  timestamp: Date.now(),
  actor:
    "Reconciliation Engine",
  action: "stage_completed",
  transactionId: tx.id,
  detail:
    "REC-1 · reconciliation: completed",
};

describe(
  "investigation copilot",
  () => {
    it(
      "cites actual audit event IDs",
      () => {
        const answer =
          askCopilot(
            "Where is the money now?",
            {
              transactions: [tx],
              incidents: [],
              agents: [],
              approvalTasks: [],
              auditLog: [
                auditEvent,
              ],
            },
          );

        expect(
          answer.answer,
        ).toContain(
          "reconciled cleanly",
        );

        expect(
          answer.citedEventIds,
        ).toEqual([
          "evt-real-audit-id",
        ]);
      },
    );
  },
);
