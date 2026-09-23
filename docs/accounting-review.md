# Accounting repair review

## Implemented in this change

- Pending and Analytics check the active book's administrator permission, not the unrelated global administrator flag. The creator remains administrator of their own book.
- Approved sales capture inventory unit cost on the backend. Selling one unit costing NGN 50 for NGN 60 produces NGN 10 gross profit. Gross profit is before operating expenses; it is not net profit or a percentage margin.
- Inventory is stored in units. Carton entries are converted once; purchases increase stock and approved sales decrease it. Purchase costs use weighted-average unit cost. Duplicate submissions, overselling, zero quantities, repeated approvals and ambiguous same-name inventory matches are rejected.
- Pending transactions do not change posted financial totals, stock or customer balances. Approval posts once. Posted transactions cannot be deleted or rejected: a proper reversal workflow is still required.
- Customer totals and debt are derived from approved sales, including existing transactions with missing customer profiles. Names are matched without case or surrounding-space differences. New sales update contact details. Credit sales add customer debt; cash sales do not.
- Customer photos support JPEG, PNG and WebP, up to 200 KB, with book-membership read access and book-admin write access. The additive photo methods use a small handwritten adapter, leaving generated Caffeine bindings untouched.
- Successful mutations refresh active query data, including dashboard, inventory and customers. Inflows no longer multiply carton amounts twice. Customer statements recognize the actual `Credit Sales` type.
- New USD transactions normalize to NGN using the saved exchange rate; missing rates are rejected. Product profit percentages use the product's own revenue. Approval duration uses recorded audit events instead of fixed sample values.

## Verification

The repository had no README or src/spec.md. Review used project.json, DESIGN.md, source code and the reported workflows.

The regression suite executes the actual Motoko actor with a second staff actor. It covers creator permissions, the 50/60 example, cash and credit sales, stock, carton purchases and sales, customer history, duplicate/oversell/zero rejection, photo persistence, pending approval, repeated approval, unique debtor counts and USD conversion.

Run `node tests/backend-check.cjs --build --test` with the npm `motoko` package available. `MOTOKO_PACKAGE` may point to its installed package directory; `MOTOKO_CORE` should point to the `src` folder of motoko-core v2.5.0, matching mops.toml. Verification used npm motoko 4.14.0 and core v2.5.0 in an isolated temporary tools folder. This is not the pinned native moc 1.8.2 toolchain.

The checker typechecks, builds Internet Computer WebAssembly and compares stable state with the checked-in backend.most, failing on compatibility errors. Frontend checks use `tsc --noEmit` and `vite build` from src/frontend. No generated deployment artifacts or dependency-policy changes are included.

## Important remaining work before production sign-off

This is a targeted repair, not certification of the entire app as accounting software. No live deployment, browser end-to-end test, native pinned-toolchain build or real-data migration has been performed.

1. Back up the live canister and reconcile historical stock and cost snapshots. Incorrect old costs, quantities and currency cannot safely be inferred or silently rewritten. Derived customer profiles can recover sales history, but cannot reconstruct missing repayment records.
2. Implement customer repayments/allocations, supplier payments, refunds, returns and auditable reversal entries. Debt currently represents recorded credit sales, not a complete receivables ledger with settlement. Existing overdue calculations assume dates rather than agreed invoice due dates.
3. Replace name-based item/customer identity with stable IDs. The same part at multiple locations is ambiguous; this change rejects ambiguous posting rather than choosing arbitrary stock. People sharing names can still be merged. Test historical duplicates and multi-location transfers before rollout.
4. Complete the analytics audit. Revenue forecasts include assumed growth; restocking counts, turnover denominators, dead-stock dates, break-even (which currently omits COGS), branch figures and cached summaries still need correction. Do not use these panels as authoritative reports yet.
5. Review expense currency, cash/accrual reporting, opening balances and bank reconciliation. Money still uses floating-point values; adopt fixed minor units and documented rounding before payment processing.
6. Run authenticated browser checks for creator, delegated administrator, staff and unrelated book members, including navigation, save errors, photo upload, account switching and refresh after approval. Existing repository-wide lint findings are not all resolved.
7. In Caffeine's staging workflow regenerate bindings, build with the pinned toolchain, verify upgrade compatibility against the actual deployed stable signature, and run the regression scenarios with disposable data. Review the photo adapter after regeneration. Do not replace the live canister with a fresh empty instance.

No online checkout or payment processing is implemented in this repair. See storefront-plan.md.
