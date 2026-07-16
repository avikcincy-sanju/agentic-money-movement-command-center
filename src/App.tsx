import { type ElementType, useState } from "react";

import {
  AlertTriangle,
  Bot,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  PlayCircle,
  Radio,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  UserCheck,
  Waypoints,
  X,
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
import { StoreProvider, useStore } from "./lib/store";

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
  icon: ElementType;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "agents", label: "Agent Registry", icon: Bot },
  { id: "policies", label: "Policy Control Center", icon: ShieldCheck },
  { id: "simulate", label: "Simulate Intent", icon: PlayCircle },
  { id: "transactions", label: "Transactions", icon: Waypoints },
  { id: "approvals", label: "Approvals", icon: UserCheck },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
  { id: "copilot", label: "Investigation Copilot", icon: MessageSquareText },
  { id: "audit", label: "Audit Trail", icon: ScrollText },
];

function ProductMark() {
  return (
    <div className="flex items-center gap-2.5">
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
  );
}

function Shell() {
  const [view, setView] = useState<View>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { incidents, approvalTasks, resetDemo } = useStore();

  const openIncidents = incidents.filter(
    (incident) => incident.status === "open",
  ).length;
  const pendingApprovals = approvalTasks.filter(
    (task) => task.status === "pending",
  ).length;

  const navigate = (nextView: View) => {
    setView(nextView);
    setMobileNavOpen(false);
  };

  const handleResetDemo = () => {
    const confirmed = window.confirm(
      "Reset the demo? This will clear all transactions, approvals, incidents, audit events, policy changes, and restore the original agent daily-spend values.",
    );

    if (!confirmed) {
      return;
    }

    resetDemo();
    navigate("overview");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] md:flex md:h-screen md:overflow-hidden">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[#04121f] focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden">
        <ProductMark />
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(true)}
          className="rounded-md border border-[var(--color-border)] p-2 text-[var(--color-ink-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        aria-label="Primary navigation"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col",
          "border-r border-[var(--color-border)] bg-[var(--color-surface)]",
          "transition-transform md:static md:z-auto md:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <ProductMark />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-md p-1.5 text-[var(--color-ink-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.id)}
                className={[
                  "flex w-full items-center justify-between rounded-md px-3 py-2",
                  "text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                  active
                    ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                    : "text-[var(--color-ink-dim)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]",
                ].join(" ")}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {item.label}
                </span>

                {item.id === "incidents" && openIncidents > 0 && (
                  <span className="rounded-full bg-[var(--color-danger)] px-1.5 py-0.5 text-[10px] font-semibold text-[#2a0d05]">
                    {openIncidents}
                  </span>
                )}

                {item.id === "approvals" && pendingApprovals > 0 && (
                  <span className="rounded-full bg-[var(--color-warning)] px-1.5 py-0.5 text-[10px] font-semibold text-[#2a1c05]">
                    {pendingApprovals}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-border)] px-3 py-3">
          <button
            type="button"
            onClick={handleResetDemo}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-md",
              "border border-[var(--color-border)] px-3 py-2 text-xs font-medium",
              "text-[var(--color-ink-dim)] transition-colors",
              "hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
            ].join(" ")}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            Reset demo data
          </button>

          <div className="mt-3 px-1 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            <div>Simulated environment — synthetic data only</div>
            <div className="mt-1 text-[var(--color-ink-dim)]">
              Developed by Avik Nandi · 2026
            </div>
          </div>
        </div>
      </aside>

      <main id="main-content" className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 md:px-8 md:py-7">
          {view === "overview" && (
            <Overview
              onNavigate={(nextView) => navigate(nextView as View)}
            />
          )}
          {view === "agents" && <AgentRegistry />}
          {view === "policies" && <PolicyControlCenter />}
          {view === "simulate" && (
            <Simulate onDone={(nextView) => navigate(nextView as View)} />
          )}
          {view === "transactions" && <Transactions />}
          {view === "approvals" && <Approvals />}
          {view === "incidents" && <Incidents />}
          {view === "copilot" && <Copilot />}
          {view === "audit" && <AuditTrail />}
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
