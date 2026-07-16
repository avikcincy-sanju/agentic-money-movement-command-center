import { useStore } from "../lib/store";
import { Card } from "./ui";

export default function PolicyControlCenter() {
  const { policies, togglePolicy } = useStore();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">
          Policy Control Center
        </h1>

        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Every enabled policy runs against every agent intent
          before a payment is allowed to proceed. Disable a policy
          here and re-run a simulation to see how the decision
          changes.
        </p>
      </div>

      <div className="space-y-3">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">
                  {policy.name}
                </div>

                <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
                  {policy.description}
                </p>

                {Object.keys(policy.config).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(policy.config).map(
                      ([key, value]) => (
                        <span
                          key={key}
                          className="rounded border border-[var(--color-border-bright)] bg-[var(--color-surface-raised)] px-2 py-0.5 font-mono-num text-[11px] text-[var(--color-ink-dim)]"
                        >
                          {key}:{" "}
                          {Array.isArray(value)
                            ? value.join(", ")
                            : value}
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => togglePolicy(policy.id)}
                className={[
                  "relative h-6 w-11 shrink-0 rounded-full",
                  "transition-colors",
                  policy.enabled
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-border-bright)]",
                ].join(" ")}
                aria-label={`Toggle ${policy.name}`}
                aria-pressed={policy.enabled}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full",
                    "bg-[var(--color-bg)] transition-transform",
                    policy.enabled
                      ? "translate-x-5"
                      : "translate-x-0.5",
                  ].join(" ")}
                />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
