import {
  errorResponse,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/http.ts";
import { getRandomOrderRequest } from "../_shared/order-requests.ts";
import {
  centsToMoney,
  createPayPalOrder,
  getPayPalCurrency,
  parseMoneyToCents,
} from "../_shared/paypal.ts";
import {
  normalizePaymentRoute,
  resolvePaymentRoute,
} from "../_shared/payment-routing.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

type CreateOrderBody = {
  amount?: number;
  name?: string;
  message?: string;
  email?: string;
  paymentRoute?: string;
  productType?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const MIN_AMOUNT_CENTS = 700;

async function getCheckoutSettings() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("site_settings").select(
    "settings",
  ).eq("id", true).maybeSingle();

  if (error) throw error;

  const settings = data?.settings && typeof data.settings === "object"
    ? data.settings
    : {};
  return {
    checkoutRoute: normalizePaymentRoute(
      (settings as Record<string, unknown>).checkoutRoute,
    ),
    highPaymentSuperAdminEnabled:
      (settings as Record<string, unknown>).highPaymentSuperAdminEnabled ===
        true ||
      (settings as Record<string, unknown>).highPaymentSuperAdminEnabled ===
        "true",
  };
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const body = await readJson<CreateOrderBody>(request);
    const amountCents = parseMoneyToCents(body.amount);
    const displayName = String(body.name || "Customer").trim().slice(0, 80) ||
      "Customer";
    const supporterMessage = getRandomOrderRequest();
    const contactEmail = String(body.email || "").trim().slice(0, 160);
    const requestedProductType = String(body.productType || "seed").trim();
    if (requestedProductType !== "seed" && requestedProductType !== "personalized_seed_writing") {
      return errorResponse("This product is no longer available.", 422);
    }
    const personalizedRequest = String(body.message || "").trim().slice(0, 180) ||
      supporterMessage;

    if (amountCents < MIN_AMOUNT_CENTS) {
      return errorResponse("Amount must be at least $7.", 422);
    }
    if (!isValidEmail(contactEmail)) {
      return errorResponse(
        "A valid email is required for the order detail.",
        422,
      );
    }

    const { checkoutRoute, highPaymentSuperAdminEnabled } =
      await getCheckoutSettings();
    const paymentRoute = resolvePaymentRoute(
      checkoutRoute,
      highPaymentSuperAdminEnabled,
      amountCents,
    );
    const sdkRoute = normalizePaymentRoute(body.paymentRoute);

    if (sdkRoute !== paymentRoute) {
      return errorResponse(
        "The PayPal collection account changed. Please reopen checkout and try again.",
        409,
      );
    }

    const order = await createPayPalOrder({
      amountCents,
      paymentRoute,
    });

    const supabase = getSupabaseAdmin();
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
        product_type: "personalized_seed_writing",
        product_id: null,
        paypal_order_id: order.id,
        payment_route: paymentRoute,
        status: "started",
        raw_payment: {
          order,
          product: { type: "seed", itemName: "Personalised Digital Writing - Custom Order Made Writing" },
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
});
