# REFOCUS PLAN

> **Goal:** Stop building outward. Start building downward. Make the core projection engine trustworthy before adding anything else.

This plan has 4 phases. Each phase has a clear exit criteria. Do not advance to the next phase until the current phase's exit criteria are met.

---

## PHASE 1: Fix the Math (Priority: CRITICAL)

The entire product's value depends on calculation accuracy. Right now, several core calculations are wrong or use placeholder logic. Fix these before touching anything else.

### 1.1 Implement Progressive State Tax Brackets

**Problem:** `src/data/state-taxes.ts` stores a single flat rate per state. `src/engine/tax-calculator.ts:128-130` applies this flat rate to all income. California, for example, uses 13.3% on ALL taxable income instead of its actual 9-bracket structure (1% to 13.3%). This overcharges a $100K earner by ~$6,000/year and compounds over a 30-year projection.

**Fix:**
- Restructure `src/data/state-taxes.ts` to include bracket arrays for progressive states (CA, NY, NJ, OR, MN, HI, VT, IA, DC, and others)
- Update `calculateStateTax()` in `src/engine/tax-calculator.ts:109-134` to iterate brackets like `calculateFederalTax()` already does
- Keep flat-rate states (IL, IN, MI, etc.) and no-income-tax states (TX, FL, WA, etc.) as-is

**Files to change:**
- `src/data/state-taxes.ts` — add bracket data for ~12 progressive states
- `src/engine/tax-calculator.ts` — update `calculateStateTax()` to use brackets

**Tests to add:**
- California resident at $50K, $100K, $250K, $500K — compare to actual 2024 CA tax tables
- New York resident at same income levels
- Flat-rate state (Illinois) to verify no regression
- No-income-tax state (Texas) to verify no regression

**Exit criteria:** State tax calculations for CA, NY, NJ at $100K income match actual 2024 tax tables within $50.

### 1.2 Fix Amortization Rounding

**Problem:** `src/engine/amortization.ts:125` rounds interest *before* computing principal, causing $1-5 cumulative error over a 30-year mortgage. Small, but a financial tool should be precise.

**Fix:**
- Accumulate interest/principal in full precision throughout the schedule
- Round only the final displayed values
- Adjust the final payment to zero out the balance exactly

**Files to change:**
- `src/engine/amortization.ts` — fix `generateAmortizationSchedule()` and `calculateDebtYear()`

**Tests to add:**
- Verify a 360-month mortgage ends at exactly $0 balance
- Verify total interest + total principal = total payments

**Exit criteria:** No amortization schedule produces a non-zero final balance.

### 1.3 Fix Net Worth Milestone Formatting

**Problem:** `src/engine/projector.ts:320` outputs `$100000` without comma formatting for net worth milestones.

**Fix:**
- Use `toLocaleString()` for milestone dollar amounts

**Files to change:**
- `src/engine/projector.ts:320` — one-line fix

**Exit criteria:** Milestone descriptions display `$100,000` not `$100000`.

### 1.4 Fix Income Projector Hardcoded Growth Rate

**Problem:** `src/engine/income-projector.ts:155` uses hardcoded `0.02` growth rate in `findLastIncomeYear()` instead of the user's configured `salaryGrowth` assumption.

**Fix:**
- Pass the user's `salaryGrowth` from assumptions through to this function

**Files to change:**
- `src/engine/income-projector.ts` — update `findLastIncomeYear()` signature and callers

**Exit criteria:** Changing salary growth assumption affects retirement year calculation.

---

## PHASE 2: Harden the Engine (Priority: HIGH)

The math is fixed but the engine hasn't been tested against edge cases. A user entering unusual data will get garbage results or crashes. Fix before any new features.

### 2.1 Add Edge Case Tests

Write tests for scenarios real users will hit:

| Scenario | Expected Behavior |
|----------|-------------------|
| $0 income | Trajectory shows declining net worth from debt/obligations |
| Negative net worth (more debt than assets) | Correctly display negative, milestones don't trigger |
| Retirement at age 25 | Short projection, retirement readiness checks still work |
| Income that ends mid-projection | Post-income years show $0 income, taxes drop to $0 |
| Zero debts, zero assets | Clean projection with only income/taxes/obligations |
| Very high income ($10M+) | Tax brackets cap correctly, Social Security wage base caps |
| Very long projection (age 20 to 95 = 75 years) | No overflow, no performance degradation |
| All debts paid off in year 1 | Subsequent years show $0 debt payments, milestones fire |
| Negative growth rate on assets | Balance decreases over time |

**Files to change:**
- `tests/unit/engine/projector.test.ts` — add ~10 edge case tests
- `tests/unit/engine/tax-calculator.test.ts` — add high-income and zero-income tests
- `tests/unit/engine/growth.test.ts` — add negative return test
- `tests/unit/engine/amortization.test.ts` — add sub-minimum-payment test

**Exit criteria:** All new edge case tests pass. No test produces NaN, Infinity, or negative-when-it-should-be-positive values.

### 2.2 Fix ESLint Errors

236 errors in a 16K-line codebase means 1 error per 68 lines. This undermines confidence in the code.

**Approach:** Two-pass fix.
1. Run `npm run lint:fix` to auto-fix the 89 auto-fixable errors
2. Manually fix the remaining ~147 errors, prioritized by category:
   - `restrict-template-expressions` (67): Add `String()` wrappers or `.toLocaleString()` where displaying numbers
   - `explicit-function-return-type` (39): Add return type annotations
   - `no-confusing-void-expression` (30): Add braces to arrow functions
   - `no-unnecessary-type-assertion` (25): Remove redundant `as` casts
   - `no-misused-promises` (12): Fix async callbacks
   - `no-non-null-assertion` (22): Replace `!` with `?? fallback` or optional chaining

**Exit criteria:** `npm run lint` exits with 0 errors. Add lint to CI so it stays clean.

### 2.3 Make Tax Bracket Year Configurable

**Problem:** Tax brackets are frozen to 2024 in `src/data/federal-tax-brackets.ts`. There's no way to update without editing source code.

**Fix:**
- Add a `taxYear` field to `Assumptions` in `src/models/assumptions.ts`
- Store bracket data keyed by year: `{ 2024: {...}, 2025: {...} }`
- When projecting future years, use the latest available bracket data and note the assumption
- Add 2025 brackets when IRS publishes them (or estimate via inflation adjustment)

**Files to change:**
- `src/data/federal-tax-brackets.ts` — restructure to support multiple years
- `src/models/assumptions.ts` — add `taxYear` field
- `src/engine/tax-calculator.ts` — accept year parameter

**Exit criteria:** Projection engine can use 2024 or 2025 brackets based on configuration.

---

## PHASE 3: Fix the Scanner (Priority: MEDIUM)

The optimization scanner currently gives advice based on napkin math. Either make it accurate or don't ship it. This phase makes it accurate.

### 3.1 Replace Lifetime Impact Multipliers with Real Projections

**Problem:** Scanner rules use crude multipliers for lifetime impact:
- `src/scanner/tax-rules.ts:63` — `lifetimeChange: potentialSavings * 20`
- `src/scanner/tax-rules.ts:123` — `lifetimeChange: missedMatch * 30`
- `src/scanner/debt-rules.ts:58` — `lifetimeChange: interestSaved * 5`
- `src/scanner/savings-rules.ts:79` — `additionalRetirementSavings = increaseNeeded * 25`

**Fix:**
The projection engine already exists. Use it:
1. Create a modified profile with the suggested optimization applied
2. Run `generateTrajectory()` on the modified profile
3. Compare the two trajectories to get actual lifetime impact
4. Use the real delta instead of the multiplier

**Files to change:**
- `src/scanner/tax-rules.ts` — all 4 rules
- `src/scanner/debt-rules.ts` — all 4 rules
- `src/scanner/savings-rules.ts` — all rules
- `src/scanner/housing-rules.ts` — all rules
- May need a helper: `calculateOptimizationImpact(profile, modification) => Impact`

**Exit criteria:** No scanner rule uses a hardcoded multiplier for lifetime impact. All impacts come from actual trajectory comparison.

### 3.2 Remove Hardcoded Market Rates from Scanner

**Problem:**
- `src/scanner/debt-rules.ts:192-194` — hardcoded refinance rates (6.5% mortgage, 7% auto, 5.5% student)
- `src/scanner/savings-rules.ts:132` — hardcoded `EXPECTED_INVESTMENT_RETURN = 0.07`
- `src/scanner/savings-rules.ts:133` — hardcoded `CURRENT_SAVINGS_RETURN = 0.02`
- `src/scanner/housing-rules.ts:80` — hardcoded `EXPECTED_STOCK_RETURN = 0.08`

**Fix:**
- Pull investment return assumptions from the user's profile `assumptions.marketReturn`
- For refinance rates: either remove the refinance rule (since rates can't be known) or make rates a configurable assumption
- For savings return: use the actual `expectedReturn` from the user's savings asset

**Files to change:**
- `src/scanner/debt-rules.ts` — `refinanceOpportunityRule`
- `src/scanner/savings-rules.ts` — all rules using hardcoded returns
- `src/scanner/housing-rules.ts` — investment comparison rules
- `src/models/assumptions.ts` — optionally add `currentRefinanceRate` field

**Exit criteria:** No scanner rule contains a hardcoded rate that conflicts with the user's configured assumptions.

---

## PHASE 4: Ship and Learn (Priority: HIGH after Phase 1-2)

No feature work. Deploy what exists and get real feedback.

### 4.1 Deploy as Static Site

The app is a client-side SPA with no backend. Deploy it.

**Options (pick one):**
- GitHub Pages (free, already on GitHub)
- Cloudflare Pages (free, fast)
- Vercel (free tier)

**Steps:**
1. Run `npm run build`
2. Deploy `dist/` folder
3. Add deployment URL to README.md

**Exit criteria:** App is accessible via a public URL.

### 4.2 Trim Documentation to Match Reality

**Problem:** 2,662 lines of documentation for a v0.1.0 prototype with no users. `IMPLEMENTATION_SPEC.md` alone is 1,411 lines.

**Action:**
- Delete `IMPLEMENTATION_SPEC.md` (1,411 lines) — it's a build plan, not user/developer docs, and the build is done
- Delete `CONTRIBUTING.md` (193 lines) — no contributors yet
- Delete `SECURITY.md` (90 lines) — premature for a prototype
- Delete `Architecture.md` (480 lines) — fold the useful parts into README.md
- Keep `README.md`, `CHANGELOG.md`, `claude.md`

**Lines removed:** ~2,174

**Exit criteria:** Only README.md, CHANGELOG.md, and claude.md remain. README contains a "How it works" section covering the key architectural decisions.

### 4.3 Get 5 Users to Try It

**Method:**
- Post to r/personalfinance, r/financialindependence, or Hacker News "Show HN"
- Ask 3 specific questions:
  1. "Did the projected trajectory match your intuition about your finances?"
  2. "What's the first thing you'd want to change or add?"
  3. "Did any number look wrong?"

**Exit criteria:** 5 real people have used the tool and provided feedback.

---

## What NOT to Do (Temptation List)

These are features/improvements that seem valuable but should be resisted until Phase 4 feedback says otherwise:

| Temptation | Why Not |
|------------|---------|
| Add Monte Carlo simulation | Adds complexity before base projection is trusted |
| Add real-time market rate API | External dependency, privacy concern, maintenance burden |
| Migrate UI to React/Vue | Massive rewrite, zero user-facing benefit |
| Add more optimization rules | Existing rules aren't accurate yet (Phase 3) |
| Add user accounts / cloud sync | Contradicts local-first value prop |
| Add budget tracking | Different product entirely |
| Add mobile app | Premature — web app works on mobile already |
| Add more documentation | Already over-documented |
| Add more themes | Cosmetic, zero accuracy impact |

---

## Timeline and Effort Estimates

| Phase | Scope | Status Gate |
|-------|-------|-------------|
| **Phase 1: Fix the Math** | 4 work items, ~8 files changed | All calculation accuracy tests pass |
| **Phase 2: Harden the Engine** | 3 work items, ~20 files changed | 0 lint errors, all edge case tests pass |
| **Phase 3: Fix the Scanner** | 2 work items, ~8 files changed | No hardcoded multipliers or rates remain |
| **Phase 4: Ship and Learn** | 3 work items, ~5 files changed | App deployed, 5 users tested |

**Dependency chain:** Phase 1 -> Phase 2 -> Phase 3. Phase 4 can start after Phase 2 (scanner fixes can happen in parallel with user testing).

---

## Success Metrics

After executing this plan, the project should be able to answer "yes" to all of these:

1. Does a California resident's projected tax match actual 2024 tax tables within $50?
2. Does a 30-year mortgage amortization end at exactly $0?
3. Does `npm run lint` pass with 0 errors?
4. Does every scanner recommendation show impact calculated from actual trajectory comparison?
5. Can a real user access the app via a public URL?
6. Has at least one real user confirmed "the numbers look right"?

If any answer is "no," the project isn't ready for new features.
