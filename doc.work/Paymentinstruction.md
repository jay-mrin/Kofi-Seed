# Payment instructions, rules and flow

Last updated: 19 November 2026. Currency: USD. Policy dates use Asia/Kolkata (India time).

This is the current payment guide. Read it with [Strictinstructions.md](Strictinstructions.md), which contains the owner's authorizations and data-preservation requirements. New owner instructions override older descriptions; update both documents when the policy changes. Historical notes in other documents do not override the current rules below.

## 1. Which payments belong in each portal

Admin eligibility requires a positive amount that is an **exact multiple of $11**, below the limit for the payment's original creation date.

| Original order date in India | Amounts eligible for Admin | Amounts exclusive to SuperAdmin |
| --- | --- | --- |
| Before 17 November 2026 | $11, $22, $33, $44 | Every other amount, including $55 and above |
| From 17 November 2026, 00:00 | $11, $22 | Every other amount, including $33 and above |

Examples: $7, $12, $14.99, $19.99, $21.99 and $32.99 never qualify for Admin, even if a collecting account or source tag says otherwise. Exact cents matter: $22.01 is not $22. The multiples rule applies to existing history as well as future payments. It does not round a customer's payment to a seed amount.

The dated limit changes at `2026-11-16T18:30:00.000Z`, which is midnight on 17 November in India. Use the original order timestamp, not today's date, when displaying or assigning an existing payment. A $33 order before that instant can qualify; a $33 order from that instant cannot.

Amount eligibility is necessary but does not replace the history and access restrictions below.

### Admin

- Shows eligible payments collected through the standard account under the existing history scope.
- From 16 November 2026, 00:00 India time (`2026-11-15T18:30:00.000Z`), may also show eligible payments collected through SuperAdmin.
- Eligible older private history remains outside Admin, except for the two specifically owner-authorized older restored Ayush receipts. Those records carry a server-written recovery marker; the exception must not expose unrelated private history.
- Calendar entries, payment totals, order actions and partner assignment must follow the same eligibility policy. Hiding a row in the browser is not sufficient; the API must enforce it.
- In weekly subscription details, individual payment amounts and dates determine eligibility. Excluded child payments must not contribute to Admin's visible successful-payment count or last successful-payment date.
- Checkout activity/analytics are unavailable to Admin.

### SuperAdmin

- Exclusively receives visibility of non-multiples of $11 and amounts at or above their dated limit, regardless of which account originally collected them.
- Retains its existing pre-16-November private-history access.
- May access its own analytics and permitted order-management features.
- Its exclusive records must not appear in Admin, partner portals, Unified, public feeds, comments, counters or derived reports.

## 2. Collecting account versus portal visibility

`payment_route` records which account collected a payment. It is separate from permission to view that record.

- Existing collecting routes, provider IDs and relationships must never be rewritten to move a payment between views.
- Current PayPal checkout sends amounts of $33 or more to the SuperAdmin collecting account. Below that boundary, the configured collecting-account selection remains in effect.
- The exact-$11-multiple rule governs **visibility and attribution**. A non-multiple collected through the standard account is still visible only in SuperAdmin.
- Dodo uses its existing standard collecting route. An excluded Dodo amount is likewise visible only in SuperAdmin; do not relabel it as a PayPal payment or pretend another account collected it.
- A pending checkout remains bound to its original provider, collecting account and amount. A retry must not silently switch those details.

## 3. Partner portals and tagged links

| Portal | Checkout path | Internal source |
| --- | --- | --- |
| Anshu | `/sowseed` | `anshu` |
| Badal | `/seed` | `badal` |
| Rohit | `/garden` | `rohit` |
| Alok | `/sownow` | `alok` |
| Ayush | `/seeds` | `ayush` |
| Himanshu | `/seedhere` | `himanshu` |

- Following the 19 November link correction, newly started `/seedhere` checkouts use `himanshu`, and `/garden` again uses `rohit`. Existing orders, in-progress attempts, memberships and their renewal attribution are not reassigned. Both portals retain their logins, eligible history and Admin assignment options.
- Attribute checkout using the current path. Do not keep a sticky partner attribution when a customer visits another path.
- Only authenticated partner accounts can read their own source's eligible, successfully completed PayPal orders.
- Partner history starts on 4 November 2026 at 00:00 India time (`2026-11-03T18:30:00.000Z`). Earlier records remain stored but are excluded from partner views.
- Enforce the exact-$11-multiple requirement and dated amount limit even when a stored tag, manual assignment or older verification flag exists.
- Partners receive only customer name, paid amount, email and original order date. No other partner's records, Admin privileges, unrestricted SuperAdmin data or order-management permissions are granted.
- Failed, cancelled, pending, untagged and Dodo payments do not qualify for partner calendars.
- High-value or non-multiple attempts must not gain new partner attribution. Retain older stored tags as history, but deny visibility when the payment is ineligible.
- Weekly payments can inherit a subscription's source only when the individual payment is eligible under its own original date and amount.

### Admin assignment controls

- The controls are Anshu, Badal, Rohit, Alok, Ayush and Himanshu.
- The former **Hide from partner portals** control is now **Ayush**. Older cached hide requests also assign Ayush.
- Only Admin may use the assignment API, for eligible completed PayPal orders from 16 November onward.
- Assignment changes only the selected order's attribution. It does not change the subscription, other payments, collecting account, amount, original timestamp or provider relationships.
- The one-time Ayush conversion covered only explicitly hidden eligible completed PayPal orders: source was null and the manual-assignment flag was true. Ordinary untagged orders were not reassigned.
- The explanatory eligibility paragraph was removed from order cards at the owner's request. The restrictions still apply in code.

## 4. Unified Payment Portal

- The current frontend displays only its isolated, generated payment-record view and does not fetch actual payments.
- Generated entries must never be inserted as real payments or mixed into real orders, totals, payment processing or other portals.
- The retained read-only backend is restricted to the previously authorized eligible union of Anshu, Badal, Rohit and Alok. It does not automatically gain Ayush or Himanshu access.
- Non-multiple and otherwise SuperAdmin-exclusive records remain excluded. Unified has no assignment, fulfillment, settings or Admin privileges.

## 5. Normal payment flow

1. Customer selects the quantity or a custom amount and enters the required checkout details.
2. The server validates the amount and product. Seed checkout currently has an $11 minimum and supports exact cents; a custom amount can be valid for payment even when it is ineligible for Admin.
3. Product prices and payment routes are determined by the server. Do not trust a lower client-supplied price for a book or ritual.
4. The server stores the checkout attempt with its amount, currency, product, collecting route, customer details and eligible source attribution.
5. PayPal approval/capture or Dodo provider verification confirms payment. The server verifies identifiers, amount, currency and stored checkout metadata.
6. A confirmed payment creates or reuses one payment record and its linked digital-service order. Repeated callbacks/webhooks must not create duplicates.
7. Portal APIs apply visibility independently of collection route, using the original order date and current exact-multiple policy.
8. Fulfillment is managed separately. Marking an order fulfilled does not create another payment. The fulfilled order can provide its proof PDF.

Weekly PayPal signup creates a subscription after customer approval. Recurring payment webhooks record each actual payment idempotently; approving a subscription alone is not proof that an installment was paid. Existing subscriptions must keep their original provider account and identifiers.

## 6. Failed payments and retries

- A failed or cancelled one-time PayPal seed checkout opens the seed-not-sown dialog with the saved checkout details and amount.
- Show a PayPal-supplied decline reason when available. Otherwise show exactly `THE PAYMENT FAILED`. Do not expose raw SDK diagnostics, debug IDs or private provider payloads as the reason.
- PayPal and eligible debit/credit card options appear below the verse. Card availability is determined by PayPal eligibility.
- A fresh retry/reload creates fresh SDK buttons under a new namespace and cleans up stale button instances. Old callbacks must not affect a newer attempt.
- Funding declines may use PayPal's supported restart flow to let the customer choose another funding source.
- If approval or capture confirmation is uncertain, check the **same existing order** before allowing another payment. Do not create a replacement charge merely because the network response was interrupted.
- Only the minimal pending-order recovery data belongs in browser session storage: order ID, amount and route. Do not persist customer contact details there.
- Once payment is verified, stop retries and display confirmation. Duplicate callbacks must not finalize or publish the payment twice.
- Weekly subscriptions and Dodo retain their separate confirmation/recovery flows.

## 7. Public data and security

- Public transaction feeds and payment comments may use only eligible standard-route/public-scope records under the dated limit and exact-multiple rule.
- Exclude SuperAdmin-exclusive data from all public aggregates and derived output, not just visible rows. Books/rituals retain their existing seed-feed exclusions.
- Preserve unrelated legacy stories that do not contain a payment amount; do not treat them as newly verified payments.
- Authenticate and authorize on the server. A role, source tag or UI button supplied by the browser does not grant access.
- Financial tables use row-level security; public/partner/Admin output is served through scoped functions. Service-role credentials remain private.
- Passwords belong in Supabase Auth, not source, migrations, screenshots or this guide. Partner usernames resolve on the server and must match the authenticated user's own profile.
- Email and username sign-in both go through `portal-login`, which authenticates with Supabase on the server and rechecks the account's current portal profile. The browser does not sign in directly through the public Auth gateway.
- Expiring sessions renew through that same server path using their refresh token. Concurrent portal requests share one renewal; an unauthorized protected request retries at most once after renewal. Failed/removed portal access still requires signing in again.
- Token renewal preserves a logical login identifier so a valid renewed response can load, while logout/account changes reject stale responses. A slow refresh must never overwrite a newer account's session. Temporary connectivity problems retain the existing refresh credentials for a later retry.
- Session recovery must not automatically replay PayPal/Dodo payment requests or uncertain captures.

## 8. Order preservation and restoration

- Never delete, overwrite, reroute, duplicate or silently change existing payment history without explicit owner authorization.
- Visibility changes must not rewrite amounts, order dates, collecting routes, provider IDs, subscription links, fulfillment details or ordinary stored tags.
- When the owner supplies proof for a deleted record, check the original receipt number, provider order ID and capture/transaction ID before inserting anything. Reuse matching existing records.
- Verify retained checkout metadata or the original provider payment where available. Restore only missing records, preserving known original details and documenting recovery provenance privately.
- Restore existing completed payments; do not recapture or charge a customer as part of database repair.
- Do not invent missing fulfillment or delivery details. Private restoration data and customer PDFs must not be committed to the source repository.
- The six owner-authorized November receipt records were restored/reused without duplicates and remain subject to the current amount rules.

## 9. Deployment and verification safeguards

- Do not open, probe or run checks against custom project URLs or payment links unless the owner explicitly authorizes a check for that specific URL. Treat the partner checkout paths above as routing configuration, not test targets.
- Leave protected pending migrations `202611100001` through `202611100003` unapplied. Their historical assignment updates are not authorized by routine deployment.
- Apply new additive guard migrations individually. The $11-multiple guard migration changes future-write guard functions only; it must not update existing payment rows.
- Deploy all functions that consume changed shared eligibility code, including order/partner/public reads, assignment, subscription views and source attribution.
- Validate exact cents, date boundaries, both collecting routes and both providers. Check that excluded amounts are absent from Admin/partners/public output and present in SuperAdmin.
- Verify that eligible restored history remains accessible, duplicate counts stay unchanged and existing payment data is preserved.
- Never create a live charge merely to test a UI or portal filter.

## 10. Main implementation references

- [Shared date, amount and partner eligibility](../supabase/functions/_shared/social-source.ts)
- [Admin/SuperAdmin order scope and assignment](../supabase/functions/admin-donations/index.ts)
- [Partner records](../supabase/functions/social-portal-transactions/index.ts)
- [Weekly subscription records](../supabase/functions/admin-subscriptions/index.ts)
- [Public bootstrap and comments](../supabase/functions/public-bootstrap/index.ts)
- [Public transaction feed](../supabase/functions/public-transactions/index.ts)
- [Frontend portal filtering and payment UI](../src/app.js)
- [One-time PayPal retry controller](../src/paypal-recovery.js)
- [Checkout path rewrites](../vercel.json)
- [Exact-multiple future-write guards](../supabase/migrations/202611180001_eleven_dollar_payment_visibility.sql)
