import {
  errorResponse,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/http.ts";
import { getPayPalSubscription } from "../_shared/paypal.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

type ConfirmBody = {
  checkoutToken?: string;
  subscriptionId?: string;
};

function mapStatus(value: unknown) {
  const status = String(value || "").toUpperCase();
  if (["ACTIVE", "APPROVED"].includes(status)) return "active";
  if (status === "CANCELLED") return "cancelled";
  if (status === "SUSPENDED") return "suspended";
  if (status === "EXPIRED") return "expired";
  return "pending";
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== "POST") {
      return errorResponse("Method not allowed.", 405);
    }

    const body = await readJson<ConfirmBody>(request);
    const checkoutToken = String(body.checkoutToken || "").trim();
    const subscriptionId = String(body.subscriptionId || "").trim();
    if (!checkoutToken || !subscriptionId) {
      return errorResponse("Subscription confirmation details are missing.", 422);
    }

    const supabase = getSupabaseAdmin();
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("id, checkout_token, customer_name, customer_email, amount, currency, payment_route, paypal_plan_id, paypal_subscription_id, payment_attempt_id, next_billing_at")
      .eq("checkout_token", checkoutToken)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return errorResponse("Weekly checkout was not found.", 404);
    if (
      membership.paypal_subscription_id &&
      membership.paypal_subscription_id !== subscriptionId
    ) {
      return errorResponse("This weekly checkout is already linked to another subscription.", 409);
    }

    const paymentRoute = membership.payment_route === "superadmin"
      ? "superadmin"
      : "standard";
    const subscription = await getPayPalSubscription(subscriptionId, paymentRoute);
    if (subscription.plan_id !== membership.paypal_plan_id) {
      return errorResponse("PayPal returned a different weekly plan.", 409);
    }
    if (subscription.custom_id !== checkoutToken) {
      return errorResponse("PayPal returned a different checkout reference.", 409);
    }

    const status = mapStatus(subscription.status);
    if (["cancelled", "suspended", "expired"].includes(status)) {
      return errorResponse("PayPal did not activate this weekly subscription.", 409);
    }
    const nextBillingAt = subscription.billing_info?.next_billing_time ||
      membership.next_billing_at;
    const cancelledAt = status === "cancelled"
      ? subscription.status_update_time || new Date().toISOString()
      : null;
    const { data: updated, error: updateError } = await supabase
      .from("memberships")
      .update({
        paypal_subscription_id: subscriptionId,
        paypal_payer_id: subscription.subscriber?.payer_id || null,
        status,
        next_billing_at: nextBillingAt,
        cancelled_at: cancelledAt,
        raw_subscription: subscription,
      })
      .eq("id", membership.id)
      .select("id, customer_name, customer_email, amount, currency, status, next_billing_at, paypal_subscription_id")
      .single();
    if (updateError) throw updateError;

    if (membership.payment_attempt_id) {
      const { error: attemptError } = await supabase
        .from("payment_attempts")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          failure_reason: null,
          raw_payment: { subscription },
        })
        .eq("id", membership.payment_attempt_id);
      if (attemptError) throw attemptError;
    }

    return jsonResponse({
      paymentRoute,
      subscription: {
        id: updated.id,
        paypalSubscriptionId: updated.paypal_subscription_id,
        name: updated.customer_name,
        email: updated.customer_email,
        amount: Number(updated.amount),
        currency: updated.currency,
        status: updated.status,
        nextBillingAt: updated.next_billing_at,
      },
    });
  } catch (error) {
    return errorResponse("Could not confirm the weekly PayPal subscription.", 500, String(error));
  }
});
