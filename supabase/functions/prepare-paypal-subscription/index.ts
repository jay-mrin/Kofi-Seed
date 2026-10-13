import {
  errorResponse,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/http.ts";
import { getRandomOrderRequest } from "../_shared/order-requests.ts";
import {
  centsToMoney,
  createPayPalSubscriptionProduct,
  createPayPalWeeklyPlan,
  getPayPalCurrency,
  parseMoneyToCents,
} from "../_shared/paypal.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

type PrepareBody = {
  amount?: number;
  seedCount?: number;
  name?: string;
  email?: string;
  message?: string;
  paymentRoute?: string;
};

const MIN_AMOUNT_CENTS = 700;
const IST_OFFSET_MINUTES = 330;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getNextMondayBillingAt(now = new Date()) {
  const istClock = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  const istDay = istClock.getUTCDay();
  const daysUntilMonday = istDay === 1 ? 7 : (8 - istDay) % 7;
  return new Date(Date.UTC(
    istClock.getUTCFullYear(),
    istClock.getUTCMonth(),
    istClock.getUTCDate() + daysUntilMonday,
    12,
    30,
    0,
  ));
}

async function ensureWeeklyPlan(
  paymentRoute: "standard" | "superadmin",
  amountCents: number,
) {
  const supabase = getSupabaseAdmin();
  const amount = centsToMoney(amountCents);
  const currency = getPayPalCurrency();
  const { data: existing, error: existingError } = await supabase
    .from("membership_plans")
    .select("id, paypal_product_id, paypal_plan_id")
    .eq("payment_route", paymentRoute)
    .eq("currency", currency)
    .eq("amount", amount)
    .eq("interval_unit", "WEEK")
    .eq("interval_count", 1)
    .eq("setup_fee_amount", amount)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: routePlan, error: routePlanError } = await supabase
    .from("membership_plans")
    .select("paypal_product_id")
    .eq("payment_route", paymentRoute)
    .eq("currency", currency)
    .limit(1)
    .maybeSingle();
  if (routePlanError) throw routePlanError;

  const productId = routePlan?.paypal_product_id ||
    (await createPayPalSubscriptionProduct({ paymentRoute })).id;
  const paypalPlan = await createPayPalWeeklyPlan({
    amountCents,
    paymentRoute,
    productId,
  });

  const { data: created, error: createError } = await supabase
    .from("membership_plans")
    .insert({
      payment_route: paymentRoute,
      currency,
      amount,
      paypal_product_id: productId,
      paypal_plan_id: paypalPlan.id,
      interval_unit: "WEEK",
      interval_count: 1,
      setup_fee_amount: amount,
    })
    .select("id, paypal_product_id, paypal_plan_id")
    .single();
  if (createError) {
    const { data: raced, error: racedError } = await supabase
      .from("membership_plans")
      .select("id, paypal_product_id, paypal_plan_id")
      .eq("payment_route", paymentRoute)
      .eq("currency", currency)
      .eq("amount", amount)
      .eq("interval_unit", "WEEK")
      .eq("interval_count", 1)
      .eq("setup_fee_amount", amount)
      .maybeSingle();
    if (racedError || !raced) throw createError;
    return raced;
  }

  return created;
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== "POST") {
      return errorResponse("Method not allowed.", 405);
    }

    const body = await readJson<PrepareBody>(request);
    const amountCents = parseMoneyToCents(body.amount);
    const seedCount = Number(body.seedCount);
    const name = String(body.name || "").trim().slice(0, 80);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
    const customerMessage = String(body.message || "").trim().slice(0, 180);

    if (!name) return errorResponse("Name is required for weekly sowing.", 422);
    if (!isValidEmail(email)) return errorResponse("A valid email is required.", 422);
    if (amountCents < MIN_AMOUNT_CENTS || !Number.isInteger(seedCount) || seedCount < 1) {
      return errorResponse("Choose at least one whole seed.", 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: settingsRow, error: settingsError } = await supabase
      .from("site_settings")
      .select("settings")
      .eq("id", true)
      .maybeSingle();
    if (settingsError) throw settingsError;
    const settings = settingsRow?.settings && typeof settingsRow.settings === "object"
      ? settingsRow.settings as Record<string, unknown>
      : {};
    const seedPriceCents = Math.round(Math.max(Number(settings.seedPrice) || 7, 1) * 100);
    if (amountCents !== seedCount * seedPriceCents) {
      return errorResponse("Weekly sowing requires a whole seed count at the current seed price.", 422);
    }

    const paymentRoute = "superadmin";
    if (body.paymentRoute !== paymentRoute) {
      return errorResponse(
        "Please reopen the SuperAdmin PayPal checkout and choose Weekly again.",
        409,
      );
    }

    const plan = await ensureWeeklyPlan(paymentRoute, amountCents);
    const billingAnchor = getNextMondayBillingAt();
    const supporterMessage = getRandomOrderRequest();
    const personalizedRequest = customerMessage || supporterMessage;

    const { data: attempt, error: attemptError } = await supabase
      .from("payment_attempts")
      .insert({
        display_name: name,
        contact_email: email,
        amount: centsToMoney(amountCents),
        currency: getPayPalCurrency(),
        customer_request: personalizedRequest,
        supporter_message: supporterMessage,
        frequency: "weekly",
        product_type: "personalized_seed_writing_subscription",
        product_id: plan.paypal_plan_id,
        payment_route: paymentRoute,
        status: "started",
        raw_payment: { billingAnchor: billingAnchor.toISOString() },
      })
      .select("id")
      .single();
    if (attemptError) throw attemptError;

    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .insert({
        customer_name: name,
        customer_email: email,
        amount: centsToMoney(amountCents),
        currency: getPayPalCurrency(),
        payment_route: paymentRoute,
        paypal_plan_id: plan.paypal_plan_id,
        status: "pending",
        frequency: "weekly",
        seed_count: seedCount,
        billing_anchor_at: billingAnchor.toISOString(),
        next_billing_at: billingAnchor.toISOString(),
        payment_attempt_id: attempt.id,
        customer_request: personalizedRequest,
        personalized_request: personalizedRequest,
      })
      .select("id, checkout_token")
      .single();
    if (membershipError) throw membershipError;

    return jsonResponse({
      checkoutToken: membership.checkout_token,
      membershipId: membership.id,
      planId: plan.paypal_plan_id,
      paymentRoute,
      startTime: billingAnchor.toISOString(),
    });
  } catch (error) {
    return errorResponse("Could not prepare the weekly PayPal subscription.", 500, String(error));
  }
});
