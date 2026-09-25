# September 2026 accounting corrections — testing guide

## Daily workflow

- Dashboard **Customer payments and refunds**, or expand a customer profile: click **Record full / part payment**, enter money already received, and confirm. This records a payment; it does not charge a bank account.
- Every transaction ID opens its receipt, payment history and administrator corrections. Credit balances remain open until fully paid. Overpayments and duplicate receipt IDs are rejected.
- Click a product name in Inventory for its description, image and stock-alert settings. Only book admins can save changes. Use fitment, vehicle model/year and part-number information in the description; check fitment before selling.
- Admins can correct transaction quantities/prices, exchange the item, or void/delete a record. A partial return reduces the retained quantity. A full return uses void. Returned goods must be physically received in saleable condition. Damaged goods require separate stock reconciliation, not a saleable return.
- Voided records remain in the **Voided transactions / returns archive**. Their original values and edit history are retained; they no longer count in active statistics. Issue and record any refund due, including cash-sale refunds. A refund record does not send money.
- Cash-sale quantity/price increases assume the extra payment has already been collected. If unpaid, record the additional supply as a separate credit sale. Credit-sale edits retain recorded payments and calculate the revised debt/refund due.
- Expenses have **Edit / void expense**. The audit log retains the actor, timestamp, reason and full before/after expense record.
- Profit, costs, expense records, purchase figures, analytics and correction-history cost snapshots are restricted on the backend, not merely hidden in the UI. All book admins, including the creator, have access.

## Financial basis and limits

This is the owner's requested **cost-recovery management view**, not an assertion of statutory/accrual accounting compliance. Credit profit is zero while receipts do not exceed the invoice's recorded goods cost; afterward only the excess is recognized, capped at the invoice profit. Fully settled below-cost sales recognize the actual loss.

Cash profit = corrected sale value minus goods cost. Net margin in NGN = realized gross profit minus approved expenses; the percentage is net profit divided by recognized receipts. Operating break-even is reached when net profit reaches zero. This is not a forecast of required sales using fixed/variable-cost assumptions.

Repayments enter period reports on their recorded receipt date. Corrections restate the original transaction/payment periods; the audit trail retains when the correction was actually made. This version does not implement closed accounting periods, tax returns, multi-line invoices, bank settlement integration or automated damaged-stock write-offs. Purchase reversals are blocked if available stock/value cannot safely support reversal.

Inventory policies are per product: alerts enabled, minimum units, target units and supplier lead time. The reorder suggestion is target minus current units. Lead time is an administrator planning input, not an automatic demand forecast. Avoid negative stock, use consistent units and give separate SKUs unambiguous names.

Product images accept JPEG/PNG/WebP up to 200 KB; use a compressed product photo without private data. Existing credit sales have no invented repayment history: record only payments actually verified as received.

## Disposable testing checklist

1. Create a fresh test book and inventory item: 10 units, cost ₦50, price ₦60.
2. Cash sale of 1: inventory 9, gross profit ₦10, customer history updated.
3. Credit sale of 1: inventory 8, debt ₦60, no additional profit.
4. Receive ₦20, then ₦30, then ₦5, then ₦5: debt 40/10/5/0; credit profit 0/0/5/10. Stock must not change during repayment.
5. Record expense ₦3: net profit is gross profit less ₦3. Correct the expense and inspect its audit entry.
6. Return one of two sold units; verify stock, invoice total, refund due, realized profit and revision history. Record a partial refund and verify the remainder.
7. Void a sale; verify stock restored, statistics reduced, archive present and refund tracked.
8. Use a staff account: costs, purchases, expense totals, profits and analytics must be unavailable. Attempt admin mutations using API tests as well as checking buttons.
9. Set minimum stock above current units, verify alert; disable alerts and verify removal. Add description/photo as admin, view as staff.

## Verification evidence

- Frontend TypeScript, full Biome accessibility/lint gate, Vite production build and generated-storage dependency regression run in isolated checkout.
- Backend checked and IC Wasm compiled with portable `motoko` npm 4.14.0 / core 2.5.0. Project-declared compiler is moc 1.8.2; portable results are not a claim of an identical Caffeine toolchain.
- Stable signature checked against provenance-labelled Caffeine v23 export: passed. This alone does not prove deployed-memory compatibility.
- Motoko interpreter regressions cover payments, duplicate/overpayment guards, refunds, returns, edits, stale revision rejection, void/delete, staff restrictions, expenses, stock policies, products and weighted-cost preservation.
- Caffeine deployment and authenticated browser results are recorded separately in the task handoff. Do not call interpreter tests a full canister/browser end-to-end test.
