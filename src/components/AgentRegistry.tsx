import { useStore } from "../lib/store";
import { money, label } from "../lib/format";
import {
  Card,
  Pill,
  StatusDot,
  statusTone,
} from "./ui";

export default function AgentRegistry() {
  const { agents } = useStore();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">
          Agent Registry
        </h1>

        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Enterprise-operated AI agents authorized to initiate
          financial activity. Each agent is governed by an
          accountable business owner; merchants and suppliers are
          external counterparties the agent purchases from or pays.
        </p>

        <div className="mt-3 rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent-dim)] px-3 py-2 text-xs text-[var(--color-ink-dim)]">
          These records represent software agents—not merchants,
          suppliers, employees, or legal entities.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {agents.map((agent) => {
          const spendPct = Math.min(
            100,
            (agent.dailySpent /
              agent.dailyLimit) *
              100,
          );

          return (
            <Card key={agent.id}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <StatusDot
                      tone={statusTone(
                        agent.status,
                      )}
                    />

                    <span className="font-medium">
                      {agent.name}
                    </span>

                    <Pill
                      tone={statusTone(
                        agent.status,
                      )}
                    >
                      {label(agent.status)}
                    </Pill>

                    <Pill
                      tone={statusTone(
                        agent.credentialStatus,
                      )}
                    >
                      Credential:{" "}
                      {label(
                        agent.credentialStatus,
                      )}
                    </Pill>
                  </div>

                  <p className="mt-1.5 text-sm text-[var(--color-ink-dim)]">
                    {agent.purpose}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-xs md:grid-cols-4">
                    <div>
                      <div className="text-[var(--color-ink-faint)]">
                        Accountable business owner
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {agent.owner} ·{" "}
                        {agent.department}
                      </div>
                    </div>

                    <div>
                      <div className="text-[var(--color-ink-faint)]">
                        Delegated transaction limit
                      </div>

                      <div className="mt-0.5 font-mono-num text-[var(--color-ink)]">
                        {money(
                          agent.perTransactionLimit,
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[var(--color-ink-faint)]">
                        Authorized payment rails
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {agent.allowedRails.join(
                          ", ",
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[var(--color-ink-faint)]">
                        Credential expires
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {
                          agent.credentialExpiresOn
                        }
                      </div>
                    </div>

                    <div>
                      <div className="text-[var(--color-ink-faint)]">
                        Permitted spending categories
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {agent.approvedMerchantCategories.join(
                          ", ",
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[var(--color-ink-faint)]">
                        Permitted transaction countries
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {agent.allowedCountries.join(
                          ", ",
                        )}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-[var(--color-ink-faint)]">
                        Delegated daily budget —{" "}
                        {money(agent.dailySpent)}{" "}
                        of{" "}
                        {money(agent.dailyLimit)}
                      </div>

                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
                        <div
                          className={[
                            "h-full rounded-full",
                            spendPct > 85
                              ? "bg-[var(--color-warning)]"
                              : "bg-[var(--color-accent)]",
                          ].join(" ")}
                          style={{
                            width: `${spendPct}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
