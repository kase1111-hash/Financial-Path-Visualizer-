# Financial Path Visualizer

A tool that shows you where your money decisions lead.

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

## The Problem This Solves

Financial decisions happen above the computing power of most humans. Not because people are stupid, but because the systems are deliberately complex. The interaction between loan structures, tax brackets, interest rates, and time horizons requires modeling that doesn't fit in your head.

The people who understand these systems profit from them. The people who don't, pay.

This tool puts the math on your side.

## Design Principles

**Financial data only.** We don't mix money information with other personal data. This is a lens for seeing one thing clearly.

**Trajectory over history.** We don't care what you spent last month. We care where you're headed.

**Paths, not prescriptions.** The tool shows options. You decide what matters.

**Visible math.** No black boxes. If the tool recommends something, you can see why.

**No product integration.** We don't connect to banks, brokerages, or services that want to sell you things. You input the numbers. You control the data.

## Who This Is For

People who feel stuck with a plan they didn't fully choose. People who know something is wrong but can't see the whole picture. People who want to understand the machine before it finishes processing them.

This is a high-visibility lifeline for those who need it. If you need it, you'll find it.

## Development

### Prerequisites

- Node.js 18+
- npm

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

### Project Structure

```
src/
├── models/         # Type definitions and model utilities
│   ├── common.ts   # Shared types (Cents, Rate, ID)
│   ├── profile.ts  # Financial profile structure
│   ├── income.ts   # Income sources
│   ├── debt.ts     # Debt modeling
│   ├── trajectory.ts # Projection results
│   ├── comparison.ts # What-if scenario comparisons
│   └── optimization.ts # Optimization suggestions
├── engine/         # Core calculation logic
│   ├── projector.ts    # Main projection engine
│   ├── comparator.ts   # Comparison calculations
│   ├── amortization.ts # Debt amortization
│   ├── growth.ts       # Asset growth calculations
│   └── tax-calculator.ts # Tax estimation
├── scanner/        # Optimization detection
│   ├── tax-rules.ts    # Tax optimization rules
│   ├── debt-rules.ts   # Debt strategy rules
│   ├── savings-rules.ts # Savings opportunity rules
│   └── housing-rules.ts # Housing optimization rules
├── storage/        # Data persistence (IndexedDB)
│   ├── profile-store.ts # Profile CRUD operations
│   ├── preferences.ts   # User preferences
│   └── export.ts        # Import/export functionality
└── ui/            # User interface
    ├── App.ts           # Main application
    ├── components/      # Reusable UI components
    ├── views/           # Page-level views
    └── utils/           # UI utilities (DOM, formatting)
```

### Key Concepts

**Currency in Cents**: All monetary values are stored as integers in cents to avoid floating-point precision issues. Use `dollarsToCents()` and `centsToDollars()` for conversion.

**Rates as Decimals**: Interest rates and growth rates are stored as decimals (e.g., 0.065 for 6.5%), not percentages.

**Component Pattern**: UI components follow a factory pattern returning `{ element: HTMLElement, destroy(): void }` for cleanup.

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Tech Stack

- **TypeScript** - Strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- **Vite** - Build tool and dev server
- **Vitest** - Test runner
- **D3.js** - Data visualization
- **IndexedDB (idb)** - Local storage

## License

MIT

## Contributing

Contributions welcome. Please ensure tests pass before submitting PRs.
