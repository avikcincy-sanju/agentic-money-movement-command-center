# Contributing

Thank you for your interest in the Agentic Money Movement Command Center.

This repository is a working reference implementation for governing, routing, tracking, reconciling, and investigating AI-agent-initiated payments.

## Development requirements

- Node.js 22
- npm
- Git

The project includes an `.nvmrc` file, so Node Version Manager users can run:

```bash
nvm use
```

## Set up the project

Clone the repository:

```bash
git clone https://github.com/avikcincy-sanju/agentic-money-movement-command-center.git
cd agentic-money-movement-command-center
```

Install dependencies:

```bash
npm ci
```

Start the local development server:

```bash
npm run dev
```

## Validate changes

Before submitting a change, run:

```bash
npm run lint
npm test
npm run build
```

All three commands must complete successfully.

## Project architecture

```text
src/
  components/          React product screens
  data/                Synthetic agents, policies, merchants, and rail data
  engine/              Policy, routing, lifecycle, incident, and copilot logic
  engine/__tests__/    Automated business-logic tests
  lib/                 Shared state and formatting utilities
  types/               Core domain models
```

Business rules should remain inside `src/engine/` whenever possible. React components should primarily handle presentation and user interaction.

## Contribution principles

### Preserve explainability

Every policy or routing decision should include a plain-English explanation.

### Preserve auditability

Important actions should create an `AuditEvent` with:

- Actor
- Action
- Timestamp
- Transaction reference
- Decision detail

### Separate expected and actual money movement

Settlement logic must preserve:

- Expected processor settlement
- Actual bank credit
- Reconciliation difference

Do not overwrite the expected amount with the actual amount.

### Revalidate approval changes

When an approver changes an amount or another material payment attribute, all hard controls must run again before the transaction proceeds.

### Avoid hardcoded scenario outcomes

Demo scenarios may provide starting data, but policy and routing outcomes must be determined by the active engine logic.

### Keep external infrastructure simulated

Do not add real credentials, API keys, bank details, production payment data, or personally identifiable information to this repository.

## Adding a policy

When adding a policy:

1. Add the policy kind to `src/types/index.ts`.
2. Add its configuration to `src/data/seed.ts`.
3. Implement its evaluation in `src/engine/policyEngine.ts`.
4. Decide whether it is a hard control or soft control.
5. Add automated tests.
6. Confirm the Audit Trail records its result.

## Adding a payment rail

When adding a rail:

1. Add the rail to the `Rail` type.
2. Define its economics and operating characteristics in `src/data/seed.ts`.
3. Include it in routing eligibility and scoring.
4. Add lifecycle or settlement behavior where needed.
5. Add automated routing tests.
6. Update the README.

## Pull requests

Use a clear title and explain:

- What changed
- Why it changed
- Which product behavior is affected
- How it was tested
- Whether any policy, routing, settlement, or audit behavior changed

Keep pull requests focused and avoid combining unrelated changes.

## Commit messages

Use concise, action-oriented commit messages, such as:

```text
Add merchant risk policy
Improve settlement mismatch evidence
Fix approval amount revalidation
Add RTP routing tests
```

## Security

This is a synthetic demonstration environment. Never commit:

- Access tokens
- Private keys
- Passwords
- Production customer data
- Real bank-account information
- Real payment credentials
- Unredacted transaction exports

Report security concerns privately to the repository owner rather than opening a public issue.
