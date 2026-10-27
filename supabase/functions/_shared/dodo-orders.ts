import { getDodoCurrency, getDodoPayment, getDodoProductId } from "./dodo.ts";
import { getRandomOrderRequest } from "./order-requests.ts";
import { getSupabaseAdmin, hashText } from "./supabase.ts";
import { getRitual } from "./rituals.ts";

const ITEM_NAME = "Personalised Digital Writing - Custom Order Made Writing";

function moneyFromCents(value: number) {
  return Math.round(value) / 100;
}

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `SYS-${date}-${suffix}`;
}

function mapDigitalOrder(order: Record<string, any> | null) {
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.order_number,
    donationId: order.donation_id,
    provider: order.payment_provider,
    providerOrderId: order.provider_order_id,
    providerTransactionId: order.provider_transaction_id,
    paypalOrderId: order.paypal_order_id,
    paypalCaptureId: order.paypal_capture_id,
    customerName: order.customer_name,
    contactEmail: order.contact_email,
    payerEmail: order.payer_email,
    amount: Number(order.amount),
    currency: order.currency,
    itemName: order.item_name,
    personalizedRequest: order.personalized_request,
    blessingMessage: order.blessing_message,
    fulfillmentStatus: order.fulfillment_status,
    fulfillmentNote: order.fulfillment_note,
    fulfilledAt: order.fulfilled_at,
    createdAt: order.created_at,
  };
}

function mapSeedComment(comment: Record<string, any> | null) {
  if (!comment) return null;
  return {
    id: comment.id,
    name: comment.display_name,
    text: comment.body,
    amount: comment.amount === null ? null : Number(comment.amount),
    seedCount: comment.seed_count,
    source: comment.source,
    createdAt: comment.created_at,
  };
}

async function ensureDigitalOrder(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  donation: Record<string, any>,
  attempt: Record<string, any>,
  payment: Record<string, any>,
  fortuneMessage: string | null,
  itemName: string,
) {
  const fields = "id, order_number, donation_id, payment_provider, provider_order_id, provider_transaction_id, paypal_order_id, paypal_capture_id, customer_name, contact_email, payer_email, amount, currency, item_name, personalized_request, blessing_message, fulfillment_status, fulfillment_note, fulfilled_at, created_at";
  const { data: existing, error: existingError } = await supabase
    .from("digital_orders").select(fields).eq("donation_id", donation.id).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabase.from("digital_orders").insert({
    order_number: createOrderNumber(),
    donation_id: donation.id,
    payment_provider: "dodo",
    provider_order_id: payment.checkout_session_id,
    provider_transaction_id: payment.payment_id,
    customer_name: donation.display_name,
    contact_email: attempt.contact_email,
    payer_email: payment.customer?.email || attempt.contact_email,
    amount: Number(attempt.amount),
    currency: attempt.currency,
    item_name: itemName,
    personalized_request: attempt.customer_request || attempt.supporter_message || null,
    blessing_message: fortuneMessage,
    fulfillment_status: "paid_awaiting_personalized_writing",
  }).select(fields).single();
  if (error) throw error;
  return data;
}

async function ensureSeedComment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  donation: Record<string, any>,
  attempt: Record<string, any>,
) {
  const body = String(attempt.supporter_message || "").trim().slice(0, 280);
  if (!body) return null;
  const fields = "id, display_name, body, amount, seed_count, source, created_at";
  const { data: existing, error: existingError } = await supabase
    .from("seed_comments").select(fields).eq("donation_id", donation.id).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabase.from("seed_comments").insert({
    donation_id: donation.id,
    display_name: donation.display_name,
    body,
    amount: Number(attempt.amount),
    seed_count: donation.seed_count,
    source: "payment",
    created_at: donation.created_at,
  }).select(fields).single();
  if (error) throw error;
  return data;
}

export async function finalizeDodoPayment(paymentId: string, presentedDonorToken = "") {
  const normalizedPaymentId = String(paymentId || "").trim();
  if (!normalizedPaymentId) throw new Error("Dodo payment id is required.");

  const payment = await getDodoPayment(normalizedPaymentId);
  if (payment.status !== "succeeded") {
    const error = new Error("Dodo payment is not complete.") as Error & { status?: number };
    error.status = 422;
    throw error;
  }

  const sessionId = String(payment.checkout_session_id || "").trim();
  const supabase = getSupabaseAdmin();
  const { data: attempt, error: attemptError } = await supabase
    .from("payment_attempts")
    .select("id, display_name, contact_email, amount, currency, customer_request, supporter_message, product_type, product_id, payment_route, payment_provider, dodo_checkout_session_id, dodo_payment_id, donor_token_hash, status, raw_payment, expires_at")
    .eq("dodo_checkout_session_id", sessionId)
    .eq("payment_provider", "dodo")
    .maybeSingle();
  if (attemptError) throw attemptError;
  if (!attempt) throw new Error("Dodo checkout attempt was not found.");

  const expectedCents = Math.round(Number(attempt.amount) * 100);
  const currency = String(payment.currency || "").toUpperCase();
  const cart = Array.isArray(payment.product_cart) ? payment.product_cart : [];
  const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
  const ritualTier = String(attempt.raw_payment?.ritualTier || "");
  const ritual = attempt.product_type === "ritual" ? getRitual(ritualTier) : null;
  if (attempt.product_type === "ritual" && !ritual) throw new Error("Unknown ritual checkout attempt.");
  const expectedProductId = ritual?.productId || getDodoProductId();
  const hasExpectedProduct = cart.length === 1 && cart.some((item: Record<string, any>) =>
    item?.product_id === expectedProductId && Number(item?.quantity) === 1
  );

  if (
    !sessionId || payment.payment_id !== normalizedPaymentId ||
    String(metadata.checkout_attempt_id || "") !== attempt.id ||
    Number(metadata.expected_amount_cents) !== expectedCents ||
    (ritual && (
      String(metadata.product_type || "") !== "ritual" ||
      String(metadata.ritual_tier || "") !== ritualTier ||
      attempt.product_id !== ritual.productId
    )) ||
    currency !== String(attempt.currency).toUpperCase() ||
    currency !== getDodoCurrency() ||
    Number(payment.total_amount) < expectedCents ||
    !hasExpectedProduct
  ) {
    throw new Error("Dodo payment details do not match the checkout attempt.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("donations")
    .select("id, display_name, amount, seed_count, frequency, supporter_message, fortune_message, payment_route, raw_payment, created_at")
    .eq("dodo_payment_id", normalizedPaymentId)
    .maybeSingle();
  if (existingError) throw existingError;

  let donation = existing;
  let fortuneMessage = existing?.fortune_message || null;

  if (!donation) {
    let fortune: Record<string, any> | null = null;
    if (!ritual) {
      const { data: fortunes, error: fortuneError } = await supabase
        .from("fortunes").select("id, message").eq("active", true).limit(200);
      if (fortuneError || !fortunes?.length) {
        throw fortuneError || new Error("No active fortune messages found.");
      }
      fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      fortuneMessage = fortune.message;
    }
    const seedCount = ritual ? 1 : Math.max(1, Number(metadata.seed_count) || Math.round(expectedCents / 700));
    const itemName = ritual?.itemName || ITEM_NAME;
    const rawPayment = {
      provider: "Dodo Payments",
      routing: { route: "standard" },
      product: { type: ritual ? "ritual" : "seed", itemName, ...(ritual ? { ritualTier } : {}) },
      payment,
      digitalOrder: {
        customerName: attempt.display_name,
        contactEmail: attempt.contact_email,
        payerEmail: payment.customer?.email || attempt.contact_email,
        provider: "dodo",
        providerOrderId: sessionId,
        providerTransactionId: normalizedPaymentId,
        amount: Number(attempt.amount),
        chargedAmount: moneyFromCents(Number(payment.total_amount)),
        currency,
        itemName,
        personalizedRequest: attempt.customer_request,
        fulfillmentStatus: "paid_awaiting_personalized_writing",
        createdAt: payment.created_at || new Date().toISOString(),
      },
    };
    const { data: created, error: createError } = await supabase.from("donations").insert({
      display_name: attempt.display_name || payment.customer?.name || "Customer",
      amount: Number(attempt.amount),
      seed_count: seedCount,
      frequency: "once",
      supporter_message: ritual ? null : attempt.supporter_message || getRandomOrderRequest(),
      payment_method: "dodo",
      paypal_status: "COMPLETED",
      dodo_checkout_session_id: sessionId,
      dodo_payment_id: normalizedPaymentId,
      payment_route: "standard",
      visibility_scope: "public",
      fortune_id: fortune?.id || null,
      fortune_message: fortune?.message || null,
      raw_payment: rawPayment,
    }).select("id, display_name, amount, seed_count, frequency, supporter_message, fortune_message, payment_route, raw_payment, created_at").single();

    if (createError?.code === "23505") {
      const { data: raced, error: racedError } = await supabase
        .from("donations")
        .select("id, display_name, amount, seed_count, frequency, supporter_message, fortune_message, payment_route, raw_payment, created_at")
        .eq("dodo_payment_id", normalizedPaymentId).single();
      if (racedError) throw racedError;
      donation = raced;
      fortuneMessage = raced.fortune_message;
    } else if (createError) {
      throw createError;
    } else {
      donation = created;
    }
  }

  if (!donation) throw new Error("Dodo order could not be created.");
  const { data: existingDonorToken, error: existingDonorTokenError } = await supabase
    .from("donor_tokens").select("id").eq("donation_id", donation.id).maybeSingle();
  if (existingDonorTokenError) throw existingDonorTokenError;
  if (!existingDonorToken && attempt.donor_token_hash) {
    const { data: donorToken, error: donorTokenError } = await supabase.from("donor_tokens").upsert({
      token_hash: attempt.donor_token_hash,
      donation_id: donation.id,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "token_hash" }).select("id").single();
    if (donorTokenError) throw donorTokenError;
    const { error: donationLinkError } = await supabase.from("donations")
      .update({ donor_token_id: donorToken.id }).eq("id", donation.id);
    if (donationLinkError) throw donationLinkError;
  }
  const digitalOrder = await ensureDigitalOrder(supabase, donation, attempt, payment, fortuneMessage, ritual?.itemName || ITEM_NAME);
  const seedComment = ritual ? null : await ensureSeedComment(supabase, donation, attempt);
  const previousRaw = attempt.raw_payment && typeof attempt.raw_payment === "object" ? attempt.raw_payment : {};
  const { error: confirmError } = await supabase.from("payment_attempts").update({
    status: "confirmed",
    dodo_payment_id: normalizedPaymentId,
    failure_reason: null,
    raw_payment: { ...previousRaw, payment },
    confirmed_at: new Date().toISOString(),
  }).eq("id", attempt.id);
  if (confirmError) throw confirmError;

  const donorAccessToken = presentedDonorToken && attempt.donor_token_hash &&
      await hashText(presentedDonorToken) === attempt.donor_token_hash
    ? presentedDonorToken
    : null;

  return {
    donation: { ...donation, paymentRoute: "standard" },
    fortune: fortuneMessage,
    digitalOrder: mapDigitalOrder(digitalOrder),
    seedComment: mapSeedComment(seedComment),
    donorAccessToken,
    paymentRoute: "standard",
    productType: ritual ? "ritual" : "seed",
    duplicate: Boolean(existing),
  };
}
