# Agentic Money Movement Command Center

A policy-driven control plane and operational digital twin for AI-agent-initiated payments—from intent and authorization through rail selection, settlement, reconciliation, and incident investigation.

**Live demo:** https://avikcincy-sanju.github.io/agentic-money-movement-command-center/

> **Synthetic environment:** This prototype does not connect to a real PSP, bank, blockchain, accounting ledger, or ERP. It executes real policy, routing, lifecycle, exception, approval, and investigation logic against synthetic data.

## Product thesis

Most agentic-commerce demos stop when an AI agent completes a purchase. Most payment-operations dashboards begin after a processor creates a transaction. This prototype connects both sides:

```text
Agent intent
  → policy and credential decision
  → human approval when required
  → multi-rail scoring and selection
  → authorization and capture
  → ledger and settlement
  → bank credit and ERP posting
  → reconciliation
  → incident investigation and audit evidence
```

The goal is **intent-to-reconciliation traceability**: preserving who requested the payment, what the agent was authorized to do, why a rail was selected, what happened downstream, and who must act when the expected and actual financial outcomes differ.

## Working capabilities

### Agent Registry

Three AI agents have explicit transaction limits, daily budgets, merchant-category permissions, country restrictions, credential states, and eligible payment rails.

### Policy Control Center

Six toggleable policies are evaluated at runtime:

1. Maximum transaction value
2. Human approval threshold
3. Merchant-category allowlist
4. Daily velocity limit
5. Geographic restriction
6. Stablecoin minimum-savings eligibility

Disabling a policy changes the real decision path. The policy-violation demo is not forcibly blocked by the scenario label; it proceeds when the active rules permit it.

### Human approvals

Requests above the approval threshold—or requests from agents configured for mandatory review—pause before routing. An approver can approve, modify, or reject the request. Modified amounts are revalidated against every hard control before funds are allowed to move.

### Intelligent routing

Card, ACH, RTP, and stablecoin are scored using:

- Estimated all-in cost
- Completion deadline and rail speed
- Settlement certainty
- Merchant acceptance
- Fraud risk
- Reversibility
- Agent rail credentials
- Configurable stablecoin savings threshold

### Operational digital twin

Approved transactions progress through ten stages:

```text
intent → policy validation → credential provisioning → authorization
→ capture → ledger posting → settlement → bank credit
→ ERP posting → reconciliation
```

### Settlement exception management

The mismatch scenario retains both:

- Expected merchant settlement from the processor
- Actual bank credit

The application calculates the reconciliation difference, creates an incident, identifies affected systems, proposes a probable cause, and recommends an owner and corrective action.

### Investigation Copilot

The copilot answers questions about authorization, failures, routing, money location, settlement shortfalls, approvals, and recommended actions. Responses are derived from in-memory transaction and incident data and cite actual `evt-...` records from the Audit Trail.

## What is real versus simulated

| Real application logic | Simulated infrastructure |
|---|---|
| Agent and credential configuration | External identity/KYB systems |
| Runtime policy evaluation | Payment processor connectivity |
| Human approval and hard-control revalidation | Card, ACH, RTP, and blockchain networks |
| Cost-, risk-, and deadline-aware rail scoring | Real authorization and settlement timing |
| Transaction lifecycle state generation | Production accounting ledger |
| Fee and expected-versus-actual settlement math | Bank and ERP connectivity |
| Incident detection and exposure calculation | Real funds movement |
| Audit-event-grounded copilot | External LLM API |

## Demo scenarios

### 1. Clean approval

A compliant request passes policy, receives a route decision, completes its lifecycle, and reconciles.

### 2. Policy violation

An out-of-policy amount, category, country, or velocity request is stopped before funds move. Toggle the relevant policy off and rerun the same request to demonstrate the changed decision.

### 3. Settlement mismatch

The payment authorizes and captures successfully, but the bank credits less than the processor settlement file indicates. Reconciliation flags the exact shortfall and opens an operational incident.

## Project structure

```text
src/
  components/          Product screens
  data/seed.ts         Agents, policies, merchants, and rail economics
  engine/              Policy, routing, lifecycle, incident, and copilot logic
  engine/__tests__/    Automated engine tests
  lib/store.tsx        Central state and audit-event orchestration
  types/               Domain models
.github/workflows/     CI and GitHub Pages deployment
```

The `engine/` layer is plain TypeScript without React dependencies, making the business logic independently testable.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- GitHub Actions
- GitHub Pages

## Run locally

```bash
npm ci
npm run dev
```

Then open the URL shown by Vite.

## Validate the project

```bash
npm run lint
npm test
npm run build
```

The automated test suite covers policy decisions, hard-control revalidation, geography, deadline eligibility, stablecoin-policy behavior, expected-versus-actual settlement, dynamic scenario outcomes, and Audit Trail citations.

## Deploy to GitHub Pages

This repository includes `.github/workflows/deploy.yml`.

1. Create a public GitHub repository named `agentic-money-movement-command-center`.
2. Push the project to the repository’s `main` branch.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **GitHub Actions**.
5. Confirm that **Deploy to GitHub Pages** completes successfully.
6. Open:

```text
https://avikcincy-sanju.github.io/agentic-money-movement-command-center/
```

When using a different repository name, update:

- `base` in `vite.config.ts`
- `homepage` and `repository.url` in `package.json`

## Current limitations

- State resets when the browser refreshes.
- All external financial systems are simulated.
- The copilot is a deterministic evidence router, not a hosted LLM.
- Authentication and role-based access control are not implemented.
- Lifecycle timestamps are compressed for demonstration purposes.

## Potential next steps

- Persist agents, policies, transactions, approvals, and audit events in Supabase.
- Add authenticated operator, approver, auditor, and administrator roles.
- Connect the copilot to a server-side LLM while preserving event citations.
- Add sandbox connectors for a PSP, bank simulator, or stablecoin testnet.
- Export an investigation package containing transaction evidence and remediation history.

## License

MIT License. See [LICENSE](LICENSE).

## Author

**Avik Nandi**

Payments, agentic commerce, financial infrastructure, and product strategy.
