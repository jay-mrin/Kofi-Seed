import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { verifyDodoWebhook } from "../_shared/dodo.ts";
import { finalizeDodoPayment } from "../_shared/dodo-orders.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return errorResponse("Method not allowed.", 405);

  let rawBody = "";
  let event: Record<string, any> = {};
  let webhookId = "";
  try {
    rawBody = await request.text();
    ({ webhookId } = await verifyDodoWebhook(request.headers, rawBody));
    event = JSON.parse(rawBody);
  } catch (error) {
    return errorResponse("Dodo webhook rejected.", 401, String(error));
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: processed, error: processedError } = await supabase
      .from("dodo_webhook_events").select("webhook_id").eq("webhook_id", webhookId).maybeSingle();
    if (processedError) throw processedError;
    if (processed) return jsonResponse({ received: true, duplicate: true });

    const eventType = String(event.type || "");
    const paymentId = String(event.data?.payment_id || "").trim();
    if (eventType === "payment.succeeded" && paymentId) {
      await finalizeDodoPayment(paymentId);
    } else if (["payment.failed", "payment.cancelled"].includes(eventType)) {
      const sessionId = String(event.data?.checkout_session_id || "").trim();
      if (sessionId) {
        const { error: updateError } = await supabase.from("payment_attempts").update({
          status: "failed",
          dodo_payment_id: paymentId || null,
          failure_reason: eventType === "payment.cancelled" ? "DODO_PAYMENT_CANCELLED" : "DODO_PAYMENT_FAILED",
        }).eq("dodo_checkout_session_id", sessionId).neq("status", "confirmed");
        if (updateError) throw updateError;
      }
    }

    const { error: eventError } = await supabase.from("dodo_webhook_events").insert({
      webhook_id: webhookId,
      event_type: eventType || "unknown",
      dodo_payment_id: paymentId || null,
    });
    if (eventError?.code !== "23505") {
      if (eventError) throw eventError;
    }
    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Could not persist verified Dodo webhook.", error);
    return errorResponse("Verified Dodo webhook could not be persisted.", 500);
  }
});
