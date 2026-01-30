# Claude.md - Financial Path Visualizer

## Project Overview

Financial Path Visualizer is a privacy-focused financial planning tool that projects personal finances 50+ years into the future. It shows trajectory outcomes of financial decisions (e.g., smaller house → earlier retirement) rather than prescribing actions. All calculations run client-side with zero external server communication.

**Core Philosophy:**
- Trajectory over history (future-focused, not past spending analysis)
- Visible math (transparent calculations, no black boxes)
- Paths, not prescriptions (show options, let users decide)
- Complete data privacy (client-side only, no telemetry)

## Tech Stack

- **Language:** TypeScript 5.6 (strict mode)
- **Build:** Vite 6.0
- **Testing:** Vitest (unit), Playwright (E2E)
- **Visualization:** D3.js 7.9
- **Storage:** IndexedDB via idb 8.0
- **No frameworks** - vanilla DOM manipulation for UI

## Quick Start

```bash
npm install
npm run dev          # Development server at localhost:5173
npm run build        # Production build
npm run typecheck    # Type checking
npm run lint:fix     # Lint and auto-fix
npm run test:run     # Unit tests
npm run test:e2e     # E2E tests
```

## Directory Structure

```
src/
├── models/          # Type definitions (Cents, Rate, Profile, etc.)
├── engine/          # Core calculation logic (projector, tax, amortization)
├── scanner/         # Optimization detection rules
├── storage/         # IndexedDB persistence layer
├── data/            # Static data (tax brackets)
├── workers/         # Web Workers for heavy calculations
└── ui/
    ├── components/  # Reusable UI components
    ├── views/       # Page-level views
    ├── viz/         # D3.js visualization components
    ├── utils/       # DOM, formatting, state utilities
    └── styles/      # CSS

tests/
├── unit/            # Vitest unit tests (mirrors src structure)
└── e2e/             # Playwright E2E tests
```

## Critical Conventions

### Currency: Always Use Cents

All monetary values are stored as **integers in cents** to avoid floating-point errors:

```typescript
type Cents = number;        // $100.00 = 10000

// Conversion helpers in src/models/common.ts
dollarsToCents(100)         // → 10000
centsToDollars(10000)       // → 100
```

### Rates: Always Use Decimals

Interest rates and growth rates are stored as **decimal values**, not percentages:

```typescript
type Rate = number;         // 6.5% = 0.065

// Conversion helpers in src/models/common.ts
percentToRate(6.5)          // → 0.065
rateToPercent(0.065)        // → 6.5
```

### Date Representation

```typescript
interface MonthYear {
  month: number;    // 1-12 (not 0-indexed)
  year: number;     // Full year (e.g., 2024)
}
```

### IDs

```typescript
type ID = string;
generateId()        // Uses crypto.randomUUID()
```

## UI Component Pattern

Components use a factory pattern returning an element and cleanup function:

```typescript
function createComponent(props: Props): { element: HTMLElement; destroy(): void } {
  const element = document.createElement('div');
  // Setup, event listeners...

  return {
    element,
    destroy() {
      // Cleanup event listeners, subscriptions
    }
  };
}
```

**DOM Safety:**
- Use `textContent` (safe from XSS), avoid raw `innerHTML`
- Use `createElement()` helper from `src/ui/utils/dom.ts`

## State Management

Centralized store with subscription pattern in `src/ui/utils/state.ts`:

```typescript
import { appStore, dispatch } from '@ui/utils/state';

// Read state
const state = appStore.getState();

// Subscribe to changes
const unsubscribe = appStore.subscribe((state) => { /* update UI */ });

// Dispatch actions
dispatch({ type: 'SET_VIEW', payload: 'trajectory' });
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/models/profile.ts` | Core FinancialProfile data structure |
| `src/models/common.ts` | Shared types (Cents, Rate, MonthYear) and converters |
| `src/engine/projector.ts` | Main year-by-year projection engine |
| `src/engine/tax-calculator.ts` | Federal/state tax calculations |
| `src/engine/amortization.ts` | Debt payment calculations |
| `src/ui/App.ts` | Main application component and routing |
| `src/storage/profile-store.ts` | Profile CRUD operations |

## Data Model Overview

```
FinancialProfile
├── Income[]        # salary, hourly, variable, passive
├── Debts[]         # mortgage, auto, student, credit, personal
├── Obligations[]   # monthly bills, subscriptions
├── Assets[]        # retirement, savings, investments
├── Goals[]         # purchase, retirement, education targets
└── Assumptions     # inflation, returns, tax filing status
```

## Testing

### Unit Tests (Vitest)
```bash
npm test              # Watch mode
npm run test:run      # Single run (CI)
npm run test:coverage # With coverage
```

Tests are in `tests/unit/` mirroring the `src/` structure.

### E2E Tests (Playwright)
```bash
npm run test:e2e           # Headless
npm run test:e2e:headed    # With browser
npm run test:e2e:ui        # Playwright UI
```

Tests cover: quick-start wizard, trajectory view, comparisons, settings.

## Code Style

- **TypeScript strict mode** with `noUncheckedIndexedAccess`
- **ESLint** with typescript-eslint strict rules
- **Prettier** (single quotes, 100 char lines, trailing commas)
- Prefix unused variables with `_`
- Explicit return types on functions
- No `any` type usage

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:

```typescript
import { FinancialProfile } from '@models/profile';
import { projectFinances } from '@engine/projector';
import { profileStore } from '@storage/profile-store';
```

## Performance Considerations

- Heavy calculations run in Web Workers (`src/workers/projection-worker.ts`)
- Worker coordination via `src/engine/worker-manager.ts`
- Debounced input handling in forms
- Only recalculate affected projection years on changes

## Common Tasks

### Adding a New Income Type
1. Update `IncomeType` in `src/models/income.ts`
2. Update `src/engine/income-projector.ts` calculation logic
3. Update `src/ui/views/editor/IncomeEditor.ts` form
4. Add tests in `tests/unit/engine/income-projector.test.ts`

### Adding an Optimization Rule
1. Add rule function in appropriate `src/scanner/*-rules.ts`
2. Register in `src/scanner/index.ts`
3. Add tests in `tests/unit/scanner/`

### Adding a New View
1. Create view in `src/ui/views/NewView.ts`
2. Add route handling in `src/ui/App.ts`
3. Update navigation if needed
4. Add E2E test in `tests/e2e/`

## Security Notes

- All data stored locally in IndexedDB
- No external API calls
- No telemetry or analytics
- Export format is plain JSON
- See `SECURITY.md` for vulnerability reporting
