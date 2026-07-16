import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
} from "lucide-react";

import { money, label } from "../lib/format";
import { useStore } from "../lib/store";
import type { Transaction } from "../types";
import {
  Button,
  Card,
  Pill,
  statusTone,
} from "./ui";

const SCENARIOS: {
  id: Transaction["scenario"];
  title: string;
  blurb: string;
  suggestedAmount: number;
}[] = [
  {
    id: "happy_path",
    title: "Clean approval",
    blurb:
      "Within policy, routes successfully, settles and reconciles end to end.",
    suggestedAmount: 475,
  },
  {
    id: "policy_violation",
    title: "Policy violation",
    blurb:
      "Request exceeds the agent's per-transaction limit — should be declined at policy validation.",
    suggestedAmount: 2500,
  },
  {
    id: "settlement_mismatch",
    title: "Settlement mismatch",
    blurb:
      "Payment succeeds and settles, but the bank credits less than the processor's settlement file shows.",
    suggestedAmount: 640,
  },
];

export default function Simulate({
  onDone,
}: {
  onDone: (view: string) => void;
}) {
  const {
    agents,
    merchantsFor,
    runScenario,
  } = useStore();

  const [scenario, setScenario] =
    useState<Transaction["scenario"]>(
      "happy_path",
    );

  const [agentId, setAgentId] = useState(
    agents[0].id,
  );

  const agent = agents.find(
    (candidate) =>
      candidate.id === agentId,
  )!;

  const [category, setCategory] =
    useState(
      agent.approvedMerchantCategories[0],
    );

  const merchants =
    merchantsFor(category);

  const [merchant, setMerchant] =
    useState(merchants[0] ?? "");

  const [amount, setAmount] =
    useState(475);

  const [
    deadlineMinutes,
    setDeadlineMinutes,
  ] = useState(60);

  const [country, setCountry] =
    useState(agent.allowedCountries[0]);

  const [result, setResult] =
    useState<Transaction | null>(null);

  function handleAgentChange(
    id: string,
  ) {
    setAgentId(id);

    const selectedAgent =
      agents.find(
        (candidate) =>
          candidate.id === id,
      )!;

    const firstCategory =
      selectedAgent
        .approvedMerchantCategories[0];

    setCategory(firstCategory);

    setMerchant(
      merchantsFor(firstCategory)[0] ??
        "",
    );

    setCountry(
      selectedAgent.allowedCountries[0],
    );
  }

  function handleScenarioChange(
    selectedScenario: Transaction["scenario"],
  ) {
    setScenario(selectedScenario);

    setAmount(
      SCENARIOS.find(
        (candidate) =>
          candidate.id ===
          selectedScenario,
      )!.suggestedAmount,
    );
  }

  function handleSubmit() {
    const transaction = runScenario({
      agentId,
      merchantCategory: category,
      merchant,
      amount,
      country,
      deadlineMinutes,
      scenario,
    });

    setResult(transaction);
  }

  const decisionIcon = useMemo(() => {
    if (!result) {
      return null;
    }

    if (result.status === "blocked") {
      return (
        <XCircle className="h-5 w-5 text-[var(--color-danger)]" />
      );
    }

    if (result.status === "exception") {
      return (
        <Clock className="h-5 w-5 text-[var(--color-warning)]" />
      );
    }

    if (
      result.status ===
      "awaiting_approval"
    ) {
      return (
        <UserCheck className="h-5 w-5 text-[var(--color-warning)]" />
      );
    }

    return (
      <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
    );
  }, [result]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Simulate Intent
        </h1>

        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Submit a payment request on
          behalf of an agent. The policy
          engine and router run for real
          against this input — nothing
          here is scripted per scenario
          beyond the starting numbers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card title="Request">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium text-[var(--color-ink-dim)]">
                Demo scenario
              </div>

              <div className="space-y-2">
                {SCENARIOS.map(
                  (scenarioOption) => (
                    <button
                      key={
                        scenarioOption.id
                      }
                      type="button"
                      onClick={() =>
                        handleScenarioChange(
                          scenarioOption.id,
                        )
                      }
                      className={[
                        "w-full rounded-md border",
                        "p-2.5 text-left text-xs",
                        "transition-colors",
                        scenario ===
                        scenarioOption.id
                          ? "border-[var(--color-accent)]/50 bg-[var(--color-accent-dim)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-bright)]",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "font-medium",
                          scenario ===
                          scenarioOption.id
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-ink)]",
                        ].join(" ")}
                      >
                        {
                          scenarioOption.title
                        }
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink-dim)]">
                        {
                          scenarioOption.blurb
                        }
                      </div>
                    </button>
                  ),
                )}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--color-ink-dim)]">
                Agent
              </span>

              <select
                value={agentId}
                onChange={(event) =>
                  handleAgentChange(
                    event.target.value,
                  )
                }
                className="w-full rounded-md border border-[var(--color-border-bright)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm"
              >
                {agents.map(
                  (candidate) => (
                    <option
                      key={candidate.id}
                      value={candidate.id}
                    >
                      {candidate.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--color-ink-dim)]">
                Merchant category
              </span>

              <select
                value={category}
                onChange={(event) => {
                  const selectedCategory =
                    event.target.value;

                  setCategory(
                    selectedCategory,
                  );

                  setMerchant(
                    merchantsFor(
                      selectedCategory,
                    )[0] ?? "",
                  );
                }}
                className="w-full rounded-md border border-[var(--color-border-bright)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm"
              >
                {agent.approvedMerchantCategories.map(
                  (merchantCategory) => (
                    <option
                      key={
                        merchantCategory
                      }
                      value={
                        merchantCategory
                      }
                    >
                      {label(
                        merchantCategory,
                      )}
                    </option>
                  ),
                )}

                {scenario ===
                  "policy_violation" && (
                  <option value="out_of_policy_category">
                    Out-of-policy category
                  </option>
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--color-ink-dim)]">
                Merchant
              </span>

              <select
                value={merchant}
                onChange={(event) =>
                  setMerchant(
                    event.target.value,
                  )
                }
                className="w-full rounded-md border border-[var(--color-border-bright)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm"
              >
                {merchants.length > 0 ? (
                  merchants.map(
                    (merchantOption) => (
                      <option
                        key={
                          merchantOption
                        }
                        value={
                          merchantOption
                        }
                      >
                        {merchantOption}
                      </option>
                    ),
                  )
                ) : (
                  <option value="Unlisted Vendor LLC">
                    Unlisted Vendor LLC
                  </option>
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--color-ink-dim)]">
                Amount (USD)
              </span>

              <input
                type="number"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="w-full rounded-md border border-[var(--color-border-bright)] bg-[var(--color-surface-raised)] px-3 py-2 font-mono-num text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--color-ink-dim)]">
                Complete within (minutes)
              </span>

              <input
                type="number"
                min="1"
                value={deadlineMinutes}
                onChange={(event) =>
                  setDeadlineMinutes(
                    Math.max(
                      1,
                      Number(
                        event.target.value,
                      ),
                    ),
                  )
                }
                className="w-full rounded-md border border-[var(--color-border-bright)] bg-[var(--color-surface-raised)] px-3 py-2 font-mono-num text-sm"
              />

              <span className="mt-1 block text-[11px] text-[var(--color-ink-faint)]">
                Rails that cannot complete
                within this window become
                ineligible.
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--color-ink-dim)]">
                Country
              </span>

              <select
                value={country}
                onChange={(event) =>
                  setCountry(
                    event.target.value,
                  )
                }
                className="w-full rounded-md border border-[var(--color-border-bright)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm"
              >
                {agent.allowedCountries.map(
                  (allowedCountry) => (
                    <option
                      key={allowedCountry}
                      value={allowedCountry}
                    >
                      {allowedCountry}
                    </option>
                  ),
                )}

                {scenario ===
                  "policy_violation" && (
                  <option value="XX">
                    Unlisted country (XX)
                  </option>
                )}
              </select>
            </label>

            <Button
              onClick={handleSubmit}
              className="w-full"
            >
              Submit agent intent
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {!result && (
            <Card className="border-dashed">
              <p className="text-sm text-[var(--color-ink-dim)]">
                Submit a request to see
                it evaluated by the
                policy engine, routed to
                a rail, and carried
                through the transaction
                lifecycle.
              </p>
            </Card>
          )}

          {result && (
            <>
              <Card
                title="Intent decision"
                eyebrow={result.id}
              >
                <div className="flex items-start gap-3">
                  {decisionIcon}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Pill
                        tone={statusTone(
                          result.intent
                            .decision,
                        )}
                      >
                        {label(
                          result.intent
                            .decision,
                        )}
                      </Pill>

                      <span className="font-mono-num text-sm text-[var(--color-ink-dim)]">
                        {money(
                          result.intent
                            .request
                            .maxAmount,
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[var(--color-ink)]">
                      {
                        result.intent
                          .explanation
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-[var(--color-border)] pt-3">
                  {result.intent.evaluations.map(
                    (evaluation) => (
                      <div
                        key={
                          evaluation.policyId
                        }
                        className="flex items-start gap-2 text-xs"
                      >
                        {evaluation.passed ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
                        ) : (
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-danger)]" />
                        )}

                        <div>
                          <span className="text-[var(--color-ink)]">
                            {
                              evaluation.policyName
                            }
                            :
                          </span>{" "}
                          <span className="text-[var(--color-ink-dim)]">
                            {
                              evaluation.reason
                            }
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </Card>

              {result.route && (
                <Card
                  title="Rail selection"
                  eyebrow="Routing engine"
                >
                  <p className="mb-3 text-sm text-[var(--color-ink)]">
                    {result.route.reason}
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[var(--color-ink-faint)]">
                          <th className="pb-2 pr-3 font-medium">
                            Rail
                          </th>

                          <th className="pb-2 pr-3 font-medium">
                            Estimated cost
                          </th>

                          <th className="pb-2 pr-3 font-medium">
                            Speed / deadline
                          </th>

                          <th className="pb-2 pr-3 font-medium">
                            Score
                          </th>

                          <th className="pb-2 font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.route.candidates.map(
                          (candidate) => (
                            <tr
                              key={
                                candidate.rail
                              }
                              className="border-t border-[var(--color-border)]"
                            >
                              <td className="py-2 pr-3">
                                <span
                                  className={
                                    candidate.rail ===
                                    result
                                      .route
                                      ?.selectedRail
                                      ? "font-medium text-[var(--color-accent)]"
                                      : "text-[var(--color-ink)]"
                                  }
                                >
                                  {label(
                                    candidate.rail,
                                  )}
                                </span>
                              </td>

                              <td className="py-2 pr-3 font-mono-num text-[var(--color-ink-dim)]">
                                {money(
                                  candidate.estimatedCost,
                                )}

                                <span className="ml-1 text-[10px] text-[var(--color-ink-faint)]">
                                  (
                                  {candidate.costPct.toFixed(
                                    2,
                                  )}
                                  % +{" "}
                                  {money(
                                    candidate.costFlat,
                                  )}
                                  )
                                </span>
                              </td>

                              <td className="py-2 pr-3 text-[var(--color-ink-dim)]">
                                <div>
                                  {
                                    candidate.speedLabel
                                  }
                                </div>

                                <div
                                  className={
                                    candidate.meetsDeadline
                                      ? "text-[var(--color-success)]"
                                      : "text-[var(--color-danger)]"
                                  }
                                >
                                  {candidate.meetsDeadline
                                    ? "Meets deadline"
                                    : "Misses deadline"}
                                </div>
                              </td>

                              <td className="py-2 pr-3 font-mono-num text-[var(--color-ink-dim)]">
                                {
                                  candidate.score
                                }
                              </td>

                              <td className="py-2">
                                {candidate.eligible ? (
                                  <span className="text-[var(--color-success)]">
                                    Eligible
                                  </span>
                                ) : (
                                  <span
                                    className="text-[var(--color-ink-faint)]"
                                    title={
                                      candidate.ineligibleReason
                                    }
                                  >
                                    Ineligible
                                  </span>
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              <Button
                variant="secondary"
                onClick={() =>
                  onDone(
                    result.status ===
                      "awaiting_approval"
                      ? "approvals"
                      : "transactions",
                  )
                }
                className="w-full"
              >
                {result.status ===
                "awaiting_approval"
                  ? "Go to Approvals queue →"
                  : "View full transaction journey →"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
