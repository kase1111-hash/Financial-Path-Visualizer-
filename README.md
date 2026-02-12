# Financial Path Visualizer

A tool that shows you where your money decisions lead.

**[Try it live](https://kase1111-hash.github.io/Financial-Path-Visualizer/)**

## What This Does

You input your income, debts, bills, and goals. The tool shows you the path you're on and what happens if you change course.

Most people carry a financial plan in their head that they made at 22 and never revisited. This gives you a checkpoint. A way to see whether the plan still makes sense, or whether you're executing a strategy you never consciously chose.

## What This Is For

- Seeing the true lifetime cost of a house, not just the monthly payment
- Understanding how a smaller house means fewer work hours, earlier retirement, more flexibility
- Finding optimization points: moments where a small change produces outsized results
- Modeling "what if" scenarios before you commit to them
- Replacing vague anxiety with concrete numbers

## What This Is Not

- A budgeting app (we don't categorize your lattes)
- A lifestyle tracker (we don't want your habits, goals, or journal entries)
- A product sales funnel (we're not here to sell you financial services)
- A data harvesting operation (your information stays yours)

This tool examines your life only through costs and incomes. Nothing else.
All data stays in your browser via IndexedDB. Nothing is sent to any server.

## How It Works

```
 User Interface (Input Forms + Visualization)
              │
              ▼
 Financial Profile (your current state)
              │
              ▼
 Projection Engine (compounds forward through time)
              │
              ▼
 Optimization Scanner (finds improvement paths)
              │
              ▼
 Trajectory Output (timeline + comparison + prompts)
```

**Projection Engine** — Takes your profile and projects it year by year: income grows, debts amortize, assets compound, taxes are calculated with real progressive brackets (federal + 32 states). The output is a complete trajectory from now to life expectancy.

**Optimization Scanner** — Walks the trajectory looking for actionable opportunities: unused tax-advantaged space, employer match you're leaving on the table, high-interest debt vs low-yield savings, PMI removal windows. Each suggestion is backed by a real trajectory comparison showing the actual lifetime impact, not napkin math.

**Comparison Engine** — Clone your profile, change one variable, and see the cascade. The delta between trajectories is the true cost or benefit of a decision.

### Key Design Decisions

- **Currency in cents** — All monetary values are integers (cents) to avoid floating-point drift
- **Rates as decimals** — 6.5% is stored as `0.065`
- **Local-first** — IndexedDB storage, no backend, no accounts
- **Tax year configurable** — 2024 and 2025 federal brackets with fallback

## Core Inputs

- **Income**: Salary, hourly wages, variable income, side work
- **Work hours**: How much of your time you trade for that income
- **Current debts**: Mortgage, car loans, student loans, credit cards
- **Monthly obligations**: Bills, subscriptions, recurring costs
- **Goals with timelines**: House, retirement, education, major purchases

Precision is not required. Ballpark numbers work. The value is in the trajectory, not the decimal places.

## Core Outputs

### Trajectory View
Where your current path leads. When you can retire. What you'll own. What you'll still owe.

### Comparison View
What happens when you change one variable. The cascade effects of choosing a $300K house instead of $400K. The decade you get back.

### Optimization Prompts
The tool surfaces insights when the math makes them obvious:

- "You're making too much money and will be in a higher tax bracket. Put $2,000 into retirement to pay $1,500 less in taxes this year."
- "You're paying PMI on a house worth 40% more than your loan balance. A reassessment removes $180/month."
- "Your emergency fund earns 0.5% while you carry 22% credit card debt. This gap costs you $X/month."
- "At your current rate, you retire at 67. An additional $200/month moves that to 64."

No judgment. Just paths.

## Development

### Prerequisites

- Node.js 18+
- npm

### Getting Started

```bash
npm install
npm run dev          # development server at localhost:5173
npm run build        # production build
npm run preview      # preview production build locally
npm run typecheck    # type checking
npm run lint         # check for lint errors
npm run lint:fix     # lint with auto-fix
npm run test:run     # unit tests (single run)
npm test             # unit tests (watch mode)
npm run test:e2e     # end-to-end tests (headless)
```

### Tech Stack

- **TypeScript** — Strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- **Vite** — Build tool and dev server
- **Vitest** — 254 tests across 16 files
- **D3.js** — Data visualization
- **IndexedDB (idb)** — Local storage

## Feedback

If you try this tool, I'd love to hear from you. Three questions:

1. Did the projected trajectory match your intuition about your finances?
2. What's the first thing you'd want to change or add?
3. Did any number look wrong?

Open an [issue](https://github.com/kase1111-hash/Financial-Path-Visualizer/issues) or reach out directly.

## License

MIT
