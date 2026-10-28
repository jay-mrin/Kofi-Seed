import {
  withCors,
  errorResponse,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/http.ts";
import { cancelPayPalSubscription } from "../_shared/paypal.ts";
import { requireAdmin } from "../_shared/supabase.ts";

type CancelBody = {
  membershipId?: string;
  reason?: string;
};

function mapPayment(value: Record<string, any>) {
  return {
    id: value.id,
    transactionId: value.paypal_transaction_id,
    amount: Number(value.amount),
    currency: value.currency,
    status: value.status,
    kind: value.payment_kind,
    paidAt: value.paid_at,
    periodStart: value.billing_period_start,
    periodEnd: value.billing_period_end,
  };
}

function mapMembership(value: Record<string, any>) {
  return {
    id: value.id,
    name: value.customer_name,
    email: value.customer_email,
    amount: Number(value.amount),
    currency: value.currency,
    seedCount: value.seed_count,
    paymentRoute: value.payment_route,
    paypalSubscriptionId: value.paypal_subscription_id,
    status: value.status,
    optedInAt: value.opted_in_at,
    billingAnchorAt: value.billing_anchor_at,
    nextBillingAt: value.next_billing_at,
    nextRetryAt: value.next_retry_at,
    lastFailedAt: value.last_failed_at,
    lastSuccessfulPaymentAt: value.last_successful_payment_at,
    successfulPaymentCount: value.successful_payment_count,
    cancelledAt: value.cancelled_at,
    payments: (value.membership_payments || []).map(mapPayment),
  };
}

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { supabase, adminProfile } = await requireAdmin(request, {
      allowedRoles: ["admin", "super_admin"],
    });
    const paymentRoute = adminProfile.role === "super_admin"
      ? "superadmin"
      : "standard";

    if (request.method === "GET") {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, customer_name, customer_email, amount, currency, seed_count, payment_route, paypal_subscription_id, status, opted_in_at, billing_anchor_at, next_billing_at, next_retry_at, last_failed_at, last_successful_payment_at, successful_payment_count, cancelled_at, membership_payments(id, paypal_transaction_id, amount, currency, status, payment_kind, paid_at, billing_period_start, billing_period_end)")
        .eq("payment_route", paymentRoute)
        .eq("frequency", "weekly")
        .not("paypal_subscription_id", "is", null)
        .order("paid_at", { foreignTable: "membership_payments", ascending: false })
        .order("opted_in_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      return jsonResponse({
        paymentRoute,
        subscriptions: (data || []).map(mapMembership),
      });
    }

    if (request.method !== "POST") {
      return errorResponse("Method not allowed.", 405);
    }

    const body = await readJson<CancelBody>(request);
    const membershipId = String(body.membershipId || "").trim();
    const reason = String(body.reason || "Cancelled from Sowing Seed portal").trim().slice(0, 128) ||
      "Cancelled from Sowing Seed portal";
    if (!membershipId) return errorResponse("Subscription id is required.", 422);

    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("id, paypal_subscription_id, status, payment_route")
      .eq("id", membershipId)
      .eq("payment_route", paymentRoute)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return errorResponse("Subscription not found.", 404);
    if (["cancelled", "expired"].includes(membership.status)) {
      return jsonResponse({ success: true, alreadyCancelled: true });
    }
    if (!membership.paypal_subscription_id) {
      return errorResponse("This subscription has not been approved by PayPal.", 409);
    }

    await cancelPayPalSubscription(
      membership.paypal_subscription_id,
      paymentRoute,
      reason,
    );
    const cancelledAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("memberships")
      .update({ status: "cancelled", cancelled_at: cancelledAt, next_billing_at: null, next_retry_at: null })
      .eq("id", membership.id)
      .eq("payment_route", paymentRoute);
    if (updateError) throw updateError;

    return jsonResponse({ success: true, membershipId, cancelledAt });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not manage weekly subscriptions.", 500, String(error));
  }
}));
