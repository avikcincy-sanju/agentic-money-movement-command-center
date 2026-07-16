import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  LayoutDashboard,
  MessageSquareText,
  PlayCircle,
  Radio,
  ScrollText,
  ShieldCheck,
  UserCheck,
  Waypoints,
} from "lucide-react";

import AgentRegistry from "./components/AgentRegistry";
import Approvals from "./components/Approvals";
import AuditTrail from "./components/AuditTrail";
import Copilot from "./components/Copilot";
import Incidents from "./components/Incidents";
import Overview from "./components/Overview";
import PolicyControlCenter from "./components/PolicyControlCenter";
import Simulate from "./components/Simulate";
import Transactions from "./components/Transactions";
import {
  StoreProvider,
  useStore,
} from "./lib/store";

type View =
  | "overview"
  | "agents"
  | "policies"
  | "simulate"
  | "transactions"
  | "approvals"
  | "incidents"
  | "copilot"
  | "audit";

const NAV: {
  id: View;
  label: string;
  icon: React.ElementType;
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "agents",
    label: "Agent Registry",
    icon: Bot,
  },
  {
    id: "policies",
    label: "Policy Control Center",
    icon: ShieldCheck,
  },
  {
    id: "simulate",
    label: "Simulate Intent",
    icon: PlayCircle,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: Waypoints,
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: UserCheck,
  },
  {
    id: "incidents",
    label: "Incidents",
    icon: AlertTriangle,
  },
  {
    id: "copilot",
    label: "Investigation Copilot",
    icon: MessageSquareText,
  },
  {
    id: "audit",
    label: "Audit Trail",
    icon: ScrollText,
  },
];

function Shell() {
  const [view, setView] =
    useState<View>("overview");

  const {
    incidents,
    approvalTasks,
  } = useStore();

  const openIncidents =
    incidents.filter(
      (incident) =>
        incident.status === "open",
    ).length;

  const pendingApprovals =
    approvalTasks.filter(
      (task) =>
        task.status === "pending",
    ).length;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink)]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-dim)]">
            <Radio
              className="h-4 w-4 text-[var(--color-accent)]"
              strokeWidth={2}
            />
          </div>

          <div>
            <div className="text-sm font-semibold leading-tight">
              Agentic Money Movement
            </div>

            <div className="text-[11px] leading-tight text-[var(--color-ink-faint)]">
              Command Center
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              view === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setView(item.id)
                }
                className={[
                  "flex w-full items-center justify-between",
                  "rounded-md px-3 py-2",
                  "text-left text-sm",
                  "transition-colors",
                  active
                    ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                    : "text-[var(--color-ink-dim)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]",
                ].join(" ")}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className="h-4 w-4"
                    strokeWidth={2}
                  />

                  {item.label}
                </span>

                {item.id ===
                  "incidents" &&
                  openIncidents > 0 && (
                    <span className="rounded-full bg-[var(--color-danger)] px-1.5 py-0.5 text-[10px] font-semibold text-[#2a0d05]">
                      {openIncidents}
                    </span>
                  )}

                {item.id ===
                  "approvals" &&
                  pendingApprovals >
                    0 && (
                    <span className="rounded-full bg-[var(--color-warning)] px-1.5 py-0.5 text-[10px] font-semibold text-[#2a1c05]">
                      {
                        pendingApprovals
                      }
                    </span>
                  )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-border)] px-4 py-3 text-[11px] text-[var(--color-ink-faint)]">
          Simulated environment —
          synthetic data only
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-7">
          {view === "overview" && (
            <Overview
              onNavigate={(nextView) =>
                setView(
                  nextView as View,
                )
              }
            />
          )}

          {view === "agents" && (
            <AgentRegistry />
          )}

          {view === "policies" && (
            <PolicyControlCenter />
          )}

          {view === "simulate" && (
            <Simulate
              onDone={(nextView) =>
                setView(
                  nextView as View,
                )
              }
            />
          )}

          {view ===
            "transactions" && (
            <Transactions />
          )}

          {view === "approvals" && (
            <Approvals />
          )}

          {view === "incidents" && (
            <Incidents />
          )}

          {view === "copilot" && (
            <Copilot />
          )}

          {view === "audit" && (
            <AuditTrail />
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
