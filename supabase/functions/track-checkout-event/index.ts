import { errorResponse, handleOptions, jsonResponse, readJson } from "../_shared/http.ts";
import { centsToMoney, parseMoneyToCents } from "../_shared/paypal.ts";
import { getSupabaseAdmin, hashText } from "../_shared/supabase.ts";

type CheckoutEventBody = {
  amount?: number;
  eventName?: string;
  path?: string;
  visitorKey?: string;
};

const ALLOWED_EVENTS = new Set(["checkout_button_clicked", "paypal_checkout_started"]);
const MIN_AMOUNT_CENTS = 1100;

function sanitizePath(value: unknown) {
  const path = String(value || "/").trim();

  if (!path || path.includes("://")) return "/";

  return path.slice(0, 180);
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const body = await readJson<CheckoutEventBody>(request);
    const eventName = String(body.eventName || "").trim();
    const visitorKey = String(body.visitorKey || "").trim();
    const amountCents = parseMoneyToCents(body.amount);

    if (!ALLOWED_EVENTS.has(eventName)) return errorResponse("Checkout event is invalid.", 422);
    if (!visitorKey) return errorResponse("Visitor key is required.", 422);
    if (amountCents < MIN_AMOUNT_CENTS) return errorResponse("Amount must be at least $11.", 422);
    const paymentRoute = "superadmin";

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("checkout_events").insert({
      event_name: eventName,
      visitor_key_hash: await hashText(visitorKey),
      payment_route: paymentRoute,
      amount: centsToMoney(amountCents),
      path: sanitizePath(body.path),
      user_agent: (request.headers.get("user-agent") || "").slice(0, 220),
    });

    if (error) throw error;

    return jsonResponse({ recorded: true, paymentRoute });
  } catch (error) {
    return errorResponse("Could not record checkout event.", 500, String(error));
  }
});
