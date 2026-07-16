import type {
  Agent,
  ApprovalTask,
  AuditEvent,
  CopilotAnswer,
  Incident,
  Transaction,
} from "../types";

interface CopilotContext {
  transactions: Transaction[];
  incidents: Incident[];
  agents: Agent[];
  approvalTasks: ApprovalTask[];
  auditLog: AuditEvent[];
}

function mostRecentTransaction(
  transactions: Transaction[],
): Transaction | undefined {
  return [...transactions].sort(
    (a, b) => b.createdAt - a.createdAt,
  )[0];
}

function findTxByRef(
  question: string,
  transactions: Transaction[],
): Transaction | undefined {
  const idMatch = question.match(/txn-[a-z0-9-]+/i);

  if (idMatch) {
    return transactions.find(
      (transaction) =>
        transaction.id.toLowerCase() ===
        idMatch[0].toLowerCase(),
    );
  }

  return mostRecentTransaction(transactions);
}

function auditEventsForTransaction(
  auditLog: AuditEvent[],
  transactionId: string,
  actions?: string[],
): AuditEvent[] {
  return auditLog
    .filter(
      (event) =>
        event.transactionId === transactionId &&
        (!actions ||
          actions.some((action) =>
            event.action.includes(action),
          )),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

function cite(
  events: AuditEvent[],
  limit = 8,
): string[] {
  return [
    ...new Set(
      events
        .slice(-limit)
        .map((event) => event.id),
    ),
  ];
}

export function askCopilot(
  question: string,
  ctx: CopilotContext,
): CopilotAnswer {
  const q = question.toLowerCase();

  const tx = findTxByRef(
    question,
    ctx.transactions,
  );

  if (
    /where.*(money|funds)/i.test(q) ||
    /\bstatus\b/.test(q)
  ) {
    if (!tx) {
      return {
        question,
        answer:
          "No transactions exist in the current session yet.",
        citedEventIds: [],
      };
    }

    const lastCompleted = [...tx.stages]
      .reverse()
      .find(
        (stage) =>
          stage.status === "completed",
      );

    const exceptionStage = tx.stages.find(
      (stage) =>
        stage.status === "exception",
    );

    const evidence =
      auditEventsForTransaction(
        ctx.auditLog,
        tx.id,
        ["rail_selected", "stage_"],
      );

    if (exceptionStage) {
      return {
        question,
        answer:
          `${tx.id} reached ` +
          `${exceptionStage.name.replace(/_/g, " ")} ` +
          `and stopped with an exception: ` +
          `${exceptionStage.note ?? "No further detail was recorded."} ` +
          `The last clean stage was ` +
          `${lastCompleted?.name.replace(/_/g, " ") ?? "none"}.`,
        citedEventIds: cite(evidence),
      };
    }

    return {
      question,
      answer:
        `${tx.id} completed its full lifecycle and reconciled cleanly. ` +
        `The selected rail was ` +
        `${tx.route?.selectedRail ?? "not recorded"}; ` +
        `expected and actual merchant settlement both equal ` +
        `$${tx.fees?.actualBankCredit.toFixed(2) ?? "n/a"}.`,
      citedEventIds: cite(evidence),
    };
  }

  if (
    /why.*(fail|declin|block|reject)/i.test(q)
  ) {
    if (!tx) {
      return {
        question,
        answer:
          "No transactions exist in the current session yet.",
        citedEventIds: [],
      };
    }

    const evidence =
      auditEventsForTransaction(
        ctx.auditLog,
        tx.id,
        [
          "policy_",
          "intent_evaluated",
          "approval_rejected",
          "approval_validation_failed",
        ],
      );

    if (tx.status !== "blocked") {
      return {
        question,
        answer:
          `${tx.id} did not fail; its current status is ` +
          `${tx.status}. Include a different transaction ID ` +
          `if you meant another payment.`,
        citedEventIds: cite(evidence),
      };
    }

    const failedChecks =
      tx.intent.evaluations.filter(
        (evaluation) =>
          !evaluation.passed,
      );

    return {
      question,
      answer:
        `${tx.id} was stopped before funds moved. ` +
        `${tx.intent.explanation}` +
        `${
          failedChecks.length > 0
            ? ` Failed checks: ${failedChecks
                .map(
                  (failure) =>
                    failure.reason,
                )
                .join(" ")}`
            : ""
        }`,
      citedEventIds: cite(evidence),
    };
  }

  if (
    /authoriz|permitted|allowed to/i.test(q)
  ) {
    if (!tx) {
      return {
        question,
        answer:
          "No transactions exist in the current session yet.",
        citedEventIds: [],
      };
    }

    const agent = ctx.agents.find(
      (candidate) =>
        candidate.id === tx.agentId,
    );

    const hardFailures =
      tx.intent.evaluations.filter(
        (evaluation) =>
          !evaluation.passed,
      );

    const evidence =
      auditEventsForTransaction(
        ctx.auditLog,
        tx.id,
        [
          "policy_",
          "intent_evaluated",
          "approval_",
        ],
      );

    return {
      question,
      answer:
        `${agent?.name ?? tx.agentId} was ` +
        `${
          tx.status === "blocked"
            ? "not authorized"
            : "authorized"
        } for this request. ` +
        `${tx.intent.explanation}` +
        `${
          hardFailures.length > 0
            ? ` Exceptions recorded: ${hardFailures
                .map(
                  (failure) =>
                    failure.reason,
                )
                .join(" ")}`
            : ""
        }`,
      citedEventIds: cite(evidence),
    };
  }

  if (
    /why.*(rail|card|ach|rtp|stablecoin|route)/i.test(
      q,
    )
  ) {
    if (!tx?.route) {
      return {
        question,
        answer: tx
          ? `${tx.id} never reached routing because it was blocked earlier.`
          : "No transactions exist in the current session yet.",
        citedEventIds: tx
          ? cite(
              auditEventsForTransaction(
                ctx.auditLog,
                tx.id,
              ),
            )
          : [],
      };
    }

    const evidence =
      auditEventsForTransaction(
        ctx.auditLog,
        tx.id,
        ["rail_selected"],
      );

    return {
      question,
      answer: tx.route.reason,
      citedEventIds: cite(evidence),
    };
  }

  if (
    /unreconcil|not reconcil|still open|outstanding/i.test(
      q,
    )
  ) {
    const open = ctx.transactions.filter(
      (transaction) =>
        transaction.status === "exception",
    );

    const evidence = open.flatMap(
      (transaction) =>
        auditEventsForTransaction(
          ctx.auditLog,
          transaction.id,
          [
            "stage_exception",
            "incident_detected",
          ],
        ),
    );

    if (open.length === 0) {
      return {
        question,
        answer:
          "All completed transactions in the current session are reconciled; no open reconciliation breaks exist.",
        citedEventIds: [],
      };
    }

    return {
      question,
      answer:
        `${open.length} transaction(s) remain unreconciled: ` +
        `${open
          .map(
            (transaction) =>
              `${transaction.id} — expected ` +
              `$${transaction.fees?.expectedNetToMerchant.toFixed(2) ?? "n/a"}, ` +
              `bank credited ` +
              `$${transaction.fees?.actualBankCredit.toFixed(2) ?? "n/a"}, ` +
              `difference ` +
              `$${transaction.fees?.reconciliationDifference.toFixed(2) ?? "n/a"}`,
          )
          .join("; ")}.`,
      citedEventIds: cite(evidence, 12),
    };
  }

  if (
    /owed|shortfall|fees? (correct|applied)/i.test(
      q,
    )
  ) {
    if (!tx) {
      return {
        question,
        answer:
          "No transactions exist in the current session yet.",
        citedEventIds: [],
      };
    }

    const incident = ctx.incidents.find(
      (candidate) =>
        candidate.transactionId === tx.id,
    );

    const evidence =
      auditEventsForTransaction(
        ctx.auditLog,
        tx.id,
        [
          "stage_",
          "incident_detected",
        ],
      );

    if (incident) {
      return {
        question,
        answer:
          `Yes. Expected merchant settlement was ` +
          `$${tx.fees?.expectedNetToMerchant.toFixed(2) ?? "n/a"}, ` +
          `but the bank credited ` +
          `$${tx.fees?.actualBankCredit.toFixed(2) ?? "n/a"}. ` +
          `The unresolved shortfall is ` +
          `$${incident.financialExposure.toFixed(2)}. ` +
          `${incident.recommendedAction}`,
        citedEventIds: cite(evidence),
      };
    }

    return {
      question,
      answer:
        `${tx.id} has no open settlement exposure. ` +
        `Processing fee: ` +
        `$${tx.fees?.processingFee.toFixed(2) ?? "n/a"}; ` +
        `platform fee: ` +
        `$${tx.fees?.platformFee.toFixed(2) ?? "n/a"}; ` +
        `reserve: ` +
        `$${tx.fees?.reserve.toFixed(2) ?? "n/a"}; ` +
        `actual bank credit: ` +
        `$${tx.fees?.actualBankCredit.toFixed(2) ?? "n/a"}.`,
      citedEventIds: cite(evidence),
    };
  }

  if (
    /approv/i.test(q) &&
    !/why.*(rail|card|ach|rtp|stablecoin|route)/i.test(
      q,
    )
  ) {
    const pending =
      ctx.approvalTasks.filter(
        (task) =>
          task.status === "pending",
      );

    const relevantTxIds = new Set(
      pending.map(
        (task) =>
          task.transactionId,
      ),
    );

    const evidence = ctx.auditLog.filter(
      (event) =>
        event.transactionId &&
        relevantTxIds.has(
          event.transactionId,
        ) &&
        event.action.includes(
          "approval_",
        ),
    );

    if (pending.length === 0) {
      const resolvedRecently = [
        ...ctx.approvalTasks,
      ]
        .filter(
          (task) =>
            task.status === "resolved",
        )
        .sort(
          (a, b) =>
            (b.decidedAt ?? 0) -
            (a.decidedAt ?? 0),
        )[0];

      const resolvedEvidence =
        resolvedRecently
          ? auditEventsForTransaction(
              ctx.auditLog,
              resolvedRecently.transactionId,
              ["approval_"],
            )
          : [];

      return {
        question,
        answer: resolvedRecently
          ? `No approvals are pending. The most recent decision was ${resolvedRecently.decision} on ${resolvedRecently.transactionId} by ${resolvedRecently.decidedBy}.`
          : "No approval tasks exist yet.",
        citedEventIds: cite(
          resolvedEvidence,
        ),
      };
    }

    return {
      question,
      answer:
        `${pending.length} request(s) await human approval: ` +
        `${pending
          .map(
            (task) =>
              `${task.transactionId} (` +
              `${ctx.agents.find(
                (agent) =>
                  agent.id === task.agentId,
              )?.name}, ` +
              `$${task.request.maxAmount.toLocaleString()})`,
          )
          .join("; ")}.`,
      citedEventIds: cite(evidence),
    };
  }

  if (
    /what should|next step|recommend/i.test(q)
  ) {
    const openIncidents =
      ctx.incidents.filter(
        (incident) =>
          incident.status === "open",
      );

    const pendingApprovals =
      ctx.approvalTasks.filter(
        (task) =>
          task.status === "pending",
      );

    const relevantTxIds = new Set([
      ...openIncidents.map(
        (incident) =>
          incident.transactionId,
      ),
      ...pendingApprovals.map(
        (task) =>
          task.transactionId,
      ),
    ]);

    const evidence = ctx.auditLog.filter(
      (event) =>
        event.transactionId &&
        relevantTxIds.has(
          event.transactionId,
        ) &&
        (event.action ===
          "incident_detected" ||
          event.action ===
            "approval_requested"),
    );

    if (
      openIncidents.length === 0 &&
      pendingApprovals.length === 0
    ) {
      return {
        question,
        answer:
          "No open incidents or pending approvals currently require operator action.",
        citedEventIds: [],
      };
    }

    const parts: string[] = [];

    if (pendingApprovals.length > 0) {
      parts.push(
        `${pendingApprovals.length} approval(s) require review: ` +
          `${pendingApprovals
            .map(
              (task) =>
                `${task.transactionId} ` +
                `($${task.request.maxAmount.toLocaleString()})`,
            )
            .join(", ")}.`,
      );
    }

    if (openIncidents.length > 0) {
      parts.push(
        openIncidents
          .map(
            (incident) =>
              `${incident.transactionId}: ` +
              `${incident.recommendedAction} ` +
              `Owner: ${incident.suggestedOwner}.`,
          )
          .join(" "),
      );
    }

    return {
      question,
      answer: parts.join(" "),
      citedEventIds: cite(evidence, 12),
    };
  }

  return {
    question,
    answer:
      "I can investigate authorization, policy failures, rail selection, payment location, settlement shortfalls, pending approvals, and recommended operational actions. Reference a transaction ID for a specific payment, or ask about the latest payment.",
    citedEventIds: [],
  };
}
