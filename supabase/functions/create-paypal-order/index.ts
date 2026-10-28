import {
  withCors,
  errorResponse,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/http.ts";
import { getRandomOrderRequest } from "../_shared/order-requests.ts";
import { getRitual } from "../_shared/rituals.ts";
import {
  centsToMoney,
  createPayPalOrder,
  getPayPalCurrency,
  parseMoneyToCents,
} from "../_shared/paypal.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

type CreateOrderBody = {
  amount?: number;
  name?: string;
  message?: string;
  email?: string;
  paymentRoute?: string;
  productType?: string;
  ritualTier?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const MIN_AMOUNT_CENTS = 1100;

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const body = await readJson<CreateOrderBody>(request);
    const requestedProductType = String(body.productType || "seed").trim();
    const ritualTier = String(body.ritualTier || "").trim();
    const ritual = requestedProductType === "ritual" ? getRitual(ritualTier) : null;
    const amountCents = ritual ? ritual.priceCents : parseMoneyToCents(body.amount);
    const displayName = String(body.name || "").trim().slice(0, 80);
    const supporterMessage = getRandomOrderRequest();
    const contactEmail = String(body.email || "").trim().slice(0, 160);
    const supabase = getSupabaseAdmin();
    let seedPriceCents = MIN_AMOUNT_CENTS;
    if (!ritual) {
      const { data: settingsRow, error: settingsError } = await supabase
        .from("site_settings").select("settings").eq("id", true).maybeSingle();
      if (settingsError) throw settingsError;
      seedPriceCents = Math.max(
        Math.round((Number(settingsRow?.settings?.seedPrice) || 11) * 100),
        MIN_AMOUNT_CENTS,
      );
    }
    if (requestedProductType !== "seed" && requestedProductType !== "personalized_seed_writing" && !ritual) {
      return errorResponse("This product is no longer available.", 422);
    }
    const personalizedRequest = String(body.message || "").trim().slice(0, 180) ||
      (ritual ? "" : supporterMessage);

    if (!displayName) return errorResponse("Enter your name.", 422);
    if (ritual && !personalizedRequest) return errorResponse("Enter who this ritual is for.", 422);

    if (amountCents < (ritual ? MIN_AMOUNT_CENTS : seedPriceCents)) {
      return errorResponse(`Amount must be at least $${seedPriceCents / 100}.`, 422);
    }
    if (!isValidEmail(contactEmail)) {
      return errorResponse(
        "A valid email is required for the order detail.",
        422,
      );
    }

    const paymentRoute = "superadmin";
    if (body.paymentRoute !== paymentRoute) {
      return errorResponse(
        "Please reopen the SuperAdmin PayPal checkout and try again.",
        409,
      );
    }

    const order = await createPayPalOrder({
      amountCents,
      paymentRoute,
      itemName: ritual?.itemName,
    });

    const now = new Date().toISOString();
    const { error: cleanupError } = await supabase
      .from("payment_attempts")
      .delete()
      .in("status", ["started", "failed"])
      .lt("expires_at", now);
    if (cleanupError) throw cleanupError;

    const { error: attemptError } = await supabase.from("payment_attempts")
      .insert({
        display_name: displayName,
        contact_email: contactEmail,
        amount: centsToMoney(amountCents),
        currency: getPayPalCurrency(),
        customer_request: personalizedRequest,
        supporter_message: supporterMessage,
        frequency: "once",
        product_type: ritual ? "ritual" : "personalized_seed_writing",
        product_id: ritual ? ritualTier : null,
        paypal_order_id: order.id,
        payment_route: paymentRoute,
        status: "started",
        raw_payment: {
          order,
          ...(ritual ? {} : { seedPriceCents }),
          product: ritual
            ? { type: "ritual", ritualTier, itemName: ritual.itemName }
            : { type: "seed", itemName: "Personalised Digital Writing - Custom Order Made Writing" },
        },
      });
    if (attemptError) throw attemptError;

    return jsonResponse({
      id: order.id,
      status: order.status,
      paymentRoute,
    });
  } catch (error) {
    return errorResponse("Could not create PayPal order.", 500, String(error));
  }
}));
