import { useState } from "react";
import {
  CheckCircle2,
  UserCheck,
  XCircle,
} from "lucide-react";

import {
  dateTime,
  label,
  money,
} from "../lib/format";
import { useStore } from "../lib/store";
import {
  Button,
  Card,
  Pill,
  statusTone,
} from "./ui";

const APPROVER = "human:sammy";

function TaskRow({
  taskId,
}: {
  taskId: string;
}) {
  const {
    approvalTasks,
    agents,
    decideApproval,
  } = useStore();

  const task = approvalTasks.find(
    (candidate) =>
      candidate.id === taskId,
  )!;

  const agent = agents.find(
    (candidate) =>
      candidate.id === task.agentId,
  );

  const [amount, setAmount] =
    useState(task.request.maxAmount);

  const isPending =
    task.status === "pending";

  const wasModified =
    task.decidedAmount !== undefined &&
    task.decidedAmount !==
      task.request.maxAmount;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill
              tone={
                isPending
                  ? "warning"
                  : statusTone(
                      task.decision ===
                        "approved"
                        ? "approved"
                        : "declined",
                    )
              }
            >
              {isPending
                ? "Pending review"
                : label(
                    task.decision ?? "",
                  )}
            </Pill>

            <span className="font-mono-num text-xs text-[var(--color-ink-faint)]">
              {task.transactionId}
            </span>

            <span className="text-xs text-[var(--color-ink-faint)]">
              · {dateTime(task.createdAt)}
            </span>
          </div>

          <div className="mt-2 text-sm font-medium">
            {agent?.name}
          </div>

          <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
            {task.intent.explanation}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs md:grid-cols-4">
            <div>
              <div className="text-[var(--color-ink-faint)]">
                Merchant
              </div>

              <div className="mt-0.5 text-[var(--color-ink)]">
                {task.request.merchant}
              </div>
            </div>

            <div>
              <div className="text-[var(--color-ink-faint)]">
                Category
              </div>

              <div className="mt-0.5 text-[var(--color-ink)]">
                {label(
                  task.request
                    .merchantCategory,
                )}
              </div>
            </div>

            <div>
              <div className="text-[var(--color-ink-faint)]">
                Requested amount
              </div>

              <div className="mt-0.5 font-mono-num text-[var(--color-ink)]">
                {money(
                  task.request.maxAmount,
                )}
              </div>
            </div>

            <div>
              <div className="text-[var(--color-ink-faint)]">
                Country
              </div>

              <div className="mt-0.5 text-[var(--color-ink)]">
                {task.request.country}
              </div>
            </div>
          </div>

          {!isPending && (
            <div className="mt-3 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-xs text-[var(--color-ink-dim)]">
              {task.decision ===
              "approved"
                ? `Approved by ${task.decidedBy} at ${dateTime(
                    task.decidedAt ??
                      null,
                  )}${
                    wasModified
                      ? ` — amount adjusted to ${money(
                          task.decidedAmount,
                        )}`
                      : ""
                  }.`
                : `Rejected by ${task.decidedBy} at ${dateTime(
                    task.decidedAt ??
                      null,
                  )}.`}
            </div>
          )}

          {isPending &&
            task.note && (
              <div className="mt-3 rounded border border-[var(--color-danger)]/30 bg-[var(--color-danger-dim)] px-2.5 py-2 text-xs text-[var(--color-danger)]">
                {task.note}
              </div>
            )}

          {isPending && (
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-[var(--color-ink-dim)]">
                  Approve at amount
                  (editable)
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  className="w-32 rounded-md border border-[var(--color-border-bright)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 font-mono-num text-sm"
                />
              </label>

              <Button
                onClick={() =>
                  decideApproval(
                    task.id,
                    "approved",
                    APPROVER,
                    amount,
                  )
                }
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />

                {amount !==
                task.request.maxAmount
                  ? "Approve modified amount"
                  : "Approve"}
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  decideApproval(
                    task.id,
                    "rejected",
                    APPROVER,
                  )
                }
                className="gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Approvals() {
  const { approvalTasks } =
    useStore();

  const pending =
    approvalTasks.filter(
      (task) =>
        task.status === "pending",
    );

  const resolved =
    approvalTasks.filter(
      (task) =>
        task.status === "resolved",
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Approvals
        </h1>

        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Requests parked by policy for
          human sign-off. Approving
          resumes the transaction through
          routing and the full lifecycle
          after hard controls are
          revalidated; rejecting closes it
          out with no funds ever moving.
        </p>
      </div>

      {approvalTasks.length === 0 && (
        <Card className="border-dashed">
          <p className="text-sm text-[var(--color-ink-dim)]">
            No approval tasks yet. From
            Simulate Intent, submit a
            request above the $1,000
            human-review threshold, or
            one from the Travel Booking
            Agent — it requires approval
            on every transaction.
          </p>
        </Card>
      )}

      {pending.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
            <UserCheck className="h-3.5 w-3.5" />
            Pending review (
            {pending.length})
          </div>

          <div className="space-y-3">
            {pending.map((task) => (
              <TaskRow
                key={task.id}
                taskId={task.id}
              />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
            Resolved (
            {resolved.length})
          </div>

          <div className="space-y-3">
            {resolved.map((task) => (
              <TaskRow
                key={task.id}
                taskId={task.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
