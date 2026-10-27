import { errorResponse, handleOptions, jsonResponse, readJson } from "../_shared/http.ts";
import { createDodoCheckoutSession, getDodoCurrency, getDodoProductId } from "../_shared/dodo.ts";
import { getRandomOrderRequest } from "../_shared/order-requests.ts";
import { getRitual } from "../_shared/rituals.ts";
import { getSupabaseAdmin, hashText } from "../_shared/supabase.ts";

type CreateDodoBody = {
  seedCount?: number;
  ritualTier?: string;
  name?: string;
  message?: string;
  email?: string;
  donorAccessToken?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return errorResponse("Method not allowed.", 405);

  const supabase = getSupabaseAdmin();
  let attemptId = "";
  try {
    const body = await readJson<CreateDodoBody>(request);
    const seedCount = Number(body.seedCount);
    const ritualTier = String(body.ritualTier || "").trim();
    const ritual = ritualTier ? getRitual(ritualTier) : null;
    const email = String(body.email || "").trim().slice(0, 160);
    const name = String(body.name || "").trim().slice(0, 80);
    const message = String(body.message || "").trim().slice(0, 180);
    const donorAccessToken = String(body.donorAccessToken || "").trim();
    if (ritualTier && !ritual) return errorResponse("Choose a valid ritual.", 422);
    if (!name) return errorResponse("Enter your name.", 422);
    if (ritual && !message) return errorResponse("Enter who this ritual is for.", 422);
    if (!ritual && (!Number.isSafeInteger(seedCount) || seedCount < 1 || seedCount > 999)) {
      return errorResponse("Choose between 1 and 999 seeds.", 422);
    }
    if (!isValidEmail(email)) return errorResponse("A valid email is required for the order detail.", 422);
    if (!/^[a-f0-9-]{64,160}$/i.test(donorAccessToken)) {
      return errorResponse("The secure checkout token is invalid. Please refresh and try again.", 422);
    }

    let amountCents = ritual?.priceCents || 0;
    if (!ritual) {
      const { data: settingsRow, error: settingsError } = await supabase
        .from("site_settings").select("settings").eq("id", true).maybeSingle();
      if (settingsError) throw settingsError;
      const unitPrice = Math.max(Number(settingsRow?.settings?.seedPrice) || 11, 11);
      amountCents = Math.round(unitPrice * seedCount * 100);
    }
    if (amountCents < 1100) return errorResponse("Amount must be at least $11.", 422);

    attemptId = crypto.randomUUID();
    const productId = ritual?.productId || getDodoProductId();
    const customerRequest = ritual ? message : message || getRandomOrderRequest();
    const { error: insertError } = await supabase.from("payment_attempts").insert({
      id: attemptId,
      display_name: name,
      contact_email: email,
      amount: amountCents / 100,
      currency: getDodoCurrency(),
      customer_request: customerRequest,
      supporter_message: ritual ? null : customerRequest,
      frequency: "once",
      product_type: ritual ? "ritual" : "personalized_seed_writing",
      product_id: productId,
      payment_route: "standard",
      payment_provider: "dodo",
      donor_token_hash: await hashText(donorAccessToken),
      status: "started",
      raw_payment: { provider: "Dodo Payments", ...(ritual ? { ritualTier } : { seedCount }) },
    });
    if (insertError) throw insertError;

    const session = await createDodoCheckoutSession({
      attemptId, amountCents, email, name,
      ...(ritual ? { ritualTier, productId } : { seedCount, productId }),
    });
    if (!session.session_id || !session.checkout_url) throw new Error("Dodo did not return a checkout URL.");
    const { error: updateError } = await supabase.from("payment_attempts").update({
      dodo_checkout_session_id: session.session_id,
      raw_payment: { provider: "Dodo Payments", ...(ritual ? { ritualTier } : { seedCount }), session },
    }).eq("id", attemptId);
    if (updateError) throw updateError;

    return jsonResponse({
      sessionId: session.session_id,
      checkoutUrl: session.checkout_url,
      paymentRoute: "standard",
    });
  } catch (error) {
    if (attemptId) {
      await supabase.from("payment_attempts").update({
        status: "failed",
        failure_reason: "DODO_CHECKOUT_CREATION_FAILED",
      }).eq("id", attemptId).neq("status", "confirmed");
    }
    return errorResponse("Could not create Dodo checkout.", 500, String(error));
  }
});
