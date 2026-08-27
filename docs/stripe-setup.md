# Stripe Setup

Stripe Checkout is fully wired. The backend ships with it **off**, and supplying credentials is
the only step left. Nothing else in the API depends on Stripe being configured.

## What is implemented

| Piece | Location |
|---|---|
| Publishable key / enabled flag | `GET /api/stripe/config` |
| Checkout session creation | `POST /api/invoices/{id}/checkout-session` |
| Issue a refund | `POST /api/invoices/{id}/refunds` |
| List refunds | `GET /api/invoices/{id}/refunds` |
| Webhook receiver | `POST /api/stripe/webhook` |
| Payment recording | `PaymentService.recordStripePayment` |
| Refund recording | `PaymentService.recordRefund` |
| Fee split (gross / fee / net) | `payments.stripe_fee_amount`, `payments.net_amount` |
| Decline reason | `invoices.last_payment_error` |
| Replay protection | `stripe_events` + partial unique indexes on `payments` and `refunds` |

## Turning it on

Set these on the backend. Test-mode keys are enough to exercise the whole flow.

```txt
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://app.example.com/invoices?payment=success
STRIPE_CANCEL_URL=https://app.example.com/invoices?payment=cancelled
```

`STRIPE_SECRET_KEY` alone enables payment links and refunds. `STRIPE_WEBHOOK_SECRET` is what lets
Stripe tell the app a payment succeeded — **without it invoices never move to paid**, because an
unverified webhook is rejected rather than trusted.

## Local testing

Forward events to the local backend with the Stripe CLI. The command prints the `whsec_...` value
to use as `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:8080/api/stripe/webhook
```

Then trigger a real test payment:

```bash
stripe trigger checkout.session.completed
```

## Production webhook

Register the endpoint at `https://<api-host>/api/stripe/webhook` and subscribe to:

| Event | Effect |
|---|---|
| `checkout.session.completed` | Records the payment, settles the invoice, captures the fee |
| `checkout.session.async_payment_succeeded` | Same, for delayed methods such as SEPA debit |
| `checkout.session.async_payment_failed` | Clears the stale session reference |
| `checkout.session.expired` | Clears the stale session reference |
| `charge.refunded` | Reconciles a refund, including one issued from the Stripe dashboard |
| `payment_intent.payment_failed` | Stores the decline reason on the invoice |
| `charge.dispute.created` | Writes an audit entry; does **not** move money |

Any other event type is accepted and acknowledged, but ignored. Acknowledging stops Stripe
retrying events the app will never act on.

## How a payment settles

1. The dashboard calls `POST /api/invoices/{id}/checkout-session` for a non-draft invoice with a
   balance due.
2. The API creates a session for the **outstanding balance**, not the invoice total, so a partly
   paid invoice charges only what remains. Metadata carrying `invoiceId` and `companyId` is
   attached to both the session and the PaymentIntent.
3. The payer completes the hosted Stripe page.
4. Stripe posts `checkout.session.completed`. The API verifies the signature, records a `stripe`
   payment, moves the invoice to `partially_paid` or `paid`, and reads the balance transaction to
   store what Stripe kept.

The session contains **one** line item priced at the invoice balance rather than a copy of each
invoice line. Re-itemising would let Stripe re-derive the total from its own per-line rounding, and
any disagreement with the stored total would charge the customer a different amount than the
invoice says.

## How a refund works

`POST /api/invoices/{id}/refunds` with an optional `amount` (omit it to refund everything still
refundable) and optional `reason` (`duplicate`, `fraudulent`, `requested_by_customer`).

Stripe is called **first**, and the local record follows, so the app never claims to have returned
money that Stripe did not actually return. A refund reduces `amountPaid`, raises `balanceDue`, and
moves the invoice back to `partially_paid` or `sent` — never back to `draft`, and never out of
`cancelled`, because a refund changes how much was paid, not whether the invoice was issued.

Refunds issued directly in the Stripe dashboard are reconciled through `charge.refunded`. Stripe
reports `amount_refunded` cumulatively on the charge, so the app records the **difference** between
that figure and what it already holds. That is what makes repeated partial refunds add up instead
of double-counting.

## Safety properties worth keeping

- **Signature verification is mandatory.** Anyone able to post an unverified body could mark any
  invoice paid.
- **Handling is idempotent at three levels.** Processed event ids in `stripe_events`, a partial
  unique index on `payments.stripe_payment_intent_id`, and another on `refunds.stripe_refund_id`.
- **The webhook is exempt from rate limiting.** Throttling it would turn a spike into a retry storm.
- **Only settled money is recorded.** A session can complete while an async method is still
  pending; nothing is recorded until `payment_status` is `paid`.
- **Amounts convert through a currency-aware exponent.** EUR 2 decimals, JPY 0, BHD 3. An exponent
  wrong by one charges the customer ten times the invoice.
- **A dispute does not reverse the invoice.** The money is held, not returned, and the dispute may
  be won. Reversing on `charge.dispute.created` would misstate the invoice for the whole dispute
  window, so it is audited and left to a human.
- **Fee capture is best-effort.** The invoice settles against the gross amount, so a failure to
  read the balance transaction leaves the fee columns null rather than breaking the webhook.

## Deliberately out of scope

- **Subscriptions and recurring billing.** This is one-off invoice payment. Recurring billing is a
  different product surface, not a missing piece of this one.
- **Automatic dispute resolution.** Won and lost disputes are not reconciled; handle them in the
  Stripe dashboard and adjust the invoice manually.
- **Payout reconciliation.** Stripe payouts are not matched against a bank feed.
