import { RAIL_BASE } from "../data/seed";
import type {
  Agent,
  PaymentIntentRequest,
  Policy,
  Rail,
  RailScore,
  RouteDecision,
} from "../types";

const QUALITY_WEIGHT: Record<"high" | "medium" | "low", number> = {
  high: 1,
  medium: 0.6,
  low: 0.25,
};

type RawRailScore = RailScore & { internalCost: number };

function effectiveCost(
  amount: number,
  costPct: number,
  costFlat: number,
) {
  return amount * (costPct / 100) + costFlat;
}

function appendIneligibleReason(
  current: string | undefined,
  next: string,
): string {
  return current ? `${current} ${next}` : next;
}

export function scoreRails(
  request: PaymentIntentRequest,
  agent: Agent,
  policies: Policy[],
  seedOffset: number,
  now = Date.now(),
): RailScore[] {
  const rails = Object.keys(RAIL_BASE) as Rail[];

  const availableMinutes = Math.max(
    0,
    (request.requestedBy - now) / 60_000,
  );

  const raw: RawRailScore[] = rails.map((rail) => {
    const base = RAIL_BASE[rail];

    const jitter = ((seedOffset * 37) % 11) / 100;

    const costPct = Math.max(
      0,
      base.costPct + (rail === "card" ? jitter : 0),
    );

    const estimatedCost = effectiveCost(
      request.maxAmount,
      costPct,
      base.costFlat,
    );

    const meetsDeadline =
      base.speedMinutes <= availableMinutes;

    let eligible = agent.allowedRails.includes(rail);
    let ineligibleReason: string | undefined;

    if (!eligible) {
      ineligibleReason =
        `${agent.name} is not credentialed for this rail.`;
    }

    if (!meetsDeadline) {
      eligible = false;

      ineligibleReason = appendIneligibleReason(
        ineligibleReason,
        `${base.speedLabel} cannot meet the ${Math.max(
          0,
          Math.round(availableMinutes),
        )}-minute completion window.`,
      );
    }

    const speedFitness = meetsDeadline
      ? Math.max(
          0.2,
          1 -
            base.speedMinutes /
              Math.max(
                availableMinutes,
                base.speedMinutes,
              ),
        )
      : 0;

    const score =
      (1 - Math.min(estimatedCost, 50) / 50) * 35 +
      speedFitness * 15 +
      QUALITY_WEIGHT[base.settlementCertainty] * 20 +
      QUALITY_WEIGHT[base.merchantAcceptance] * 10 +
      (1 - QUALITY_WEIGHT[base.fraudRisk]) * 10 +
      QUALITY_WEIGHT[base.reversibility] * 10;

    return {
      rail,
      costPct,
      costFlat: base.costFlat,
      estimatedCost:
        Math.round(estimatedCost * 100) / 100,
      speedLabel: base.speedLabel,
      speedMinutes: base.speedMinutes,
      meetsDeadline,
      reversibility: base.reversibility,
      fraudRisk: base.fraudRisk,
      merchantAcceptance: base.merchantAcceptance,
      settlementCertainty:
        base.settlementCertainty,
      eligible,
      ineligibleReason,
      score: eligible
        ? Math.round(score * 10) / 10
        : 0,
      internalCost: estimatedCost,
    };
  });

  const stablecoinPolicy = policies.find(
    (policy) =>
      policy.kind === "stablecoin_eligibility",
  );

  const thresholdEnabled =
    stablecoinPolicy?.enabled ?? false;

  const minimumSavingsPct = Number(
    stablecoinPolicy?.config.minSavingsPct ?? 1,
  );

  const eligibleNonStable = raw.filter(
    (candidate) =>
      candidate.eligible &&
      candidate.rail !== "stablecoin",
  );

  const stablecoin = raw.find(
    (candidate) =>
      candidate.rail === "stablecoin",
  );

  if (
    thresholdEnabled &&
    stablecoin?.eligible &&
    eligibleNonStable.length > 0
  ) {
    const bestOtherCost = Math.min(
      ...eligibleNonStable.map(
        (candidate) => candidate.internalCost,
      ),
    );

    const savingsPct =
      bestOtherCost > 0
        ? ((bestOtherCost -
            stablecoin.internalCost) /
            bestOtherCost) *
          100
        : 0;

    if (savingsPct < minimumSavingsPct) {
      stablecoin.eligible = false;

      stablecoin.ineligibleReason =
        appendIneligibleReason(
          stablecoin.ineligibleReason,
          `It is only ${savingsPct.toFixed(
            2,
          )}% cheaper than the next-best eligible rail, below the configured ${minimumSavingsPct}% threshold.`,
        );

      stablecoin.score = 0;
    }
  }

  return raw
    .map(
      ({
        internalCost: _internalCost,
        ...candidate
      }) => candidate,
    )
    .sort((a, b) => {
      if (a.eligible !== b.eligible) {
        return a.eligible ? -1 : 1;
      }

      return b.score - a.score;
    });
}

export function selectRail(
  request: PaymentIntentRequest,
  agent: Agent,
  policies: Policy[],
  intentId: string,
  seedOffset: number,
  now = Date.now(),
): RouteDecision {
  const candidates = scoreRails(
    request,
    agent,
    policies,
    seedOffset,
    now,
  );

  const eligible = candidates.filter(
    (candidate) => candidate.eligible,
  );

  const winner = eligible[0];

  const availableMinutes = Math.max(
    0,
    Math.round(
      (request.requestedBy - now) / 60_000,
    ),
  );

  const stablecoinPolicy = policies.find(
    (policy) =>
      policy.kind === "stablecoin_eligibility",
  );

  const minimumSavingsPct = Number(
    stablecoinPolicy?.config.minSavingsPct ?? 1,
  );

  let reason: string;

  if (!winner) {
    reason =
      `No eligible rail can satisfy ${agent.name}'s credentials and the ${availableMinutes}-minute completion window.`;
  } else {
    const runnerUp = eligible[1];

    const parts = [
      `${RAIL_BASE[winner.rail].label} scored highest (${winner.score}/100) with an estimated cost of $${winner.estimatedCost.toFixed(
        2,
      )} and a ${RAIL_BASE[
        winner.rail
      ].speedLabel.toLowerCase()} profile.`,
    ];

    if (winner.rail === "card") {
      parts.push(
        "Immediate authorization, broad acceptance, and higher reversibility outweighed its higher processing cost.",
      );
    } else if (winner.rail === "rtp") {
      parts.push(
        "Real-time settlement and high settlement certainty were prioritized for the requested completion window.",
      );
    } else if (winner.rail === "ach") {
      parts.push(
        "ACH delivered the lowest all-in cost and still met the stated completion deadline.",
      );
    } else if (winner.rail === "stablecoin") {
      parts.push(
        stablecoinPolicy?.enabled
          ? `Stablecoin cleared the configured ${minimumSavingsPct}% minimum-savings rule while meeting the deadline.`
          : "The stablecoin savings gate was disabled, so the rail competed on the same cost, speed, risk, and settlement criteria as the other rails.",
      );
    }

    if (runnerUp) {
      parts.push(
        `${RAIL_BASE[runnerUp.rail].label} was the runner-up at ${runnerUp.score}/100 with an estimated cost of $${runnerUp.estimatedCost.toFixed(
          2,
        )}.`,
      );
    }

    reason = parts.join(" ");
  }

  return {
    intentId,
    candidates,
    selectedRail: winner?.rail ?? null,
    reason,
    timestamp: Date.now(),
  };
}
