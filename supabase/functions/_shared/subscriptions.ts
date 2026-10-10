import {
  createDigitalOrderNumber,
  getPayPalSubscription,
} from "./paypal.ts";
import { getSupabaseAdmin } from "./supabase.ts";

const SUBSCRIPTION_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.REFUNDED",
  "PAYMENT.SALE.REVERSED",
]);

function getSubscriptionId(event: Record<string, any>) {
  const resource = event.resource || {};
  if (String(event.event_type || "").startsWith("BILLING.SUBSCRIPTION.")) {
    return String(resource.id || resource.billing_agreement_id || "").trim();
  }
  return String(
    resource.billing_agreement_id || resource.billing_agreement?.id || "",
  ).trim();
}

function getSaleAmount(resource: Record<string, any>) {
  return Number(resource.amount?.total ?? resource.amount?.value ?? 0);
}

function getSaleCurrency(resource: Record<string, any>, fallback: string) {
  return String(
    resource.amount?.currency ?? resource.amount?.currency_code ?? fallback,
  ).toUpperCase();
}

async function markProcessed(eventId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("membership_webhook_events").update({
    processed_at: new Date().toISOString(),
  }).eq("event_id", eventId);
  if (error) throw error;
}

async function refreshSubscriptionFromPayPal(
  membership: Record<string, any>,
  paymentRoute: "standard" | "superadmin",
  statusOverride?: string,
) {
  if (!membership.paypal_subscription_id) return;
  const supabase = getSupabaseAdmin();
  const subscription = await getPayPalSubscription(
    membership.paypal_subscription_id,
    paymentRoute,
  );
  const paypalStatus = String(subscription.status || "").toUpperCase();
  const status = statusOverride || (
    ["ACTIVE", "APPROVED"].includes(paypalStatus)
      ? "active"
      : paypalStatus === "CANCELLED"
      ? "cancelled"
      : paypalStatus === "SUSPENDED"
      ? "suspended"
      : paypalStatus === "EXPIRED"
      ? "expired"
      : "pending"
  );
  const lastFailure = subscription.billing_info?.last_failed_payment || {};
  const { error } = await supabase.from("memberships").update({
    status,
    paypal_payer_id: subscription.subscriber?.payer_id ||
      membership.paypal_payer_id || null,
    next_billing_at: status === "cancelled"
      ? null
      : subscription.billing_info?.next_billing_time ||
        membership.next_billing_at,
    next_retry_at: status === "past_due"
      ? lastFailure.next_payment_retry_time || membership.next_retry_at || null
      : null,
    last_failed_at: lastFailure.time || membership.last_failed_at || null,
    cancelled_at: status === "cancelled"
      ? subscription.status_update_time || new Date().toISOString()
      : membership.cancelled_at,
    raw_subscription: subscription,
  }).eq("id", membership.id);
  if (error) throw error;
}

async function createWeeklyOrder(
  membership: Record<string, any>,
  event: Record<string, any>,
) {
  const supabase = getSupabaseAdmin();
  const resource = event.resource || {};
  const transactionId = String(resource.id || "").trim();
  if (!transactionId) throw new Error("Subscription sale has no transaction id.");

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("membership_payments")
    .select("id, donation_id")
    .eq("paypal_transaction_id", transactionId)
    .maybeSingle();
  if (existingPaymentError) throw existingPaymentError;
  if (existingPayment) return;

  const amount = getSaleAmount(resource) || Number(membership.amount);
  const currency = getSaleCurrency(resource, membership.currency);
  const paidAt = resource.create_time || event.create_time ||
    new Date().toISOString();
  const { data: fortunes, error: fortuneError } = await supabase
    .from("fortunes")
    .select("id, message")
    .eq("active", true)
    .limit(200);
  if (fortuneError || !fortunes?.length) {
    throw fortuneError || new Error("No active fortune messages found.");
  }
  const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
  const { error: recordError } = await supabase.rpc(
    "record_weekly_subscription_payment",
    {
      p_membership_id: membership.id,
      p_transaction_id: transactionId,
      p_amount: amount,
      p_currency: currency,
      p_paid_at: paidAt,
      p_fortune_id: fortune.id,
      p_fortune_message: fortune.message,
      p_order_number: createDigitalOrderNumber(new Date(paidAt)),
      p_raw_payment: { subscriptionSale: event },
    },
  );
  if (recordError) throw recordError;
}

export function isSubscriptionWebhook(eventType: string) {
  return SUBSCRIPTION_EVENTS.has(eventType);
}

export async function handleSubscriptionWebhook(
  event: Record<string, any>,
  paymentRoute: "standard" | "superadmin",
) {
  const supabase = getSupabaseAdmin();
  const eventId = String(event.id || "").trim();
  const eventType = String(event.event_type || "").trim();
  const resource = event.resource || {};
  const subscriptionId = getSubscriptionId(event);
  if (!eventId || !subscriptionId) {
    throw new Error("Subscription webhook is missing its event or subscription id.");
  }

  const { data: priorEvent, error: priorError } = await supabase
    .from("membership_webhook_events")
    .select("event_id, processed_at")
    .eq("event_id", eventId)
    .maybeSingle();
  if (priorError) throw priorError;
  if (priorEvent?.processed_at) return { duplicate: true };
  if (!priorEvent) {
    const { error: eventError } = await supabase
      .from("membership_webhook_events")
      .insert({
        event_id: eventId,
        paypal_subscription_id: subscriptionId,
        event_type: eventType,
        payment_route: paymentRoute,
        payload: event,
      });
    if (eventError && eventError.code !== "23505") throw eventError;
  }

  const membershipFields =
    "id, checkout_token, customer_name, customer_email, customer_request, amount, currency, seed_count, payment_route, paypal_plan_id, paypal_subscription_id, paypal_payer_id, status, successful_payment_count, next_billing_at, next_retry_at, last_failed_at, cancelled_at";
  let membershipQuery = supabase.from("memberships").select(membershipFields);
  if (resource.custom_id) {
    membershipQuery = membershipQuery.or(
      `paypal_subscription_id.eq.${subscriptionId},checkout_token.eq.${resource.custom_id}`,
    );
  } else {
    membershipQuery = membershipQuery.eq("paypal_subscription_id", subscriptionId);
  }
  let { data: membership, error: membershipError } = await membershipQuery
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) {
    const providerSubscription = await getPayPalSubscription(
      subscriptionId,
      paymentRoute,
    );
    const checkoutToken = String(providerSubscription.custom_id || "").trim();
    if (checkoutToken) {
      const fallback = await supabase.from("memberships")
        .select(membershipFields)
        .eq("checkout_token", checkoutToken)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      membership = fallback.data;
      if (membership && providerSubscription.plan_id !== membership.paypal_plan_id) {
        throw new Error("Subscription webhook plan does not match its local checkout.");
      }
    }
  }
  if (!membership) throw new Error("Local subscription is not ready for this webhook.");
  if (membership.payment_route !== paymentRoute) {
    throw new Error("Subscription webhook route does not match its local owner.");
  }
  if (!membership.paypal_subscription_id) {
    const { error } = await supabase.from("memberships").update({
      paypal_subscription_id: subscriptionId,
    }).eq("id", membership.id);
    if (error) throw error;
    membership.paypal_subscription_id = subscriptionId;
  }

  if (eventType === "PAYMENT.SALE.COMPLETED") {
    await createWeeklyOrder(membership, event);
    await refreshSubscriptionFromPayPal(membership, paymentRoute, "active");
  } else if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
    await refreshSubscriptionFromPayPal(membership, paymentRoute, "past_due");
  } else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
    await refreshSubscriptionFromPayPal(membership, paymentRoute, "cancelled");
  } else if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED") {
    await refreshSubscriptionFromPayPal(membership, paymentRoute, "suspended");
  } else if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
    await refreshSubscriptionFromPayPal(membership, paymentRoute, "expired");
  } else if (["PAYMENT.SALE.REFUNDED", "PAYMENT.SALE.REVERSED"].includes(eventType)) {
    const saleId = String(resource.sale_id || resource.parent_payment || "").trim();
    if (saleId) {
      const status = eventType.endsWith("REFUNDED") ? "REFUNDED" : "REVERSED";
      const { data: payment, error: paymentError } = await supabase
        .from("membership_payments")
        .update({ status, raw_payment: event })
        .eq("paypal_transaction_id", saleId)
        .select("donation_id")
        .maybeSingle();
      if (paymentError) throw paymentError;
      if (payment?.donation_id) {
        const { error: donationError } = await supabase.from("donations")
          .update({ paypal_status: status })
          .eq("id", payment.donation_id);
        if (donationError) throw donationError;
      }
      const { error: summaryError } = await supabase.rpc(
        "refresh_membership_payment_summary",
        { target_membership_id: membership.id },
      );
      if (summaryError) throw summaryError;
    }
  } else {
    await refreshSubscriptionFromPayPal(membership, paymentRoute);
  }

  await markProcessed(eventId);
  return { duplicate: false };
}
