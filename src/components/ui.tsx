/* oxlint-disable react/only-export-components */
import React from "react";

type Tone = "success" | "warning" | "danger" | "neutral" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-[var(--color-success-dim)] text-[var(--color-success)] border-[var(--color-success)]/30",
  warning: "bg-[var(--color-warning-dim)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
  danger: "bg-[var(--color-danger-dim)] text-[var(--color-danger)] border-[var(--color-danger)]/30",
  neutral: "bg-[var(--color-surface-raised)] text-[var(--color-ink-dim)] border-[var(--color-border-bright)]",
  accent: "bg-[var(--color-accent-dim)] text-[var(--color-accent)] border-[var(--color-accent)]/30",
};

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone }: { tone: Tone }) {
  const dotColor: Record<Tone, string> = {
    success: "bg-[var(--color-success)]",
    warning: "bg-[var(--color-warning)]",
    danger: "bg-[var(--color-danger)]",
    neutral: "bg-[var(--color-ink-faint)]",
    accent: "bg-[var(--color-accent)]",
  };
  return <span className={`h-1.5 w-1.5 rounded-full ${dotColor[tone]}`} />;
}

export function Card({
  children,
  className = "",
  title,
  eyebrow,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
    >
      {(title || eyebrow) && (
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            {eyebrow && (
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                {eyebrow}
              </div>
            )}
            {title && <div className="text-sm font-medium text-[var(--color-ink)]">{title}</div>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  const valueColor: Record<Tone, string> = {
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
    neutral: "text-[var(--color-ink)]",
    accent: "text-[var(--color-accent)]",
  };
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className={`mt-1.5 font-mono-num text-2xl font-semibold ${valueColor[tone]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--color-ink-dim)]">{sub}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base = "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-40";
  const variants = {
    primary: "bg-[var(--color-accent)] text-[#04121f] hover:brightness-110",
    secondary: "bg-[var(--color-surface-raised)] text-[var(--color-ink)] border border-[var(--color-border-bright)] hover:border-[var(--color-accent)]/50",
    ghost: "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-raised)]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "completed":
    case "reconciled":
    case "settled":
    case "active":
    case "approved":
    case "resolved":
    case "valid":
      return "success";
    case "pending":
    case "in_progress":
    case "approval_required":
    case "human_approval_required":
    case "awaiting_approval":
    case "expiring_soon":
    case "investigating":
    case "open":
      return "warning";
    case "exception":
    case "declined":
    case "blocked":
    case "suspended":
    case "credential_suspended":
    case "expired":
      return "danger";
    default:
      return "neutral";
  }
}
