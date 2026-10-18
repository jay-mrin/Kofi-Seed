import { errorResponse, handleOptions, jsonResponse, readJson } from "../_shared/http.ts";
import { createDodoCheckoutSession, getDodoCurrency } from "../_shared/dodo.ts";
import { getRandomOrderRequest } from "../_shared/order-requests.ts";
import { getSupabaseAdmin, hashText } from "../_shared/supabase.ts";

type CreateDodoBody = {
  seedCount?: number;
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
    const email = String(body.email || "").trim().slice(0, 160);
    const name = String(body.name || "Customer").trim().slice(0, 80) || "Customer";
    const message = String(body.message || "").trim().slice(0, 180);
    const donorAccessToken = String(body.donorAccessToken || "").trim();
    if (!Number.isSafeInteger(seedCount) || seedCount < 1 || seedCount > 999) {
      return errorResponse("Choose between 1 and 999 seeds.", 422);
    }
    if (!isValidEmail(email)) return errorResponse("A valid email is required for the order detail.", 422);
    if (!/^[a-f0-9-]{64,160}$/i.test(donorAccessToken)) {
      return errorResponse("The secure checkout token is invalid. Please refresh and try again.", 422);
    }

    const { data: settingsRow, error: settingsError } = await supabase
      .from("site_settings").select("settings").eq("id", true).maybeSingle();
    if (settingsError) throw settingsError;
    const unitPrice = Number(settingsRow?.settings?.seedPrice) || 7;
    const amountCents = Math.round(unitPrice * seedCount * 100);
    if (amountCents < 700) return errorResponse("Amount must be at least $7.", 422);

    attemptId = crypto.randomUUID();
    const supporterMessage = message || getRandomOrderRequest();
    const { error: insertError } = await supabase.from("payment_attempts").insert({
      id: attemptId,
      display_name: name,
      contact_email: email,
      amount: amountCents / 100,
      currency: getDodoCurrency(),
      customer_request: supporterMessage,
      supporter_message: supporterMessage,
      frequency: "once",
      product_type: "personalized_seed_writing",
      payment_route: "standard",
      payment_provider: "dodo",
      donor_token_hash: await hashText(donorAccessToken),
      status: "started",
      raw_payment: { provider: "Dodo Payments", seedCount },
    });
    if (insertError) throw insertError;

    const session = await createDodoCheckoutSession({ attemptId, amountCents, seedCount, email, name });
    if (!session.session_id || !session.checkout_url) throw new Error("Dodo did not return a checkout URL.");
    const { error: updateError } = await supabase.from("payment_attempts").update({
      dodo_checkout_session_id: session.session_id,
      raw_payment: { provider: "Dodo Payments", seedCount, session },
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
