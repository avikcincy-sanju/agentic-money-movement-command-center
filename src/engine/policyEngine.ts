import type {
  Agent,
  IntentDecision,
  IntentResult,
  PaymentIntentRequest,
  Policy,
  PolicyEvaluation,
} from "../types";

const SOFT_POLICY_KINDS = new Set<Policy["kind"]>([
  "human_approval_threshold",
  "stablecoin_eligibility",
]);

export function isValidTransactionAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount >= 0.01;
}

function validateRequest(
  request: PaymentIntentRequest,
  timestamp: number,
): PolicyEvaluation[] {
  const evaluations: PolicyEvaluation[] = [];

  if (!isValidTransactionAmount(request.maxAmount)) {
    evaluations.push({
      policyId: "input-valid-amount",
      policyName: "Valid transaction amount",
      passed: false,
      reason:
        "Transaction amount must be a finite value of at least $0.01.",
    });
  }

  if (!request.merchant.trim()) {
    evaluations.push({
      policyId: "input-valid-merchant",
      policyName: "Valid payment counterparty",
      passed: false,
      reason: "A merchant or supplier must be selected.",
    });
  }

  if (!request.country.trim()) {
    evaluations.push({
      policyId: "input-valid-country",
      policyName: "Valid transaction country",
      passed: false,
      reason: "A transaction country must be selected.",
    });
  }

  if (
    !Number.isFinite(request.requestedBy) ||
    request.requestedBy <= timestamp
  ) {
    evaluations.push({
      policyId: "input-valid-deadline",
      policyName: "Valid completion deadline",
      passed: false,
      reason: "The completion deadline must be in the future.",
    });
  }

  return evaluations;
}

function evaluatePolicy(
  policy: Policy,
  agent: Agent,
  request: PaymentIntentRequest,
): PolicyEvaluation {
  if (!policy.enabled) {
    return {
      policyId: policy.id,
      policyName: policy.name,
      passed: true,
      reason: "Policy disabled — skipped.",
    };
  }

  switch (policy.kind) {
    case "max_transaction_value": {
      const passed = request.maxAmount <= agent.perTransactionLimit;
      return {
        policyId: policy.id,
        policyName: policy.name,
        passed,
        reason: passed
          ? `$${request.maxAmount.toLocaleString()} is within ${agent.name}'s per-transaction limit of $${agent.perTransactionLimit.toLocaleString()}.`
          : `$${request.maxAmount.toLocaleString()} exceeds ${agent.name}'s per-transaction limit of $${agent.perTransactionLimit.toLocaleString()}.`,
      };
    }
    case "human_approval_threshold": {
      const threshold = Number(policy.config.threshold ?? 1000);
      const passed = request.maxAmount < threshold;
      return {
        policyId: policy.id,
        policyName: policy.name,
        passed,
        reason: passed
          ? `Below the $${threshold.toLocaleString()} human-review threshold.`
          : `At or above the $${threshold.toLocaleString()} human-review threshold — requires sign-off.`,
      };
    }
    case "merchant_allowlist": {
      const passed = agent.approvedMerchantCategories.includes(
        request.merchantCategory,
      );
      return {
        policyId: policy.id,
        policyName: policy.name,
        passed,
        reason: passed
          ? `"${request.merchantCategory}" is an approved category for ${agent.name}.`
          : `"${request.merchantCategory}" is not in ${agent.name}'s approved category list (${agent.approvedMerchantCategories.join(", ")}).`,
      };
    }
    case "velocity_limit": {
      const projected = agent.dailySpent + request.maxAmount;
      const passed = projected <= agent.dailyLimit;
      return {
        policyId: policy.id,
        policyName: policy.name,
        passed,
        reason: passed
          ? `Projected daily spend $${projected.toLocaleString()} stays within the $${agent.dailyLimit.toLocaleString()} daily limit.`
          : `Projected daily spend $${projected.toLocaleString()} would exceed the $${agent.dailyLimit.toLocaleString()} daily limit.`,
      };
    }
    case "geography_restriction": {
      const passed = agent.allowedCountries.includes(request.country);
      return {
        policyId: policy.id,
        policyName: policy.name,
        passed,
        reason: passed
          ? `${request.country} is an allowed country for ${agent.name}.`
          : `${request.country} is not in ${agent.name}'s allowed country list (${agent.allowedCountries.join(", ")}).`,
      };
    }
    case "stablecoin_eligibility": {
      const threshold = Number(policy.config.minSavingsPct ?? 1);
      return {
        policyId: policy.id,
        policyName: policy.name,
        passed: true,
        reason: `Routing will allow stablecoin only when it is credentialed and saves at least ${threshold}% versus the next-best eligible rail.`,
      };
    }
    default:
      return {
        policyId: policy.id,
        policyName: policy.name,
        passed: true,
        reason: "No applicable check.",
      };
  }
}

export function getHardPolicyFailures(
  evaluations: PolicyEvaluation[],
  policies: Policy[],
): PolicyEvaluation[] {
  const policyById = new Map(
    policies.map((policy) => [policy.id, policy]),
  );

  return evaluations.filter((evaluation) => {
    if (evaluation.passed) {
      return false;
    }

    const policy = policyById.get(evaluation.policyId);
    return !policy || !SOFT_POLICY_KINDS.has(policy.kind);
  });
}

export function evaluateIntent(
  request: PaymentIntentRequest,
  agent: Agent | undefined,
  policies: Policy[],
): IntentResult {
  const intentId = `intent-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const timestamp = Date.now();

  const inputFailures = validateRequest(request, timestamp);

  if (inputFailures.length > 0) {
    return {
      intentId,
      request,
      decision: "declined",
      evaluations: inputFailures,
      explanation: `Declined: ${inputFailures
        .map((failure) => failure.reason)
        .join(" ")}`,
      timestamp,
    };
  }

  if (!agent) {
    return {
      intentId,
      request,
      decision: "declined",
      evaluations: [],
      explanation: "No matching agent found for this request.",
      timestamp,
    };
  }

  if (
    agent.status === "suspended" ||
    agent.credentialStatus === "expired"
  ) {
    return {
      intentId,
      request,
      decision: "credential_suspended",
      evaluations: [],
      explanation: `${agent.name}'s credentials are ${
        agent.credentialStatus === "expired" ? "expired" : "suspended"
      }. No transaction can be authorized until credentials are restored.`,
      timestamp,
    };
  }

  const evaluations = policies.map((policy) =>
    evaluatePolicy(policy, agent, request),
  );
  const failed = evaluations.filter(
    (evaluation) => !evaluation.passed,
  );
  const hardFails = getHardPolicyFailures(evaluations, policies);
  const approvalPolicy = policies.find(
    (policy) =>
      policy.kind === "human_approval_threshold" && policy.enabled,
  );
  const approvalEvaluation = approvalPolicy
    ? failed.find(
        (evaluation) => evaluation.policyId === approvalPolicy.id,
      )
    : undefined;

  let decision: IntentDecision;
  let explanation: string;

  if (hardFails.length > 0) {
    decision = "declined";
    explanation = `Declined: ${hardFails
      .map((failure) => failure.reason)
      .join(" ")}`;
  } else if (agent.status === "approval_required") {
    decision = "human_approval_required";
    explanation = `${agent.name} is configured to require human approval for every transaction, regardless of amount.`;
  } else if (approvalEvaluation) {
    decision = "human_approval_required";
    explanation = `All hard controls passed, but this transaction requires human sign-off: ${approvalEvaluation.reason}`;
  } else {
    decision = "approved";
    explanation = `Approved: enabled transaction-limit, merchant-category, daily-velocity, geography, and credential checks passed for ${agent.name}.`;
  }

  return {
    intentId,
    request,
    decision,
    evaluations,
    explanation,
    timestamp,
  };
}
