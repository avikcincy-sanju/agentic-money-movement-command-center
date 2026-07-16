// ---------------------------------------------------------------------------
// Core domain types for the Agentic Money Movement Command Center
// ---------------------------------------------------------------------------

export type Rail = "card" | "ach" | "rtp" | "stablecoin";

export type AgentStatus = "active" | "approval_required" | "suspended";

export interface Agent {
  id: string;
  name: string;
  purpose: string;
  owner: string;
  department: string;
  trustLevel: "high" | "medium" | "low";
  credentialStatus: "valid" | "expiring_soon" | "expired";
  credentialExpiresOn: string; // ISO date
  allowedRails: Rail[];
  perTransactionLimit: number;
  dailyLimit: number;
  dailySpent: number; // running total, resets conceptually each demo day
  approvedMerchantCategories: string[];
  allowedCountries: string[];
  status: AgentStatus;
}

export type PolicyKind =
  | "max_transaction_value"
  | "human_approval_threshold"
  | "merchant_allowlist"
  | "velocity_limit"
  | "stablecoin_eligibility"
  | "geography_restriction";

export interface Policy {
  id: string;
  name: string;
  description: string;
  kind: PolicyKind;
  enabled: boolean;
  config: Record<string, number | string | string[]>;
}

export interface PaymentIntentRequest {
  agentId: string;
  purpose: string;
  maxAmount: number;
  merchant: string;
  merchantCategory: string;
  country: string;
  preferredSettlementCurrency: string;
  requestedBy: number; // epoch ms, "complete before"
}

export type IntentDecision =
  | "approved"
  | "approved_with_conditions"
  | "human_approval_required"
  | "declined"
  | "credential_suspended";

export interface PolicyEvaluation {
  policyId: string;
  policyName: string;
  passed: boolean;
  reason: string;
}

export interface IntentResult {
  intentId: string;
  request: PaymentIntentRequest;
  decision: IntentDecision;
  evaluations: PolicyEvaluation[];
  explanation: string;
  timestamp: number;
}

export interface RailScore {
  rail: Rail;
  costPct: number;
  costFlat: number;
  estimatedCost: number;
  speedLabel: string;
  speedMinutes: number;
  meetsDeadline: boolean;
  reversibility: "high" | "medium" | "low";
  fraudRisk: "high" | "medium" | "low";
  merchantAcceptance: "high" | "medium" | "low";
  settlementCertainty: "high" | "medium" | "low";
  eligible: boolean;
  ineligibleReason?: string;
  score: number; // computed composite, higher is better
}

export interface RouteDecision {
  intentId: string;
  candidates: RailScore[];
  selectedRail: Rail | null;
  reason: string;
  timestamp: number;
}

export type TxStageStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "exception";

export type TxStageName =
  | "agent_intent"
  | "policy_validation"
  | "credential_provisioning"
  | "authorization"
  | "capture"
  | "ledger_posting"
  | "settlement"
  | "bank_credit"
  | "erp_posting"
  | "reconciliation";

export interface TxStage {
  name: TxStageName;
  system: string;
  status: TxStageStatus;
  amount: number | null;
  currency: string;
  identifier: string;
  expectedAt: number;
  actualAt: number | null;
  note?: string;
}

export interface FeeBreakdown {
  processingFee: number;
  platformFee: number;
  reserve: number;
  expectedNetToMerchant: number;
  actualBankCredit: number;
  reconciliationDifference: number;
}

export type IncidentType =
  | "capture_missing"
  | "duplicate_capture"
  | "missing_webhook"
  | "settlement_mismatch"
  | "fx_variance"
  | "ledger_entry_missing"
  | "agent_limit_exceeded"
  | "policy_block"
  | "no_eligible_rail"
  | "unauthorized_credential_use"
  | "chargeback_after_settlement";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface Incident {
  id: string;
  transactionId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  detectedAt: number;
  summary: string;
  financialExposure: number;
  systemsAffected: string[];
  probableCause: string;
  recommendedAction: string;
  suggestedOwner: string;
  status: "open" | "investigating" | "resolved";
  auditEvidence: string[];
}

export interface Transaction {
  id: string;
  agentId: string;
  intent: IntentResult;
  route: RouteDecision | null;
  stages: TxStage[];
  fees: FeeBreakdown | null;
  createdAt: number;
  scenario: "happy_path" | "policy_violation" | "settlement_mismatch";
  status:
    | "open"
    | "settled"
    | "reconciled"
    | "exception"
    | "blocked"
    | "awaiting_approval";
}

export type ApprovalDecision = "approved" | "rejected";

export interface ApprovalTask {
  id: string;
  transactionId: string;
  agentId: string;
  request: PaymentIntentRequest;
  intent: IntentResult;
  scenario: Transaction["scenario"];
  createdAt: number;
  status: "pending" | "resolved";
  decision?: ApprovalDecision;
  decidedBy?: string;
  decidedAmount?: number;
  decidedAt?: number;
  note?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  transactionId?: string;
  detail: string;
}

export interface CopilotAnswer {
  question: string;
  answer: string;
  citedEventIds: string[];
}
