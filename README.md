# Sow Your Seed

A personalised digital-writing platform with Supabase backend support, dual-account PayPal Checkout, role-based admin controls, community blessing comments, order calendars, and fulfillment tracking.

## What Runs Locally

The page can still run as a static frontend:

```bash
npm run dev
```

Then open `http://127.0.0.1:5173`.

When `src/config.js` has `backendEnabled: false`, the app stays in local demo mode. When Supabase values are filled and `backendEnabled: true`, public data, site settings, orders, community blessing comments, and PayPal checkout are loaded through Supabase Edge Functions.

Both portals show the combined total of Admin- and SuperAdmin-route page visits from the last 24 hours. Every payment attempt and completed payment remains visible only in the portal for the checkout route that owns it. Each portal uses its own reset timestamp, so resetting one dashboard does not affect the other.

The payment column includes a Blessing Wall loaded from `seed_comments`. Initial comments are imported from legacy data, and completed public Admin-routed orders can add a new comment with the captured payment timestamp.

## Files

- `index.html` - static app entrypoint
- `src/app.js` - frontend state, Supabase calls, PayPal SDK wiring
- `src/styles.css` - responsive UI and modal styling
- `src/config.js` - local browser config, never store secrets here
- `.env.example` - server secret placeholders
- `supabase/migrations/*` - database, RLS, storage bucket, seed/order data
- `supabase/functions/*` - public, admin, PayPal, and engagement Edge Functions

## Required Setup

1. Copy `src/config.example.js` to `src/config.js` and fill:
   - `supabaseUrl`
   - `supabaseAnonKey`
   - `backendEnabled: true`

   PayPal client IDs are provided by the backend for the selected Admin or SuperAdmin route. Do not put PayPal client secrets in browser configuration.

2. Copy `.env.example` to `.env` for your local notes only. Do not commit real secrets.

3. Install tooling:

```bash
npm install
```

4. Link your Supabase project and push the migration:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

5. Add Supabase Auth users, then assign each account the required role:

```sql
insert into public.admin_profiles (user_id, email, role)
values ('YOUR_AUTH_USER_ID', 'you@example.com', 'admin')
on conflict (user_id) do update set email = excluded.email, role = excluded.role;

insert into public.admin_profiles (user_id, email, role)
values ('YOUR_SUPERADMIN_AUTH_USER_ID', 'superadmin@example.com', 'super_admin')
on conflict (user_id) do update set email = excluded.email, role = excluded.role;
```

6. Set Edge Function secrets:

```bash
npx supabase secrets set SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
npx supabase secrets set PAYPAL_ENV="sandbox"
npx supabase secrets set PAYPAL_CLIENT_ID="YOUR_SANDBOX_CLIENT_ID"
npx supabase secrets set PAYPAL_CLIENT_SECRET="YOUR_SANDBOX_CLIENT_SECRET"
npx supabase secrets set PAYPAL_WEBHOOK_ID="YOUR_SANDBOX_WEBHOOK_ID"
npx supabase secrets set SUPER_ADMIN_PAYPAL_CLIENT_ID="YOUR_SUPERADMIN_SANDBOX_CLIENT_ID"
npx supabase secrets set SUPER_ADMIN_PAYPAL_CLIENT_SECRET="YOUR_SUPERADMIN_SANDBOX_CLIENT_SECRET"
npx supabase secrets set SUPER_ADMIN_PAYPAL_WEBHOOK_ID="YOUR_SUPERADMIN_SANDBOX_WEBHOOK_ID"
npx supabase secrets set PAYPAL_CURRENCY="USD"
npx supabase secrets set SITE_ORIGIN="http://127.0.0.1:5173"
```

Use the deployed website origin for `SITE_ORIGIN` outside local development.

7. Deploy functions:

```bash
npm run supabase:deploy
```

## PayPal Notes

This app uses PayPal Orders for one-time payments. A separate blue card option appears only for one-time checkout and opens the separately hosted alternate checkout website inside a same-page popup. After it is used, it turns gray and is disabled for the rest of the page session.

The PayPal SDK is never preloaded. When a customer opens checkout, the app refreshes the server-selected payment route, removes any previous PayPal SDK instance, displays the rotating seed loader, and loads a new SDK instance. PayPal buttons remain hidden until each eligible button has rendered a visible iframe.

For your India-registered PayPal Business account, test with PayPal sandbox buyer accounts before switching to live credentials.

SuperAdmin chooses whether payments use the Admin or SuperAdmin PayPal account. The optional `$21 or more` override always routes qualifying payments to SuperAdmin. Admin uses `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID`; SuperAdmin uses the corresponding `SUPER_ADMIN_PAYPAL_*` secrets.

A valid email address is required at checkout so the order can be delivered. Display name and message remain optional. Checkout creates one-time payments; existing weekly subscriptions continue to be processed by the webhook.

Both PayPal apps must send `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`, `BILLING.SUBSCRIPTION.CREATED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.UPDATED`, `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.SUSPENDED`, and `BILLING.SUBSCRIPTION.PAYMENT.FAILED` to the deployed `paypal-webhook` URL. Keep the route-specific webhook IDs in the existing PayPal secrets.



Every completed PayPal capture also creates a linked digital-service order for `Personalised Digital Writing - Custom Order Made Writing`. The calendar for the collecting role shows the order ID, PayPal transaction ID, personalised-writing request, fulfillment status, and a proof PDF download for each payment.

## Verification

Run the local validation suite before deployment:

```bash
npm run check
```

Use PayPal sandbox first:

- Successful wallet capture creates one donation row and returns a fortune.
- Debit or credit card checkout redirects to the configured alternate checkout website.
- Cancelled checkout creates no donation.
- Duplicate capture/webhook updates do not create duplicate donations.
- Existing verified subscription sales continue to create exactly one linked seed order.
- Admin calendar can download a proof PDF for each digital-service order and mark orders fulfilled.
- Both analytics portals share the total page-visit count while keeping every payment attempt and completed payment private to its checkout owner. Each portal resets independently.
- Public Blessing Wall loads imported legacy comments and appends paid blessing requests after confirmed payment capture.
- Admin login requires Supabase Auth and `admin_profiles`; Admin and SuperAdmin see only the orders routed to their respective collection account.
- Donor comments require the same-browser donor token returned after a completed donation.

The progress card and its goal settings have been retired. Deploy the updated Edge Functions and apply `202610100001_remove_progress_feature.sql` to remove the old database settings, progress ledger, and routines. The migration preserves orders, payments, and subscription processing. Earlier migrations are retained as upgrade history.

The homepage shows a 21-book gallery grouped into Blue (10 Seeds per book), Red & peach (5 Seeds), and Grey (2 Seeds) series, in that order. Book purchasing is marked coming soon; no book payment gateway is connected. New book checkouts remain rejected; existing book orders retain their payment metadata, delivery controls, proof downloads, and payment recovery.

Posts are retired. Deploy the updated functions, remove the deployed `admin-posts` and `post-engagement` functions, and apply `202610100002_remove_posts.sql`. To delete previously uploaded post images through the Storage API, run `node scripts/remove-post-images.mjs` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set. This targets only the dedicated `post-images` bucket. Order/payment tables and the order-linked Blessing Wall remain intact.
