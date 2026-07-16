import { dateTime } from "../lib/format";
import { useStore } from "../lib/store";
import { Card } from "./ui";

export default function AuditTrail() {
  const { auditLog } = useStore();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">
          Audit Trail
        </h1>

        <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
          Full chronological event log across every agent,
          individual policy check, routing decision, lifecycle
          stage, approval, and incident. Copilot answers cite
          these event IDs as supporting evidence.
        </p>
      </div>

      <Card>
        {auditLog.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-dim)]">
            No events yet. Run a simulation to populate the log.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px] divide-y divide-[var(--color-border)]">
              {auditLog.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 py-2.5 text-xs"
                >
                  <span className="w-36 shrink-0 font-mono-num text-[var(--color-ink-faint)]">
                    {dateTime(event.timestamp)}
                  </span>

                  <span className="w-44 shrink-0 font-mono-num text-[var(--color-accent)]">
                    {event.actor}
                  </span>

                  <span className="w-44 shrink-0 text-[var(--color-ink-dim)]">
                    {event.action.replace(/_/g, " ")}
                  </span>

                  <span className="flex-1 text-[var(--color-ink)]">
                    {event.detail}
                  </span>

                  <span className="w-36 shrink-0 font-mono-num text-[var(--color-ink-faint)]">
                    {event.transactionId ?? "—"}
                  </span>

                  <span className="w-44 shrink-0 font-mono-num text-[var(--color-ink-faint)]">
                    {event.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
