const PAYPAL_API_BASE = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

export const DIGITAL_ORDER_ITEM_NAME =
  "Personalised Digital Writing - Custom Order Made Writing";

export class PayPalApiError extends Error {
  status: number;
  payload: Record<string, any>;
  issue: string;

  constructor(
    operation: string,
    status: number,
    payload: Record<string, any>,
  ) {
    const issue = String(payload?.details?.[0]?.issue || payload?.name || "")
      .trim();
    super(`PayPal ${operation} failed: ${JSON.stringify(payload)}`);
    this.name = "PayPalApiError";
    this.status = status;
    this.payload = payload;
    this.issue = issue;
  }
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function createDigitalOrderNumber(date = new Date()) {
  const datePart = [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join("");
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 8)
    .toUpperCase();

  return `SYS-${datePart}-${randomPart}`;
}

export function getPayPalBaseUrl() {
  const env = (Deno.env.get("PAYPAL_ENV") || "sandbox").toLowerCase();
  return PAYPAL_API_BASE[env === "live" ? "live" : "sandbox"];
}

export function getPayPalCurrency() {
  return (Deno.env.get("PAYPAL_CURRENCY") || "USD").trim().toUpperCase();
}

export function parseMoneyToCents(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/^\$/, "");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 0;

  const [dollarsPart, centsPart = ""] = normalized.split(".");
  const dollars = Number.parseInt(dollarsPart, 10);
  const cents = Number.parseInt(centsPart.padEnd(2, "0") || "0", 10);

  if (!Number.isFinite(dollars) || !Number.isFinite(cents)) return 0;

  return dollars * 100 + cents;
}

export function centsToMoney(cents: number) {
  return Math.max(Number(cents) || 0, 0) / 100;
}

export function formatMoneyFromCents(cents: number) {
  return centsToMoney(cents).toFixed(2);
}

export function getPayPalClientId(paymentRoute?: string) {
  if (paymentRoute === "superadmin") {
    return Deno.env.get("SUPER_ADMIN_PAYPAL_CLIENT_ID") || "";
  }
  return Deno.env.get("PAYPAL_CLIENT_ID") || "";
}

function getPayPalClientSecret(paymentRoute?: string) {
  if (paymentRoute === "superadmin") {
    return Deno.env.get("SUPER_ADMIN_PAYPAL_CLIENT_SECRET") || "";
  }
  return Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
}

function assertPayPalCredentials(paymentRoute?: string) {
  const clientId = getPayPalClientId(paymentRoute);
  const clientSecret = getPayPalClientSecret(paymentRoute);

  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing PayPal credentials for route ${paymentRoute || "standard"}.`,
    );
  }

  return { clientId, clientSecret };
}

export async function getPayPalAccessToken(paymentRoute?: string) {
  const { clientId, clientSecret } = assertPayPalCredentials(paymentRoute);
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed: ${JSON.stringify(payload)}`);
  }

  return payload.access_token as string;
}

export async function createPayPalOrder(input: {
  amountCents: number;
  paymentRoute?: string;
  itemName?: string;
}) {
  const accessToken = await getPayPalAccessToken(input.paymentRoute);
  const currency = getPayPalCurrency();
  const amount = formatMoneyFromCents(input.amountCents);
  const orderNumber = createDigitalOrderNumber();
  const purchaseUnit: Record<string, any> = {
    description: String(input.itemName || DIGITAL_ORDER_ITEM_NAME).slice(0, 127),
    custom_id: orderNumber,
    amount: {
      currency_code: currency,
      value: amount,
    },
  };

  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal order creation failed: ${JSON.stringify(payload)}`);
  }

  return payload;
}

export async function capturePayPalOrder(
  orderId: string,
  paymentRoute?: string,
) {
  const accessToken = await getPayPalAccessToken(paymentRoute);
  // A restarted checkout reuses the PayPal order with a new funding source.
  // Use a fresh idempotency key so a prior declined capture is not replayed.
  const captureRequestId = `${orderId}-${crypto.randomUUID()}`;
  const response = await fetch(
    `${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": captureRequestId,
      },
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new PayPalApiError("capture", response.status, payload);
  }

  return payload;
}

export async function getPayPalOrder(orderId: string, paymentRoute?: string) {
  const accessToken = await getPayPalAccessToken(paymentRoute);
  const response = await fetch(
    `${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal order lookup failed: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function paypalJsonRequest(
  path: string,
  input: {
    method?: string;
    paymentRoute?: string;
    body?: Record<string, unknown>;
    requestId?: string;
  } = {},
) {
  const accessToken = await getPayPalAccessToken(input.paymentRoute);
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method: input.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(input.requestId ? { "PayPal-Request-Id": input.requestId } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PayPalApiError(path, response.status, payload);
  }

  return payload;
}

export async function createPayPalSubscriptionProduct(input: {
  paymentRoute: string;
}) {
  return await paypalJsonRequest("/v1/catalogs/products", {
    method: "POST",
    paymentRoute: input.paymentRoute,
    requestId: crypto.randomUUID(),
    body: {
      name: `Sow Your Seed Weekly Offering (${input.paymentRoute})`,
      description: DIGITAL_ORDER_ITEM_NAME,
      type: "SERVICE",
    },
  });
}

export async function createPayPalWeeklyPlan(input: {
  amountCents: number;
  paymentRoute: string;
  productId: string;
}) {
  const currency = getPayPalCurrency();
  const amount = formatMoneyFromCents(input.amountCents);

  return await paypalJsonRequest("/v1/billing/plans", {
    method: "POST",
    paymentRoute: input.paymentRoute,
    requestId: crypto.randomUUID(),
    body: {
      product_id: input.productId,
      name: `${amount} ${currency} Weekly Seed`,
      description: `${DIGITAL_ORDER_ITEM_NAME} billed every week`,
      status: "ACTIVE",
      billing_cycles: [{
        frequency: { interval_unit: "WEEK", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: { value: amount, currency_code: currency },
        },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: amount, currency_code: currency },
        setup_fee_failure_action: "CANCEL",
        payment_failure_threshold: 1,
      },
    },
  });
}

export async function getPayPalSubscription(
  subscriptionId: string,
  paymentRoute?: string,
) {
  return await paypalJsonRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}?fields=last_failed_payment`,
    { paymentRoute },
  );
}

export async function cancelPayPalSubscription(
  subscriptionId: string,
  paymentRoute: string,
  reason: string,
) {
  await paypalJsonRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: "POST",
      paymentRoute,
      body: { reason: String(reason || "Cancelled by account owner").slice(0, 128) },
    },
  );
}

function getWebhookId(paymentRoute?: string) {
  if (paymentRoute === "superadmin") {
    return Deno.env.get("SUPER_ADMIN_PAYPAL_WEBHOOK_ID") || "";
  }
  return Deno.env.get("PAYPAL_WEBHOOK_ID") || "";
}

async function tryVerifyWebhook(
  headers: Headers,
  body: string,
  paymentRoute: string,
) {
  const webhookId = getWebhookId(paymentRoute);

  if (!webhookId) return null;

  const accessToken = await getPayPalAccessToken(paymentRoute);
  const response = await fetch(
    `${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok || payload.verification_status !== "SUCCESS") {
    return null; // Failed for this route
  }

  return {
    ...payload,
    paymentRoute,
  };
}

export async function verifyPayPalWebhook(headers: Headers, body: string) {
  const routes = ["superadmin", "standard"];

  for (const paymentRoute of routes) {
    try {
      const result = await tryVerifyWebhook(headers, body, paymentRoute);

      if (result) return result;
    } catch (error) {
      // Keep verifying legacy Admin events while those transactions remain active.
      console.error(
        `PayPal webhook verification failed for route ${paymentRoute}.`,
        error,
      );
    }
  }

  throw new Error("PayPal webhook verification failed for all known routes.");
}
