/* oxlint-disable react/only-export-components */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  AGENTS,
  MERCHANTS_BY_CATEGORY,
  POLICIES,
} from "../data/seed";
import {
  evaluateIntent,
  getHardPolicyFailures,
} from "../engine/policyEngine";
import { selectRail } from "../engine/routingEngine";
import {
  buildPendingApprovalTransaction,
  buildResumedTransaction,
  buildTransaction,
} from "../engine/lifecycleEngine";
import { detectIncidents } from "../engine/incidentEngine";
import type {
  Agent,
  ApprovalDecision,
  ApprovalTask,
  AuditEvent,
  Incident,
  IntentResult,
  PaymentIntentRequest,
  Policy,
  Transaction,
} from "../types";

export interface ScenarioParams {
  agentId: string;
  merchantCategory: string;
  merchant: string;
  amount: number;
  country: string;
  deadlineMinutes: number;
  scenario: Transaction["scenario"];
}

interface StoreState {
  agents: Agent[];
  policies: Policy[];
  transactions: Transaction[];
  incidents: Incident[];
  auditLog: AuditEvent[];
  approvalTasks: ApprovalTask[];
}

interface StoreApi extends StoreState {
  resetDemo: () => void;
  togglePolicy: (id: string) => void;
  runScenario: (params: ScenarioParams) => Transaction;
  resolveIncident: (id: string) => void;
  merchantsFor: (category: string) => string[];
  decideApproval: (
    taskId: string,
    decision: ApprovalDecision,
    approver: string,
    modifiedAmount?: number,
  ) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

let seedCounter = 0;

function nextSeed() {
  seedCounter += 1;
  return seedCounter;
}

function logEvent(
  actor: string,
  action: string,
  detail: string,
  transactionId?: string,
): AuditEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    actor,
    action,
    detail,
    transactionId,
  };
}

function evaluationEvents(
  intent: IntentResult,
  transactionId: string,
  summaryAction = "intent_evaluated",
): AuditEvent[] {
  return [
    logEvent(
      "policy_engine",
      summaryAction,
      intent.explanation,
      transactionId,
    ),
    ...intent.evaluations.map((evaluation) =>
      logEvent(
        "policy_engine",
        evaluation.passed ? "policy_passed" : "policy_failed",
        `${evaluation.policyName}: ${evaluation.reason}`,
        transactionId,
      ),
    ),
  ];
}

function lifecycleEvents(transaction: Transaction): AuditEvent[] {
  return transaction.stages.map((stage) =>
    logEvent(
      stage.system,
      `stage_${stage.status}`,
      `${stage.identifier} · ${stage.name.replace(/_/g, " ")}: ${stage.status}${
        stage.note ? ` — ${stage.note}` : ""
      }`,
      transaction.id,
    ),
  );
}

function transactionMovedFunds(transaction: Transaction): boolean {
  return (
    transaction.status !== "blocked" &&
    transaction.status !== "awaiting_approval"
  );
}

export function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [policies, setPolicies] = useState<Policy[]>(POLICIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [approvalTasks, setApprovalTasks] = useState<ApprovalTask[]>([]);

  const resetDemo = useCallback(() => {
    seedCounter = 0;

    setAgents(structuredClone(AGENTS));
    setPolicies(structuredClone(POLICIES));
    setTransactions([]);
    setIncidents([]);
    setAuditLog([]);
    setApprovalTasks([]);
  }, []);

  const togglePolicy = useCallback((id: string) => {
    setPolicies((previous) => {
      const target = previous.find((policy) => policy.id === id);

      if (!target) {
        return previous;
      }

      const enabled = !target.enabled;

      setAuditLog((events) => [
        logEvent(
          "human:operator",
          "policy_toggled",
          `${target.name} (${id}) ${enabled ? "enabled" : "disabled"}.`,
        ),
        ...events,
      ]);

      return previous.map((policy) =>
        policy.id === id
          ? {
              ...policy,
              enabled,
            }
          : policy,
      );
    });
  }, []);

  const merchantsFor = useCallback((category: string) => {
    return MERCHANTS_BY_CATEGORY[category] ?? [];
  }, []);

  const runScenario = useCallback(
    (params: ScenarioParams): Transaction => {
      const agent = agents.find(
        (candidate) => candidate.id === params.agentId,
      );
      const now = Date.now();

      const request: PaymentIntentRequest = {
        agentId: params.agentId,
        purpose: agent?.purpose ?? "",
        maxAmount: params.amount,
        merchant: params.merchant,
        merchantCategory: params.merchantCategory,
        country: params.country,
        preferredSettlementCurrency: "USD",
        requestedBy:
          now + Math.max(1, params.deadlineMinutes) * 60_000,
      };

      const intent = evaluateIntent(request, agent, policies);

      if (intent.decision === "human_approval_required") {
        const transaction = buildPendingApprovalTransaction(
          intent,
          params.agentId,
          params.scenario,
        );

        const task: ApprovalTask = {
          id: `appr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          transactionId: transaction.id,
          agentId: params.agentId,
          request,
          intent,
          scenario: params.scenario,
          createdAt: Date.now(),
          status: "pending",
        };

        const events: AuditEvent[] = [
          logEvent(
            params.agentId,
            "intent_submitted",
            `Requested $${params.amount} at ${params.merchant} (${params.merchantCategory}) with a ${params.deadlineMinutes}-minute deadline.`,
            transaction.id,
          ),
          ...evaluationEvents(intent, transaction.id),
          logEvent(
            "policy_engine",
            "approval_requested",
            `Routed to human approval queue as ${task.id}.`,
            transaction.id,
          ),
        ];

        setTransactions((previous) => [transaction, ...previous]);
        setApprovalTasks((previous) => [task, ...previous]);
        setAuditLog((previous) => [
          ...events.reverse(),
          ...previous,
        ]);

        return transaction;
      }

      const route =
        agent &&
        (intent.decision === "approved" ||
          intent.decision === "approved_with_conditions")
          ? selectRail(
              request,
              agent,
              policies,
              intent.intentId,
              nextSeed(),
              now,
            )
          : null;

      const transaction = buildTransaction(
        intent,
        route,
        params.agentId,
        params.scenario,
      );
      const newIncidents = detectIncidents(transaction);

      const events: AuditEvent[] = [
        logEvent(
          params.agentId,
          "intent_submitted",
          `Requested $${params.amount} at ${params.merchant} (${params.merchantCategory}) with a ${params.deadlineMinutes}-minute deadline.`,
          transaction.id,
        ),
        ...evaluationEvents(intent, transaction.id),
      ];

      if (route) {
        events.push(
          logEvent(
            "routing_engine",
            "rail_selected",
            route.reason,
            transaction.id,
          ),
        );
      }

      events.push(...lifecycleEvents(transaction));

      newIncidents.forEach((incident) => {
        events.push(
          logEvent(
            "incident_engine",
            "incident_detected",
            incident.summary,
            transaction.id,
          ),
        );
      });

      setTransactions((previous) => [transaction, ...previous]);
      setIncidents((previous) => [
        ...newIncidents,
        ...previous,
      ]);
      setAuditLog((previous) => [
        ...events.reverse(),
        ...previous,
      ]);

      if (agent && transactionMovedFunds(transaction)) {
        setAgents((previous) =>
          previous.map((candidate) =>
            candidate.id === agent.id
              ? {
                  ...candidate,
                  dailySpent:
                    candidate.dailySpent + params.amount,
                }
              : candidate,
          ),
        );
      }

      return transaction;
    },
    [agents, policies],
  );

  const decideApproval = useCallback(
    (
      taskId: string,
      decision: ApprovalDecision,
      approver: string,
      modifiedAmount?: number,
    ) => {
      const task = approvalTasks.find(
        (candidate) => candidate.id === taskId,
      );

      if (!task || task.status !== "pending") {
        return;
      }

      const agent = agents.find(
        (candidate) => candidate.id === task.agentId,
      );
      const finalAmount =
        modifiedAmount ?? task.request.maxAmount;
      const wasModified =
        finalAmount !== task.request.maxAmount;

      if (decision === "rejected") {
        const decidedAt = Date.now();

        setTransactions((previous) =>
          previous.map((transaction) =>
            transaction.id === task.transactionId
              ? {
                  ...transaction,
                  status: "blocked" as const,
                  stages: transaction.stages.map((stage) =>
                    stage.name === "policy_validation"
                      ? {
                          ...stage,
                          status: "exception" as const,
                          actualAt: decidedAt,
                          note:
                            `Rejected by ${approver}.\n` +
                            `Original request: ${task.intent.explanation}`,
                        }
                      : stage,
                  ),
                }
              : transaction,
          ),
        );

        setApprovalTasks((previous) =>
          previous.map((candidate) =>
            candidate.id === taskId
              ? {
                  ...candidate,
                  status: "resolved",
                  decision: "rejected",
                  decidedBy: approver,
                  decidedAt,
                  note: undefined,
                }
              : candidate,
          ),
        );

        setAuditLog((previous) => [
          logEvent(
            approver,
            "approval_rejected",
            `Rejected ${task.transactionId} (requested $${task.request.maxAmount}).`,
            task.transactionId,
          ),
          ...previous,
        ]);

        return;
      }

      if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
        const note = "Approval amount must be greater than zero.";

        setApprovalTasks((previous) =>
          previous.map((candidate) =>
            candidate.id === taskId
              ? {
                  ...candidate,
                  note,
                }
              : candidate,
          ),
        );

        setAuditLog((previous) => [
          logEvent(
            approver,
            "approval_validation_failed",
            note,
            task.transactionId,
          ),
          ...previous,
        ]);

        return;
      }

      const resumedRequest: PaymentIntentRequest = {
        ...task.request,
        maxAmount: finalAmount,
      };

      const reevaluated = evaluateIntent(
        resumedRequest,
        agent,
        policies,
      );
      const hardFailures = getHardPolicyFailures(
        reevaluated.evaluations,
        policies,
      );

      if (
        !agent ||
        reevaluated.decision === "credential_suspended" ||
        hardFailures.length > 0
      ) {
        const failureReasons = hardFailures
          .map((failure) => failure.reason)
          .join(" ");
        const note =
          "Cannot approve the modified request because hard controls still fail: " +
          `${failureReasons || reevaluated.explanation}`;

        setApprovalTasks((previous) =>
          previous.map((candidate) =>
            candidate.id === taskId
              ? {
                  ...candidate,
                  note,
                }
              : candidate,
          ),
        );

        setAuditLog((previous) => [
          logEvent(
            approver,
            "approval_validation_failed",
            note,
            task.transactionId,
          ),
          ...previous,
        ]);

        return;
      }

      const resumedIntent: IntentResult = {
        ...reevaluated,
        intentId: task.intent.intentId,
        decision: "approved",
        explanation:
          `Approved by ${approver} after human review` +
          `${
            wasModified
              ? ` with the amount adjusted from $${task.request.maxAmount.toLocaleString()} to $${finalAmount.toLocaleString()}`
              : ""
          }.\nAll enabled hard controls passed on revalidation.`,
      };

      const route = selectRail(
        resumedRequest,
        agent,
        policies,
        resumedIntent.intentId,
        nextSeed(),
      );

      const resumedTransaction = buildResumedTransaction(
        task.transactionId,
        resumedIntent,
        route,
        task.agentId,
        task.scenario,
      );
      const newIncidents = detectIncidents(resumedTransaction);
      const decidedAt = Date.now();

      const events: AuditEvent[] = [
        logEvent(
          approver,
          "approval_granted",
          `Approved ${task.transactionId}${
            wasModified
              ? ` at adjusted amount $${finalAmount.toLocaleString()}`
              : ""
          }.`,
          task.transactionId,
        ),
        ...evaluationEvents(
          resumedIntent,
          task.transactionId,
          "intent_revalidated",
        ),
        logEvent(
          "routing_engine",
          "rail_selected",
          route.reason,
          resumedTransaction.id,
        ),
        ...lifecycleEvents(resumedTransaction),
      ];

      newIncidents.forEach((incident) => {
        events.push(
          logEvent(
            "incident_engine",
            "incident_detected",
            incident.summary,
            resumedTransaction.id,
          ),
        );
      });

      setTransactions((previous) =>
        previous.map((transaction) =>
          transaction.id === task.transactionId
            ? resumedTransaction
            : transaction,
        ),
      );
      setIncidents((previous) => [
        ...newIncidents,
        ...previous,
      ]);
      setAuditLog((previous) => [
        ...events.reverse(),
        ...previous,
      ]);
      setApprovalTasks((previous) =>
        previous.map((candidate) =>
          candidate.id === taskId
            ? {
                ...candidate,
                status: "resolved",
                decision: "approved",
                decidedBy: approver,
                decidedAmount: finalAmount,
                decidedAt,
                note: undefined,
              }
            : candidate,
        ),
      );

      if (transactionMovedFunds(resumedTransaction)) {
        setAgents((previous) =>
          previous.map((candidate) =>
            candidate.id === agent.id
              ? {
                  ...candidate,
                  dailySpent:
                    candidate.dailySpent + finalAmount,
                }
              : candidate,
          ),
        );
      }
    },
    [agents, approvalTasks, policies],
  );

  const resolveIncident = useCallback(
    (id: string) => {
      const incident = incidents.find(
        (candidate) => candidate.id === id,
      );

      setIncidents((previous) =>
        previous.map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                status: "resolved",
              }
            : candidate,
        ),
      );

      setAuditLog((previous) => [
        logEvent(
          "human:operator",
          "incident_resolved",
          `Incident ${id} marked resolved.`,
          incident?.transactionId,
        ),
        ...previous,
      ]);
    },
    [incidents],
  );

  const value = useMemo<StoreApi>(
    () => ({
      agents,
      policies,
      transactions,
      incidents,
      auditLog,
      approvalTasks,
      resetDemo,
      togglePolicy,
      runScenario,
      resolveIncident,
      merchantsFor,
      decideApproval,
    }),
    [
      agents,
      policies,
      transactions,
      incidents,
      auditLog,
      approvalTasks,
      resetDemo,
      togglePolicy,
      runScenario,
      resolveIncident,
      merchantsFor,
      decideApproval,
    ],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreApi {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }

  return context;
}
