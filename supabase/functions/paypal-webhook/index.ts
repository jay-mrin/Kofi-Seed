import { withCors, errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { verifyPayPalWebhook } from "../_shared/paypal.ts";
import {
  handleSubscriptionWebhook,
  isSubscriptionWebhook,
} from "../_shared/subscriptions.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405);
  }

  let event: Record<string, any>;
  let verification: Record<string, any>;

  try {
    const rawBody = await request.text();
    verification = await verifyPayPalWebhook(request.headers, rawBody);
    event = JSON.parse(rawBody);
  } catch (error) {
    return errorResponse("PayPal webhook rejected.", 400, String(error));
  }

  try {
    const eventType = String(event.event_type || "");
    const hasSubscriptionReference = eventType.startsWith("BILLING.SUBSCRIPTION.") ||
      Boolean(event.resource?.billing_agreement_id || event.resource?.billing_agreement?.id);
    if (isSubscriptionWebhook(eventType) && hasSubscriptionReference) {
      const paymentRoute = verification.paymentRoute === "superadmin"
        ? "superadmin"
        : "standard";
      const result = await handleSubscriptionWebhook(event, paymentRoute);
      return jsonResponse({ received: true, subscription: true, ...result });
    }
    if (!eventType.startsWith("PAYMENT.CAPTURE.")) {
      return jsonResponse({ received: true, ignored: true });
    }

    const resource = event.resource || {};
    const captureId = resource.id;
    const status = resource.status;

    if (!captureId || !status) {
      return errorResponse(
        "PayPal capture event is missing its capture id or status.",
        422,
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: existingDonation, error: existingError } = await supabase
      .from("donations")
      .select("id, payment_route, raw_payment")
      .eq("paypal_capture_id", captureId)
      .maybeSingle();
    if (existingError) throw existingError;

    const verifiedRoute = verification.paymentRoute === "superadmin"
      ? "superadmin"
      : "standard";
    let existing = existingDonation;

    if (!existing && eventType !== "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = String(
        resource.supplementary_data?.related_ids?.order_id || "",
      ).trim();
      if (!orderId) {
        return jsonResponse({ received: true, ignored: true });
      }

      const { data: paymentAttempt, error: attemptError } = await supabase
        .from("payment_attempts")
        .select("id, payment_route, status, failure_reason, raw_payment")
        .eq("paypal_order_id", orderId)
        .maybeSingle();
      if (attemptError) throw attemptError;
      if (!paymentAttempt) {
        return jsonResponse({ received: true, ignored: true });
      }

      const attemptRoute = paymentAttempt.payment_route === "superadmin"
        ? "superadmin"
        : "standard";
      if (attemptRoute !== verifiedRoute) {
        return errorResponse(
          "PayPal webhook route does not match the checkout attempt route.",
          409,
        );
      }

      if (paymentAttempt.status !== "confirmed") {
        const previousRawPayment =
          paymentAttempt.raw_payment &&
            typeof paymentAttempt.raw_payment === "object" &&
            !Array.isArray(paymentAttempt.raw_payment)
            ? paymentAttempt.raw_payment
            : {};
        const normalizedStatus = String(status).toUpperCase();
        const isRetryableFailure = ["DECLINED", "DENIED", "FAILED"].includes(
          normalizedStatus,
        );
        const failureReason = isRetryableFailure
          ? paymentAttempt.failure_reason || `PAYMENT_CAPTURE_${normalizedStatus}`
          : null;
        const { error: updateAttemptError } = await supabase
          .from("payment_attempts")
          .update({
            status: "started",
            ...(failureReason ? { failure_reason: failureReason } : {}),
            raw_payment: {
              ...previousRawPayment,
              lastCaptureWebhook: event,
              webhookRoute: verification.paymentRoute || "standard",
            },
          })
          .eq("id", paymentAttempt.id)
          .neq("status", "confirmed");
        if (updateAttemptError) throw updateAttemptError;
      }

      return jsonResponse({
        received: true,
        retryable: ["DECLINED", "DENIED", "FAILED"].includes(
          String(status).toUpperCase(),
        ),
      });
    }

    if (!existing && eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = String(
        resource.supplementary_data?.related_ids?.order_id || "",
      ).trim();
      if (!orderId) {
        return errorResponse(
          "PayPal capture is missing its related order id.",
          503,
        );
      }

      const { data: paymentAttempt, error: attemptError } = await supabase
        .from("payment_attempts")
        .select("id, payment_route")
        .eq("paypal_order_id", orderId)
        .maybeSingle();
      if (attemptError) throw attemptError;
      if (!paymentAttempt) {
        return errorResponse("PayPal checkout attempt is not ready.", 503);
      }

      const attemptRoute = paymentAttempt.payment_route === "superadmin"
        ? "superadmin"
        : "standard";
      if (attemptRoute !== verifiedRoute) {
        return errorResponse(
          "PayPal webhook route does not match the checkout attempt route.",
          409,
        );
      }

      const { error: recoveryError } = await supabase.functions.invoke(
        "capture-paypal-order",
        {
          body: { orderId },
        },
      );
      if (recoveryError) throw recoveryError;

      const { data: recoveredDonation, error: recoveredError } = await supabase
        .from("donations")
        .select("id, payment_route, raw_payment")
        .eq("paypal_capture_id", captureId)
        .maybeSingle();
      if (recoveredError) throw recoveredError;
      existing = recoveredDonation;
    }

    if (!existing) {
      return errorResponse("PayPal capture record is not ready.", 503);
    }

    const storedRoute = existing.payment_route === "superadmin"
      ? "superadmin"
      : "standard";
    if (storedRoute !== verifiedRoute) {
      return errorResponse(
        "PayPal webhook route does not match the stored payment route.",
        409,
      );
    }

    const existingRawPayment =
      existing?.raw_payment && typeof existing.raw_payment === "object" &&
        !Array.isArray(existing.raw_payment)
        ? existing.raw_payment
        : {};

    const { data: updated, error: updateError } = await supabase
      .from("donations")
      .update({
        paypal_status: status,
        raw_payment: {
          ...existingRawPayment,
          webhook: event,
          webhookRoute: verification.paymentRoute || "standard",
        },
      })
      .eq("id", existing.id)
      .eq("payment_route", storedRoute)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return errorResponse("PayPal capture record could not be updated.", 503);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Could not persist verified PayPal webhook.", error);
    return errorResponse(
      "Verified PayPal webhook could not be persisted.",
      500,
    );
  }
}));
