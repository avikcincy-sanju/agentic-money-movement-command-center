import { useEffect, useState } from "react";
import {
  ArrowDown,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

import { money, time, label } from "../lib/format";
import { useStore } from "../lib/store";
import type {
  Transaction,
  TxStage,
} from "../types";
import {
  Card,
  Pill,
  statusTone,
} from "./ui";

function StageIcon({
  status,
}: {
  status: TxStage["status"];
}) {
  if (status === "completed") {
    return (
      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
    );
  }

  if (status === "exception") {
    return (
      <XCircle className="h-4 w-4 text-[var(--color-danger)]" />
    );
  }

  if (status === "in_progress") {
    return (
      <Clock className="h-4 w-4 text-[var(--color-warning)]" />
    );
  }

  return (
    <div className="h-4 w-4 rounded-full border-2 border-[var(--color-border-bright)]" />
  );
}

function StageJourney({
  tx,
}: {
  tx: Transaction;
}) {
  return (
    <div>
      {tx.stages.map((stage, index) => (
        <div
          key={stage.name}
          className="relative flex gap-3 pb-5 last:pb-0"
        >
          {index <
            tx.stages.length - 1 && (
            <div className="absolute left-[7px] top-5 h-full w-px bg-[var(--color-border-bright)]" />
          )}

          <div className="z-10 mt-0.5 shrink-0 bg-[var(--color-surface)]">
            <StageIcon
              status={stage.status}
            />
          </div>

          <div className="flex-1 pb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {label(stage.name)}
                </span>

                <span className="text-[11px] text-[var(--color-ink-faint)]">
                  {stage.system}
                </span>
              </div>

              <span className="font-mono-num text-xs text-[var(--color-ink-dim)]">
                {stage.amount !== null
                  ? money(
                      stage.amount,
                      stage.currency,
                    )
                  : "—"}
              </span>
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-ink-faint)]">
              <span className="font-mono-num">
                {stage.identifier}
              </span>

              <span>·</span>

              <span>
                {time(stage.actualAt)}
              </span>
            </div>

            {stage.note && (
              <div
                className={[
                  "mt-1.5 rounded border",
                  "px-2 py-1.5 text-xs",
                  stage.status ===
                  "exception"
                    ? "border-[var(--color-danger)]/30 bg-[var(--color-danger-dim)] text-[var(--color-danger)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink-dim)]",
                ].join(" ")}
              >
                {stage.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MoneyMovementGraph({
  tx,
}: {
  tx: Transaction;
}) {
  if (!tx.fees) {
    return (
      <p className="text-sm text-[var(--color-ink-dim)]">
        No funds moved — the request
        was blocked before
        authorization.
      </p>
    );
  }

  const amount =
    tx.intent.request.maxAmount;

  const rows = [
    {
      label: "Gross authorization",
      value: amount,
      tone: "text-[var(--color-ink)]",
    },
    {
      label: "Processing fee",
      value: -tx.fees.processingFee,
      tone: "text-[var(--color-danger)]",
    },
    {
      label: "Platform fee",
      value: -tx.fees.platformFee,
      tone: "text-[var(--color-danger)]",
    },
    {
      label: "Expected reserve",
      value: -tx.fees.reserve,
      tone: "text-[var(--color-warning)]",
    },
  ];

  const maxBar = Math.max(amount, 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center gap-3 text-xs"
        >
          <span className="w-40 shrink-0 text-[var(--color-ink-dim)]">
            {row.label}
          </span>

          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
            <div
              className={[
                "h-full rounded-full",
                row.value < 0
                  ? "bg-[var(--color-danger)]/60"
                  : "bg-[var(--color-accent)]",
              ].join(" ")}
              style={{
                width: `${
                  (Math.abs(row.value) /
                    maxBar) *
                  100
                }%`,
              }}
            />
          </div>

          <span
            className={[
              "w-24 shrink-0 text-right",
              "font-mono-num",
              row.tone,
            ].join(" ")}
          >
            {money(row.value)}
          </span>
        </div>
      ))}

      <div className="flex items-center justify-center py-1">
        <ArrowDown className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" />
      </div>

      <div className="space-y-2 border-t border-[var(--color-border)] pt-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="w-40 shrink-0 font-medium text-[var(--color-ink)]">
            Expected settlement
          </span>

          <div className="flex-1" />

          <span className="font-mono-num font-semibold text-[var(--color-ink)]">
            {money(
              tx.fees
                .expectedNetToMerchant,
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-40 shrink-0 font-medium text-[var(--color-ink)]">
            Actual bank credit
          </span>

          <div className="flex-1" />

          <span
            className={[
              "font-mono-num font-semibold",
              tx.fees
                .reconciliationDifference >
              0
                ? "text-[var(--color-warning)]"
                : "text-[var(--color-success)]",
            ].join(" ")}
          >
            {money(
              tx.fees.actualBankCredit,
            )}
          </span>
        </div>

        {tx.fees
          .reconciliationDifference >
          0 && (
          <div className="flex items-center gap-3 rounded border border-[var(--color-danger)]/30 bg-[var(--color-danger-dim)] px-2.5 py-2">
            <span className="w-40 shrink-0 font-medium text-[var(--color-danger)]">
              Unexplained shortfall
            </span>

            <div className="flex-1" />

            <span className="font-mono-num font-semibold text-[var(--color-danger)]">
              {money(
                tx.fees
                  .reconciliationDifference,
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Transactions() {
  const {
    transactions,
    agents,
  } = useStore();

  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(
    transactions[0]?.id ?? null,
  );

  useEffect(() => {
    if (
      !selectedId &&
      transactions.length > 0
    ) {
      setSelectedId(
        transactions[0].id,
      );
    }
  }, [transactions, selectedId]);

  const selected =
    transactions.find(
      (transaction) =>
        transaction.id === selectedId,
    ) ??
    transactions[0] ??
    null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">
          Transactions
        </h1>

        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          The digital twin: every stage
          a payment moves through, from
          agent intent to reconciliation.
        </p>
      </div>

      {transactions.length === 0 ? (
        <Card className="border-dashed">
          <p className="text-sm text-[var(--color-ink-dim)]">
            No transactions yet. Go to
            Simulate Intent to run one.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
          <div className="space-y-2">
            {transactions.map(
              (transaction) => {
                const agent =
                  agents.find(
                    (candidate) =>
                      candidate.id ===
                      transaction.agentId,
                  );

                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() =>
                      setSelectedId(
                        transaction.id,
                      )
                    }
                    className={[
                      "w-full rounded-lg border",
                      "p-3 text-left",
                      "transition-colors",
                      selected?.id ===
                      transaction.id
                        ? "border-[var(--color-accent)]/50 bg-[var(--color-accent-dim)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-bright)]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num text-xs text-[var(--color-ink-dim)]">
                        {transaction.id}
                      </span>

                      <Pill
                        tone={statusTone(
                          transaction.status,
                        )}
                      >
                        {label(
                          transaction.status,
                        )}
                      </Pill>
                    </div>

                    <div className="mt-1.5 text-sm font-medium">
                      {agent?.name}
                    </div>

                    <div className="mt-0.5 flex items-center justify-between text-xs text-[var(--color-ink-dim)]">
                      <span>
                        {
                          transaction
                            .intent.request
                            .merchant
                        }
                      </span>

                      <span className="font-mono-num">
                        {money(
                          transaction
                            .intent.request
                            .maxAmount,
                        )}
                      </span>
                    </div>
                  </button>
                );
              },
            )}
          </div>

          {selected && (
            <div className="space-y-5">
              <Card
                title="Transaction journey"
                eyebrow={`${selected.id} · ${
                  agents.find(
                    (agent) =>
                      agent.id ===
                      selected.agentId,
                  )?.name
                }`}
              >
                <StageJourney
                  tx={selected}
                />
              </Card>

              <Card
                title="Money movement"
                eyebrow="Where the funds went"
              >
                <MoneyMovementGraph
                  tx={selected}
                />
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
