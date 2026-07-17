# Pixie Account Check

Status: experimental prototype  
Updated: 2026-07-16

## Proposition

**Pixie Account Check** is a 29 kr one-time comparison that helps a saver identify suitable deposit accounts for a dedicated SavePixie Savings Home.

It must save the customer effort, explain meaningful trade-offs, and make the ranking reproducible. It is a comparison service, not pay-to-rank advertising and not a substitute for regulated financial advice.

## Customer inputs

The first version does not require a bank login. It asks only for information needed to filter products:

- country and coarse eligibility region;
- approximate amount to compare;
- age or age-band eligibility;
- withdrawal-frequency preference;
- tolerance for notice or fixed periods;
- whether SavePixie verification compatibility is required;
- current product, optionally.

Use amount ranges and coarse location whenever exact data is unnecessary.

## Report

The paid production report must contain:

- eligible products and providers;
- current interest rate and source update time;
- estimated annual interest for the supplied amount;
- withdrawal limits, notice periods, and binding periods;
- minimum and maximum deposit rules;
- applicable deposit guarantee;
- SavePixie verification compatibility;
- a best-fit explanation;
- the full eligible result set or a clearly disclosed complete ranking slice;
- ranking methodology and direct application links.

AI may explain deterministic results in SavePixie's voice. AI must not invent products, rates, eligibility, guarantees, or calculations.

## Data provider boundary

The browser must never receive Finansportalen API credentials. Production retrieval belongs in a server-side provider implementing the same conceptual interface as the local sample engine:

```ts
interface AccountComparisonProvider {
  compare(criteria: AccountCheckCriteria): Promise<AccountCheckReport>;
}
```

The initial repository implementation uses fictional products and clearly labels every output as sample data. The production provider requires a signed Finansportalen distribution agreement and must meet its attribution, completeness, and update obligations.

## Freshness and retention

- A purchased snapshot is presented as current for seven days.
- The report remains available for 90 days.
- The customer can delete it immediately.
- Personal criteria and the report are automatically deleted after 90 days.
- A downloadable copy may be offered before deletion.
- Receipts are retained separately only as required for legal and accounting purposes.
- Raw provider data is cached only within the provider's allowed update window.

The UI stores `created_at`, `fresh_until`, and `delete_at` separately. An expired report is never presented as current.

## Monetisation

- Guest or free member: 29 kr per check.
- SavePixie Pro: first check included or discounted.
- SavePixie Family: adult household checks included according to plan limits.
- Future recurring product: Interest Watch, which reruns the comparison periodically and alerts the member only when the difference is meaningful.

Affiliate relationships may exist later, but cannot affect eligibility or ranking. Every commercial relationship must be disclosed next to the affected link.

## Prototype route

The current sample UI is available inside Plan at:

```text
/app/plan/account-check
```

Development preview:

```text
/preview/app/plan/account-check
```

The prototype:

- takes no payment;
- uses fictional banks and rates;
- performs deterministic filtering and ranking;
- stores a local sample report with seven-day freshness and 90-day deletion metadata;
- allows immediate deletion;
- contains no external crawling or live financial recommendation.

## Go-live gates

1. Signed data-distribution agreement and verified production API access.
2. Legal review of comparison copy, methodology, disclosures, and commercial links.
3. Server-side secrets and request controls.
4. Automated data-freshness monitoring.
5. Unit tests for every filter and calculation.
6. Clear failure behaviour when data is unavailable or stale.
7. Payment entitlement, refund, and report-delivery flow.
8. Privacy notice, deletion automation, and export behaviour.
