import type { Agent, Policy, Rail } from "../types";

const CREDENTIAL_WARNING_DAYS = 30;

export function deriveCredentialStatus(
  expiresOn: string,
  now = Date.now(),
): Agent["credentialStatus"] {
  const expiry = Date.parse(`${expiresOn}T23:59:59Z`);

  if (!Number.isFinite(expiry) || now > expiry) {
    return "expired";
  }

  const warningWindowMs =
    CREDENTIAL_WARNING_DAYS * 24 * 60 * 60 * 1000;

  return expiry - now <= warningWindowMs
    ? "expiring_soon"
    : "valid";
}


export const AGENTS: Agent[] = [
  {
    id: "agent-cloud-procurement",
    name: "Cloud Procurement Agent",
    purpose: "Purchase compute, storage, and infrastructure from approved cloud vendors",
    owner: "Elena Marlowe",
    department: "Platform Engineering",
    trustLevel: "high",
    credentialStatus: deriveCredentialStatus("2026-11-01"),
    credentialExpiresOn: "2026-11-01",
    allowedRails: ["card", "ach", "stablecoin"],
    perTransactionLimit: 1000,
    dailyLimit: 5000,
    dailySpent: 1240,
    approvedMerchantCategories: ["cloud_infrastructure", "saas"],
    allowedCountries: ["US", "CA", "GB"],
    status: "active",
  },
  {
    id: "agent-travel-booking",
    name: "Travel Booking Agent",
    purpose: "Book employee travel within policy",
    owner: "Julian Cross",
    department: "People Ops",
    trustLevel: "medium",
    credentialStatus: deriveCredentialStatus("2026-09-15"),
    credentialExpiresOn: "2026-09-15",
    allowedRails: ["card"],
    perTransactionLimit: 2000,
    dailyLimit: 6000,
    dailySpent: 0,
    approvedMerchantCategories: ["airlines", "hotels", "ground_transport"],
    allowedCountries: ["US", "CA", "GB", "SG", "AU"],
    status: "approval_required",
  },
  {
    id: "agent-supplier-payment",
    name: "Supplier Payment Agent",
    purpose: "Pay approved supplier invoices on net terms",
    owner: "Nadia Hartwell",
    department: "Finance Operations",
    trustLevel: "high",
    credentialStatus: deriveCredentialStatus("2026-07-28"),
    credentialExpiresOn: "2026-07-28",
    allowedRails: ["ach", "rtp"],
    perTransactionLimit: 50000,
    dailyLimit: 250000,
    dailySpent: 18000,
    approvedMerchantCategories: ["approved_suppliers"],
    allowedCountries: ["US"],
    status: "active",
  },
];

export const POLICIES: Policy[] = [
  {
    id: "policy-max-tx",
    name: "Maximum transaction value",
    description: "Blocks any single transaction above the agent's per-transaction limit.",
    kind: "max_transaction_value",
    enabled: true,
    config: {},
  },
  {
    id: "policy-human-approval",
    name: "Human approval threshold",
    description: "Requires human review for transactions at or above $1,000, regardless of agent limit.",
    kind: "human_approval_threshold",
    enabled: true,
    config: { threshold: 1000 },
  },
  {
    id: "policy-merchant-category",
    name: "Merchant category allowlist",
    description: "Only permits spend in categories explicitly approved for that agent.",
    kind: "merchant_allowlist",
    enabled: true,
    config: {},
  },
  {
    id: "policy-velocity",
    name: "Daily velocity limit",
    description: "Blocks a transaction if it would push the agent's cumulative daily spend over its daily limit.",
    kind: "velocity_limit",
    enabled: true,
    config: {},
  },
  {
    id: "policy-geography",
    name: "Geographic restriction",
    description: "Only permits transactions in countries explicitly approved for the agent.",
    kind: "geography_restriction",
    enabled: true,
    config: {},
  },
  {
    id: "policy-stablecoin-eligibility",
    name: "Stablecoin eligibility",
    description: "Stablecoin settlement is only permitted when it saves at least 1% versus the next-best rail, and only for agents explicitly allowed the rail.",
    kind: "stablecoin_eligibility",
    enabled: true,
    config: { minSavingsPct: 1 },
  },
];

// Base economics per rail. Route scoring perturbs these slightly per
// transaction to simulate real-world variance (interchange tiers, FX, etc).
export const RAIL_BASE: Record<
  Rail,
  {
    label: string;
    costPct: number;
    costFlat: number;
    speedLabel: string;
    speedMinutes: number; // used for stage timing simulation
    reversibility: "high" | "medium" | "low";
    fraudRisk: "high" | "medium" | "low";
    merchantAcceptance: "high" | "medium" | "low";
    settlementCertainty: "high" | "medium" | "low";
  }
> = {
  card: {
    label: "Virtual card",
    costPct: 2.9,
    costFlat: 0.3,
    speedLabel: "Immediate authorization",
    speedMinutes: 2,
    reversibility: "high",
    fraudRisk: "medium",
    merchantAcceptance: "high",
    settlementCertainty: "high",
  },
  ach: {
    label: "ACH",
    costPct: 0,
    costFlat: 0.5,
    speedLabel: "1-2 business days",
    speedMinutes: 60 * 24,
    reversibility: "medium",
    fraudRisk: "low",
    merchantAcceptance: "medium",
    settlementCertainty: "medium",
  },
  rtp: {
    label: "RTP (real-time payments)",
    costPct: 0,
    costFlat: 1.0,
    speedLabel: "Immediate, irrevocable",
    speedMinutes: 1,
    reversibility: "low",
    fraudRisk: "low",
    merchantAcceptance: "medium",
    settlementCertainty: "high",
  },
  stablecoin: {
    label: "Stablecoin (USDC)",
    costPct: 0.8,
    costFlat: 0,
    speedLabel: "Near real-time, irrevocable",
    speedMinutes: 3,
    reversibility: "low",
    fraudRisk: "medium",
    merchantAcceptance: "low",
    settlementCertainty: "high",
  },
};

export const MERCHANTS_BY_CATEGORY: Record<string, string[]> = {
  cloud_infrastructure: [
    "Northstar Cloud",
    "BluePeak Compute",
    "AsterGrid Infrastructure",
  ],
  saas: [
    "CanvasWorks Software",
    "Nimbus Analytics",
    "Vertex Collaboration",
  ],
  airlines: [
    "Meridian Air",
    "Northwind Airlines",
    "Pacific Crest Airways",
  ],
  hotels: [
    "Harborstone Hotels",
    "Summit Gate Lodging",
  ],
  ground_transport: ["MetroLink Business Mobility"],
  approved_suppliers: [
    "Meridian Components Ltd.",
    "Northgate Logistics",
    "Beacon Materials Co.",
  ],
};
