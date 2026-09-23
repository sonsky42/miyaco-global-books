# Automotive parts storefront: immediate online payment

The requested checkout takes payment immediately, not an order request for manual confirmation. It must use the accounting app's authoritative inventory; a separate unconnected product list would allow overselling.

## Required foundations

- Stable SKU IDs and per-location quantities, with fitment fields for vehicle make, model, year, side, shaft/CV-joint type and part number. Publish only selected approved inventory with retail price and product photos; do not expose costs, customer data or private accounting records.
- Available stock = physical stock minus active reservations. Reserve atomically on the backend before starting payment, with an expiry and idempotency key. Two buyers cannot reserve the last unit simultaneously. Pending staff sales must be considered in the reservation policy.
- A server-verified payment flow: create checkout for a server-calculated NGN amount, verify signed payment events and independently confirm the reference/amount/currency. Never trust a browser success redirect. Keep secret keys off the frontend.
- A durable order state machine: awaiting payment, paid, fulfilment, completed, cancelled and refunded. Deduplicate callbacks and post exactly one approved accounting sale/customer update/stock movement. Handle payment arriving after reservation expiry through reconciliation, not a negative stock sale.
- Shipping/pickup prices, customer contact and delivery address, receipts, fulfilment status, cancellation/refund policy, payment-event audit logs and reconciliation jobs.

## Decisions and access still needed

Choose the payment provider and supply its test-mode integration through a secure configuration channel, not this document or source code. Confirm delivery areas/charges, pickup details and who fulfils orders. No provider account has been created and no live payment is authorized by this plan.

## Acceptance tests before live payments

Test simultaneous last-item checkout, expired/abandoned reservations, failed payments, duplicate and out-of-order payment events, amount mismatch, callback outage/retry, payment after expiry, partial/full refunds, delivery charges and accounting reconciliation. Confirm one paid order produces one stock deduction and one sale, with the correct customer and cost snapshot.

Build the storefront after the accounting ledger and inventory identity are reliable. This document is an implementation plan, not a deployed storefront.
