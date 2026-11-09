# Sow Your Seed

A personalised digital-writing platform with Supabase backend support, Admin PayPal Business checkout, separate SuperAdmin PayPal checkout, role-based controls, community blessing comments, order calendars, and fulfillment tracking.

## What Runs Locally

The page can still run as a static frontend:

```bash
npm run dev
```

Then open `http://127.0.0.1:5173`.

When `src/config.js` has `backendEnabled: false`, the app stays in local demo mode. When Supabase values are filled and `backendEnabled: true`, public data, site settings, orders, community blessing comments, and PayPal checkout are loaded through Supabase Edge Functions. Dodo confirmation remains available for pending or historical payments.

Admin and SuperAdmin retain separate calendars and payment records. Historical Admin Dodo and PayPal orders remain visible alongside new Admin PayPal Business orders. SuperAdmin payments continue using their separate PayPal account and private calendar. Admin and SuperAdmin each use their own analytics reset timestamp. The database value `payment_route = 'standard'` still identifies Admin orders.

## Portal Sign-In

Open `https://www.seedgarden.space/#admin` and sign in with the email address and password for an existing portal account. The server checks the account role before opening its portal.

The payment column includes a Blessing Wall loaded from `seed_comments`. Initial comments and completed public Admin-routed orders from the earlier checkout remain in the historical data.

## Files

- `index.html` - static app entrypoint
- `src/app.js` - frontend state, Supabase calls, PayPal SDK wiring, and Dodo return handling
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

   Public bootstrap provides the browser-safe PayPal client IDs for the selected checkout and the SuperAdmin account used for orders of $55 or more. PayPal client secrets stay on the server.

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
npx supabase secrets set DODO_PAYMENTS_ENV="test_mode"
npx supabase secrets set DODO_PAYMENTS_CURRENCY="USD"
npx supabase secrets set DODO_PAYMENTS_API_KEY="YOUR_DODO_TEST_API_KEY"
npx supabase secrets set DODO_PAYMENTS_PRODUCT_ID="YOUR_DODO_PRODUCT_ID"
npx supabase secrets set DODO_PAYMENTS_WEBHOOK_KEY="YOUR_DODO_WEBHOOK_SECRET"
npx supabase secrets set DODO_RETURN_URL="https://YOUR_PUBLIC_SITE/"
npx supabase secrets set PAYPAL_ENV="sandbox"
npx supabase secrets set ADMIN_PAYPAL_ENV="live"
npx supabase secrets set PAYPAL_CLIENT_ID="YOUR_ADMIN_PAYPAL_CLIENT_ID"
npx supabase secrets set PAYPAL_CLIENT_SECRET="YOUR_ADMIN_PAYPAL_CLIENT_SECRET"
npx supabase secrets set PAYPAL_WEBHOOK_ID="YOUR_ADMIN_PAYPAL_WEBHOOK_ID"
npx supabase secrets set SUPER_ADMIN_PAYPAL_CLIENT_ID="YOUR_SUPERADMIN_SANDBOX_CLIENT_ID"
npx supabase secrets set SUPER_ADMIN_PAYPAL_CLIENT_SECRET="YOUR_SUPERADMIN_SANDBOX_CLIENT_SECRET"
npx supabase secrets set SUPER_ADMIN_PAYPAL_WEBHOOK_ID="YOUR_SUPERADMIN_SANDBOX_WEBHOOK_ID"
npx supabase secrets set PAYPAL_CURRENCY="USD"
npx supabase secrets set SITE_ORIGIN="http://127.0.0.1:5173"
```

Use the deployed website origin for `SITE_ORIGIN` outside local development.

In Dodo Payments, create a one-time USD product, enable **Pay What You Want**, and set its minimum to $7. Configure the deployed `dodo-webhook` URL for `payment.succeeded`, `payment.failed`, and `payment.cancelled` events. Dodo checkout sessions and verified orders are always scoped to the Admin portal.

7. Deploy functions:

```bash
npm run supabase:deploy
```

## PayPal Notes

This app uses PayPal Orders for one-time payments. A separate blue card option appears only for one-time checkout and opens the separately hosted alternate checkout website inside a same-page popup. After it is used, it turns gray and is disabled for the rest of the page session.

The PayPal SDK is never preloaded. When a customer opens checkout, the app loads the PayPal SDK for the checkout route and displays the rotating seed loader. PayPal buttons remain hidden until each eligible button has rendered a visible iframe.

For your India-registered PayPal Business account, test with PayPal sandbox buyer accounts before switching to live credentials.

New Admin checkout uses `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID`. Set `ADMIN_PAYPAL_ENV` to `live` or `sandbox` for that account; this setting does not change the SuperAdmin environment. Admin PayPal orders are recorded in the Admin calendar and linked digital-order workflow. SuperAdmin checkouts continue using `SUPER_ADMIN_PAYPAL_*` credentials and the SuperAdmin calendar.

## Social source portals

Share `https://www.seedgarden.space/sowseed` for Anshu's account and `https://www.seedgarden.space/seed` for Badal's account. For amounts below $55, Home and both shared links use the SuperAdmin Checkout display choice. The Custom Credit Debit selection shows the custom card checkout to detected US visitors for these lower amounts. Custom card checkout does not create an order in this site's backend; PayPal checkout does. Only PayPal checkout below $55 started on a tagged path is automatically attributed to Anshu or Badal. Checkout on the normal site path `/` has no automatic social tag, even after a visitor previously opened a tagged path.

New one-time checkouts and weekly subscription signups of **$55 or more, including exactly $55**, always use **SuperAdmin PayPal**, overriding Admin PayPal and Custom Credit Debit selections. They appear in SuperAdmin with **Manual review required** and remain absent from both social portals until manually assigned using Anshu or Badal. Each new recurring charge of $55 or more also requires its own assignment. Existing assigned orders keep their portal, including orders of $55 or more; previous payment routes and subscription accounts are preserved. This feature never deletes orders automatically.

Apply `202611100001_high_value_social_review.sql` before deploying the updated functions and frontend. The migration preserves existing source tags and marks current $55+ assignments as retained; it adds an insert guard for future high-value orders. Deploy `public-bootstrap`, `create-paypal-order`, `prepare-paypal-subscription`, `create-dodo-checkout`, `admin-donations`, and `social-portal-transactions` with this frontend. Legacy Dodo checkout creation rejects new $55+ checkouts; confirmation of existing Dodo payments remains available.

AnshuPortal and Badal Portal use the same calendar layout. Each account sees only its own tagged PayPal orders from 4 November 2026 at 00:00 Asia/Kolkata onward, with name, amount, email, and order date. Both Admin (`standard`) and SuperAdmin PayPal routes are included under the user-authorized exception in `doc.work/Strictinstructions.md`. Existing Admin and SuperAdmin order records and visibility remain unchanged.

Apply `202611040002_retire_standard_portal.sql` before deploying this frontend. It removes old Standard Portal profile access and its preview setting without changing orders. Remove any previously deployed `standard-transactions` Edge Function from Supabase; removing its source from this repository does not undeploy it.

After applying `202611040001_social_source_portals.sql` and deploying the functions, create the two email/password users in Supabase Auth using the credentials supplied privately by the owner. Confirm their email addresses in Auth. Do not put their passwords in this repository. Then run the following SQL in the Supabase SQL editor to attach the two Auth users to their scoped portals:

```sql
do $$
begin
  if (select count(*) from auth.users where lower(email) in ('anshu@gmail.com', 'badal@gmail.com')) <> 2 then
    raise exception 'Both social portal Auth users must exist first';
  end if;
  if exists (
    select 1 from public.admin_profiles p
    join auth.users u on u.id = p.user_id
    where lower(u.email) in ('anshu@gmail.com', 'badal@gmail.com')
  ) then
    raise exception 'Social portal users must not have admin profiles';
  end if;
  insert into public.social_portal_profiles (user_id, email, display_name, social_source)
  select id, lower(email),
    case lower(email) when 'anshu@gmail.com' then 'AnshuPortal' else 'Badal Portal' end,
    case lower(email) when 'anshu@gmail.com' then 'anshu' else 'badal' end
  from auth.users
  where lower(email) in ('anshu@gmail.com', 'badal@gmail.com')
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    social_source = excluded.social_source;
end;
$$;
```

The SuperAdmin portal's **Checkout display** control selects SuperAdmin PayPal, Admin PayPal, or Custom Credit Debit for Home and both shared links. Under Custom Credit Debit, US visitors see only the custom card checkout and no weekly subscription choice; other visitors see the normal SuperAdmin PayPal and eligible PayPal card buttons. The checkout inside the SuperAdmin portal always uses the SuperAdmin account. Existing Dodo orders and pending Dodo confirmations remain intact.

A name and a valid email address are required at checkout so the order can be delivered. Admin PayPal checkout creates one-time payments. SuperAdmin PayPal checkout also offers a weekly subscription toggle. An amount of at least $11 is required; custom amounts such as $11.99 are accepted. PayPal charges the selected amount at sign-up as the setup fee, then schedules recurring charges every Monday at 7:30 AM India time (02:00 UTC), starting on the next occurrence. PayPal and eligible debit or credit card buttons are offered for subscriptions. When the toggle is off, checkout creates a one-time payment. The subscription webhook records each completed PayPal charge as a linked order.

Configure the Admin PayPal Business webhook with the deployed `paypal-webhook` URL and save its Webhook ID as `PAYPAL_WEBHOOK_ID`. The endpoint supports capture events and subscription events; the screenshot's **All Events** setting is supported. Keep the separate SuperAdmin webhook ID in `SUPER_ADMIN_PAYPAL_WEBHOOK_ID`.

The custom card checkout is shown only for detected US visitors when Custom Credit Debit is selected. The Vercel function at `/api/visitor-country` reads Vercel's `x-vercel-ip-country` header and returns a country code with caching disabled. All other countries, failed lookups, and local static development default to the normal PayPal options. The weekly subscription choice is hidden for US visitors under Custom Credit Debit; other visitors retain the configured weekly option. No country override is accepted from URL parameters or browser language settings.


Every completed Dodo or PayPal payment creates a linked digital-service order for `Personalised Digital Writing - Custom Order Made Writing`. The collecting portal shows the provider transaction ID, personalised-writing request, fulfillment status, and a proof PDF download.

## Verification

Run the local validation suite before deployment:

```bash
npm run check
```

Use Dodo test mode and PayPal sandbox first:

- Successful Dodo payment creates one Admin order and returns a fortune.
- Successful PayPal capture creates one SuperAdmin order and returns a fortune.
- Debit or credit card checkout redirects to the configured alternate checkout website.
- Cancelled checkout creates no donation.
- Duplicate Dodo or PayPal confirmation/webhook deliveries do not create duplicate orders.
- Existing verified subscription sales continue to create exactly one linked seed order.
- Admin calendar can download a proof PDF for each digital-service order and mark orders fulfilled.
- Both analytics portals share the total page-visit count while keeping every payment attempt and completed payment private to its checkout owner. Each portal resets independently.
- Public Blessing Wall loads imported legacy comments and appends paid blessing requests after confirmed payment capture.
- Admin login requires Supabase Auth and `admin_profiles`; Admin and SuperAdmin see only the orders routed to their respective collection account.
- Donor comments require the same-browser donor token returned after a completed donation.

The progress card and its goal settings have been retired. Deploy the updated Edge Functions and apply `202610100001_remove_progress_feature.sql` to remove the old database settings, progress ledger, and routines. The migration preserves orders, payments, and subscription processing. Earlier migrations are retained as upgrade history.

The homepage shows a 21-book gallery grouped into Blue (10 Seeds per book), Red & peach (5 Seeds), and Grey (2 Seeds) series, in that order. Book purchasing is marked coming soon; no book payment gateway is connected. New book checkouts remain rejected; existing book orders retain their payment metadata, delivery controls, proof downloads, and payment recovery.

Posts are retired. Deploy the updated functions, remove the deployed `admin-posts` and `post-engagement` functions, and apply `202610100002_remove_posts.sql`. To delete previously uploaded post images through the Storage API, run `node scripts/remove-post-images.mjs` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set. This targets only the dedicated `post-images` bucket. Order/payment tables and the order-linked Blessing Wall remain intact.
