import { useMemo } from "react";
import { ArrowRight } from "lucide-react";

import { money } from "../lib/format";
import { useStore } from "../lib/store";
import {
  Button,
  Card,
  Metric,
} from "./ui";

export default function Overview({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  const {
    agents,
    transactions,
    incidents,
    approvalTasks,
  } = useStore();

  const metrics = useMemo(() => {
    const total = transactions.length;

    const settled =
      transactions.filter(
        (transaction) =>
          transaction.status ===
          "reconciled",
      );

    const exceptions =
      transactions.filter(
        (transaction) =>
          transaction.status ===
          "exception",
      );

    const blocked =
      transactions.filter(
        (transaction) =>
          transaction.status ===
          "blocked",
      );

    const totalValue = transactions
      .filter(
        (transaction) =>
          transaction.status !==
          "blocked",
      )
      .reduce(
        (sum, transaction) =>
          sum +
          transaction.intent.request
            .maxAmount,
        0,
      );

    const netSettled = settled.reduce(
      (sum, transaction) =>
        sum +
        (transaction.fees
          ?.actualBankCredit ?? 0),
      0,
    );

    const unreconciledExposure =
      incidents
        .filter(
          (incident) =>
            incident.status ===
              "open" &&
            incident.type ===
              "settlement_mismatch",
        )
        .reduce(
          (sum, incident) =>
            sum +
            incident.financialExposure,
          0,
        );

    const approvalRate =
      total > 0
        ? ((total - blocked.length) /
            total) *
          100
        : 0;

    const openIncidents =
      incidents.filter(
        (incident) =>
          incident.status === "open",
      ).length;

    const activeAgents =
      agents.filter(
        (agent) =>
          agent.status === "active",
      ).length;

    const pendingApprovals =
      approvalTasks.filter(
        (task) =>
          task.status === "pending",
      ).length;

    const routingSavings =
      transactions.reduce(
        (sum, transaction) => {
          if (!transaction.route) {
            return sum;
          }

          const selected =
            transaction.route.candidates.find(
              (candidate) =>
                candidate.rail ===
                transaction.route
                  ?.selectedRail,
            );

          const worst = [
            ...transaction.route
              .candidates,
          ]
            .filter(
              (candidate) =>
                candidate.eligible,
            )
            .sort(
              (a, b) =>
                a.score - b.score,
            )[0];

          if (
            !selected ||
            !worst ||
            selected.rail === worst.rail
          ) {
            return sum;
          }

          return (
            sum +
            Math.max(
              0,
              worst.estimatedCost -
                selected.estimatedCost,
            )
          );
        },
        0,
      );

    return {
      total,
      totalValue,
      netSettled,
      unreconciledExposure,
      approvalRate,
      openIncidents,
      activeAgents,
      exceptionCount:
        exceptions.length,
      blockedCount: blocked.length,
      routingSavings,
      pendingApprovals,
    };
  }, [
    agents,
    transactions,
    incidents,
    approvalTasks,
  ]);

  const hasData =
    transactions.length > 0;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl font-semibold">
          Overview
        </h1>

        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Live state of every
          AI-agent-initiated payment,
          from intent through
          reconciliation.
        </p>
      </div>

      {!hasData && (
        <Card className="border-dashed">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">
                No transactions yet
              </div>

              <div className="mt-1 text-sm text-[var(--color-ink-dim)]">
                Run a simulated agent
                payment to populate the
                command center with live
                data.
              </div>
            </div>

            <Button
              onClick={() =>
                onNavigate("simulate")
              }
            >
              Simulate a payment
              <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
          Executive metrics
        </h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            label="Agent-initiated value"
            value={money(
              metrics.totalValue,
            )}
            sub={`${metrics.total} transactions`}
            tone="accent"
          />

          <Metric
            label="Net settled value"
            value={money(
              metrics.netSettled,
            )}
          />

          <Metric
            label="Unreconciled exposure"
            value={money(
              metrics.unreconciledExposure,
            )}
            tone={
              metrics.unreconciledExposure >
              0
                ? "danger"
                : "success"
            }
          />

          <Metric
            label="Policy approval rate"
            value={`${metrics.approvalRate.toFixed(
              0,
            )}%`}
            tone={
              metrics.approvalRate < 70
                ? "warning"
                : "success"
            }
          />

          <Metric
            label="Open incidents"
            value={String(
              metrics.openIncidents,
            )}
            tone={
              metrics.openIncidents > 0
                ? "danger"
                : "success"
            }
          />

          <Metric
            label="Pending approvals"
            value={String(
              metrics.pendingApprovals,
            )}
            tone={
              metrics.pendingApprovals >
              0
                ? "warning"
                : "success"
            }
          />

          <Metric
            label="Active agents"
            value={`${metrics.activeAgents} / ${agents.length}`}
          />

          <Metric
            label="Estimated routing savings"
            value={money(
              metrics.routingSavings,
            )}
            sub="vs. worst eligible rail"
            tone="success"
          />

          <Metric
            label="Blocked by policy"
            value={String(
              metrics.blockedCount,
            )}
            tone={
              metrics.blockedCount > 0
                ? "warning"
                : "neutral"
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
          What to do here
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card
            title="1. Submit an agent intent"
            eyebrow="Start here"
          >
            <p className="text-sm text-[var(--color-ink-dim)]">
              Go to{" "}
              <span className="text-[var(--color-ink)]">
                Simulate Intent
              </span>{" "}
              and pick an agent, an
              amount, and a scenario — a
              clean approval, a policy
              violation, or a settlement
              mismatch.
            </p>
          </Card>

          <Card
            title="2. Watch the lifecycle"
            eyebrow="Then"
          >
            <p className="text-sm text-[var(--color-ink-dim)]">
              Open{" "}
              <span className="text-[var(--color-ink)]">
                Transactions
              </span>{" "}
              to see the payment move
              through authorization,
              capture, ledger, settlement,
              bank credit, and
              reconciliation.
            </p>
          </Card>

          <Card
            title="3. Investigate"
            eyebrow="If something breaks"
          >
            <p className="text-sm text-[var(--color-ink-dim)]">
              Check{" "}
              <span className="text-[var(--color-ink)]">
                Incidents
              </span>{" "}
              for the root-cause analysis,
              or ask the{" "}
              <span className="text-[var(--color-ink)]">
                Investigation Copilot
              </span>{" "}
              directly.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
