import { AlertOctagon } from "lucide-react";

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

export default function Incidents() {
  const {
    incidents,
    resolveIncident,
  } = useStore();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">
          Incidents
        </h1>

        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Detected exceptions, root-cause analysis,
          and recommended remediation — generated
          from the actual transaction data, not
          scripted per scenario.
        </p>
      </div>

      {incidents.length === 0 ? (
        <Card className="border-dashed">
          <p className="text-sm text-[var(--color-ink-dim)]">
            No incidents detected. Run a policy
            violation or settlement mismatch scenario
            from Simulate Intent to generate one.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <div className="flex items-start gap-3">
                <AlertOctagon
                  className={[
                    "mt-0.5 h-5 w-5 shrink-0",
                    incident.severity === "high" ||
                    incident.severity === "critical"
                      ? "text-[var(--color-danger)]"
                      : "text-[var(--color-warning)]",
                  ].join(" ")}
                />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill
                      tone={
                        incident.severity === "high" ||
                        incident.severity === "critical"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {label(incident.severity)} severity
                    </Pill>

                    <Pill
                      tone={statusTone(
                        incident.status,
                      )}
                    >
                      {label(incident.status)}
                    </Pill>

                    <span className="font-mono-num text-xs text-[var(--color-ink-faint)]">
                      {incident.transactionId}
                    </span>

                    <span className="text-xs text-[var(--color-ink-faint)]">
                      · {dateTime(incident.detectedAt)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[var(--color-ink)]">
                    {incident.summary}
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-xs md:grid-cols-2">
                    <div>
                      <div className="font-medium text-[var(--color-ink-faint)]">
                        Financial exposure
                      </div>

                      <div className="mt-0.5 font-mono-num text-[var(--color-ink)]">
                        {money(
                          incident.financialExposure,
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-[var(--color-ink-faint)]">
                        Systems affected
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {incident.systemsAffected.join(
                          ", ",
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="font-medium text-[var(--color-ink-faint)]">
                        Probable cause
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {incident.probableCause}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="font-medium text-[var(--color-ink-faint)]">
                        Recommended action
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {incident.recommendedAction}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-[var(--color-ink-faint)]">
                        Suggested owner
                      </div>

                      <div className="mt-0.5 text-[var(--color-ink)]">
                        {incident.suggestedOwner}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-[var(--color-ink-faint)]">
                        Audit evidence
                      </div>

                      <div className="mt-0.5 font-mono-num text-[var(--color-ink)]">
                        {incident.auditEvidence.join(
                          ", ",
                        )}
                      </div>
                    </div>
                  </div>

                  {incident.status !== "resolved" && (
                    <div className="mt-3">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          resolveIncident(
                            incident.id,
                          )
                        }
                      >
                        Mark resolved
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
