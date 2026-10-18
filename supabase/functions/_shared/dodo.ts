const DODO_TEST_API = "https://test.dodopayments.com";
const DODO_LIVE_API = "https://live.dodopayments.com";

export class DodoApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "DodoApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getApiKey() {
  const apiKey = Deno.env.get("DODO_PAYMENTS_API_KEY");
  if (!apiKey) throw new Error("Missing DODO_PAYMENTS_API_KEY.");
  return apiKey;
}

function getApiBaseUrl() {
  const environment = String(Deno.env.get("DODO_PAYMENTS_ENV") || "test_mode")
    .trim().toLowerCase();
  return ["live", "live_mode", "production"].includes(environment)
    ? DODO_LIVE_API
    : DODO_TEST_API;
}

export function getDodoProductId() {
  const productId = String(Deno.env.get("DODO_PAYMENTS_PRODUCT_ID") || "").trim();
  if (!productId) throw new Error("Missing DODO_PAYMENTS_PRODUCT_ID.");
  return productId;
}

export function getDodoCurrency() {
  return String(Deno.env.get("DODO_PAYMENTS_CURRENCY") || "USD").trim().toUpperCase();
}

export function getDodoReturnUrl(kind: "success" | "cancel" = "success") {
  const configured = String(Deno.env.get("DODO_RETURN_URL") || Deno.env.get("SITE_ORIGIN") || "").trim();
  if (!configured) throw new Error("Missing DODO_RETURN_URL or SITE_ORIGIN.");
  const url = new URL(configured);
  url.searchParams.set(kind === "success" ? "dodo_return" : "dodo_cancelled", "1");
  return url.toString();
}

async function dodoRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new DodoApiError(
      String((payload as Record<string, any>)?.message || "Dodo Payments request failed."),
      response.status,
      payload,
    );
  }
  return payload as Record<string, any>;
}

export function createDodoCheckoutSession(input: {
  attemptId: string;
  amountCents: number;
  seedCount: number;
  email: string;
  name: string;
}) {
  return dodoRequest("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      product_cart: [{
        product_id: getDodoProductId(),
        quantity: 1,
        amount: input.amountCents,
      }],
      customer: {
        email: input.email,
        name: input.name,
      },
      billing_currency: getDodoCurrency(),
      return_url: getDodoReturnUrl("success"),
      cancel_url: getDodoReturnUrl("cancel"),
      metadata: {
        checkout_attempt_id: input.attemptId,
        checkout_owner: "admin",
        product_type: "personalized_seed_writing",
        seed_count: input.seedCount,
        expected_amount_cents: input.amountCents,
      },
    }),
  });
}

export function getDodoPayment(paymentId: string) {
  return dodoRequest(`/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function verifyDodoWebhook(headers: Headers, rawBody: string) {
  const webhookId = String(headers.get("webhook-id") || "").trim();
  const timestamp = String(headers.get("webhook-timestamp") || "").trim();
  const signatureHeader = String(headers.get("webhook-signature") || "").trim();
  const secret = String(Deno.env.get("DODO_PAYMENTS_WEBHOOK_KEY") || "").trim();

  if (!webhookId || !timestamp || !signatureHeader || !secret) {
    throw new Error("Dodo webhook signature headers or secret are missing.");
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    throw new Error("Dodo webhook timestamp is outside the allowed window.");
  }

  const keyBytes = decodeBase64(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signedContent = new TextEncoder().encode(`${webhookId}.${timestamp}.${rawBody}`);
  const signatures = signatureHeader.split(/\s+/)
    .map((value) => value.startsWith("v1,") ? value.slice(3) : "")
    .filter(Boolean);

  for (const signature of signatures) {
    try {
      if (await crypto.subtle.verify("HMAC", key, decodeBase64(signature), signedContent)) {
        return { webhookId, timestamp: timestampSeconds };
      }
    } catch {
      // Continue checking any additional v1 signature (for secret rotation).
    }
  }

  throw new Error("Dodo webhook signature is invalid.");
}
