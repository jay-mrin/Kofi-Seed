import {
  errorResponse,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/http.ts";
import {
  capturePayPalOrder,
  centsToMoney,
  createDigitalOrderNumber,
  DIGITAL_ORDER_ITEM_NAME,
  getPayPalCurrency,
  getPayPalOrder,
  parseMoneyToCents,
  PayPalApiError,
} from "../_shared/paypal.ts";
import {
  createRandomToken,
  getSupabaseAdmin,
  hashText,
} from "../_shared/supabase.ts";
import { getRitual } from "../_shared/rituals.ts";

const MIN_AMOUNT_CENTS = 700;

type CaptureBody = {
  orderId?: string;
};

function seedCountFromAmount(amount: number) {
  return Math.max(1, Math.round(amount / 7));
}

function captureFromOrder(order: Record<string, any>) {
  const captures = order.purchase_units?.[0]?.payments?.captures;
  if (!Array.isArray(captures) || !captures.length) return null;

  return captures.find((capture) => capture?.status === "COMPLETED") ||
    captures.at(-1) || null;
}

function getOrderNumberFromPayPal(order: Record<string, any>) {
  const customId = String(order.purchase_units?.[0]?.custom_id || "").trim();

  if (/^SYS-\d{8}-[A-Z0-9]{6,12}$/.test(customId)) return customId;

  return createDigitalOrderNumber();
}

function mapDigitalOrder(order: Record<string, any> | null) {
  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.order_number,
    donationId: order.donation_id,
    paypalOrderId: order.paypal_order_id,
    paypalCaptureId: order.paypal_capture_id,
    customerName: order.customer_name,
    contactEmail: order.contact_email,
    payerEmail: order.payer_email,
    amount: order.amount,
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
  input: {
    donationId: string;
    orderNumber?: string;
    paypalOrderId?: string | null;
    paypalCaptureId?: string | null;
    customerName: string;
    contactEmail?: string | null;
    payerEmail?: string | null;
    amount: number;
    currency: string;
    personalizedRequest?: string | null;
    blessingMessage?: string | null;
    itemName?: string | null;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("digital_orders")
    .select(
      "id, order_number, donation_id, paypal_order_id, paypal_capture_id, customer_name, contact_email, payer_email, amount, currency, item_name, personalized_request, blessing_message, fulfillment_status, fulfillment_note, fulfilled_at, created_at",
    )
    .eq("donation_id", input.donationId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    const contactEmail = input.contactEmail || existing.contact_email || null;
    const payerEmail = input.payerEmail || existing.payer_email || null;
    const shouldRefresh = contactEmail !== existing.contact_email ||
      payerEmail !== existing.payer_email ||
      input.paypalOrderId !== existing.paypal_order_id ||
      input.paypalCaptureId !== existing.paypal_capture_id ||
      (input.itemName && input.itemName !== existing.item_name);

    if (!shouldRefresh) return existing;

    const { data: refreshed, error: refreshError } = await supabase
      .from("digital_orders")
      .update({
        paypal_order_id: input.paypalOrderId || existing.paypal_order_id ||
          null,
        paypal_capture_id: input.paypalCaptureId ||
          existing.paypal_capture_id || null,
        contact_email: contactEmail,
        payer_email: payerEmail,
        item_name: input.itemName || existing.item_name,
      })
      .eq("id", existing.id)
      .select(
        "id, order_number, donation_id, paypal_order_id, paypal_capture_id, customer_name, contact_email, payer_email, amount, currency, item_name, personalized_request, blessing_message, fulfillment_status, fulfillment_note, fulfilled_at, created_at",
      )
      .single();

    if (refreshError) throw refreshError;

    return refreshed;
  }

  const { data: created, error: createError } = await supabase
    .from("digital_orders")
    .insert({
      order_number: input.orderNumber || createDigitalOrderNumber(),
      donation_id: input.donationId,
      paypal_order_id: input.paypalOrderId || null,
      paypal_capture_id: input.paypalCaptureId || null,
      customer_name: input.customerName,
      contact_email: input.contactEmail || null,
      payer_email: input.payerEmail || null,
      amount: input.amount,
      currency: input.currency,
      item_name: input.itemName || DIGITAL_ORDER_ITEM_NAME,
      personalized_request: input.personalizedRequest || null,
      blessing_message: input.blessingMessage || null,
      fulfillment_status: "paid_awaiting_personalized_writing",
    })
    .select(
      "id, order_number, donation_id, paypal_order_id, paypal_capture_id, customer_name, contact_email, payer_email, amount, currency, item_name, personalized_request, blessing_message, fulfillment_status, fulfillment_note, fulfilled_at, created_at",
    )
    .single();

  if (createError) throw createError;

  return created;
}

async function ensureSeedComment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  input: {
    donationId: string;
    displayName: string;
    body?: string | null;
    amount: number;
    seedCount: number;
    createdAt?: string | null;
  },
) {
  const body = String(input.body || "").trim().slice(0, 280);

  if (!body) return null;

  const { data: existing, error: existingError } = await supabase
    .from("seed_comments")
    .select("id, display_name, body, amount, seed_count, source, created_at")
    .eq("donation_id", input.donationId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("seed_comments")
    .insert({
      donation_id: input.donationId,
      display_name: input.displayName,
      body,
      amount: input.amount,
      seed_count: input.seedCount,
      source: "payment",
      created_at: input.createdAt || new Date().toISOString(),
    })
    .select("id, display_name, body, amount, seed_count, source, created_at")
    .single();

  if (createError) throw createError;

  return created;
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const body = await readJson<CaptureBody>(request);
    const orderId = String(body.orderId || "").trim();

    if (!orderId) return errorResponse("PayPal order id is required.", 422);

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("donations")
      .select(
        "id, fortune_message, display_name, amount, seed_count, frequency, supporter_message, paypal_order_id, paypal_capture_id, paypal_payer_email, payment_route, raw_payment, created_at",
      )
      .eq("paypal_order_id", orderId)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      const paymentRoute = existing.payment_route === "superadmin"
        ? "superadmin"
        : "standard";
      const rawPayment =
        existing.raw_payment && typeof existing.raw_payment === "object" &&
          !Array.isArray(existing.raw_payment)
          ? existing.raw_payment
          : {};
      const rawOrder = rawPayment.order && typeof rawPayment.order === "object"
        ? rawPayment.order
        : {};
      const rawRow = rawPayment.row && typeof rawPayment.row === "object"
        ? rawPayment.row
          : {};
      const isBookOrder = rawPayment.product?.type === "book";
      const isRitualOrder = rawPayment.product?.type === "ritual";
      const itemName = rawPayment.digitalOrder?.itemName ||
        rawPayment.product?.itemName || DIGITAL_ORDER_ITEM_NAME;
      const contactEmail = String(
        rawPayment.digitalOrder?.contactEmail ||
          existing.paypal_payer_email || "",
      ).trim() || null;
      const digitalOrder = await ensureDigitalOrder(supabase, {
        donationId: existing.id,
        orderNumber: rawPayment.digitalOrder?.orderNumber ||
          getOrderNumberFromPayPal(rawOrder),
        paypalOrderId: existing.paypal_order_id,
        paypalCaptureId: existing.paypal_capture_id,
        customerName: existing.display_name,
        contactEmail,
        payerEmail: existing.paypal_payer_email,
        amount: Number(existing.amount) || 0,
        currency: rawPayment.digitalOrder?.currency || rawRow.Currency ||
          getPayPalCurrency(),
        personalizedRequest: rawPayment.digitalOrder?.personalizedRequest ||
          existing.supporter_message,
        blessingMessage: existing.fortune_message,
        itemName,
      });
      const seedComment = paymentRoute === "superadmin" || isBookOrder || isRitualOrder
        ? null
        : await ensureSeedComment(supabase, {
          donationId: existing.id,
          displayName: existing.display_name,
          body: existing.supporter_message,
          amount: Number(existing.amount) || 0,
          seedCount: Number(existing.seed_count) ||
            seedCountFromAmount(Number(existing.amount) || 0),
          createdAt: existing.created_at,
        });
      const { error: attemptUpdateError } = await supabase
        .from("payment_attempts")
        .update({
          status: "confirmed",
          paypal_capture_id: existing.paypal_capture_id,
          confirmed_at: existing.created_at,
          failure_reason: null,
        })
        .eq("paypal_order_id", orderId);
      if (attemptUpdateError) throw attemptUpdateError;

      return jsonResponse({
        donation: {
          ...existing,
          paymentRoute,
        },
        fortune: existing.fortune_message,
        digitalOrder: mapDigitalOrder(digitalOrder),
        seedComment: seedComment ? mapSeedComment(seedComment) : null,
        donorAccessToken: null,
        paymentRoute,
        productType: isRitualOrder ? "ritual" : isBookOrder ? "book" : "seed",
        duplicate: true,
      });
    }

    const { data: paymentAttempt, error: attemptError } = await supabase
      .from("payment_attempts")
      .select(
        "id, paypal_order_id, payment_route, amount, currency, display_name, contact_email, customer_request, supporter_message, product_type, product_id, status, failure_reason, raw_payment, expires_at",
      )
      .eq("paypal_order_id", orderId)
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!paymentAttempt) {
      return errorResponse(
        "PayPal checkout attempt was not found. Please start again.",
        422,
      );
    }
    if (paymentAttempt.status === "failed") {
      return errorResponse(
        "This PayPal checkout attempt is closed. Please start again.",
        409,
      );
    }

    const attemptRawPayment =
      paymentAttempt.raw_payment && typeof paymentAttempt.raw_payment === "object" &&
        !Array.isArray(paymentAttempt.raw_payment)
        ? paymentAttempt.raw_payment
        : {};
    const book = paymentAttempt.product_type === "book"
      ? {
        id: paymentAttempt.product_id,
        title: String(attemptRawPayment.product?.title || "Purchased book"),
        itemName: String(attemptRawPayment.product?.itemName || "Digital Book - Purchased book"),
      }
      : null;
    const isBookOrder = Boolean(book);
    const ritual = paymentAttempt.product_type === "ritual"
      ? getRitual(paymentAttempt.product_id)
      : null;
    const isRitualOrder = Boolean(ritual);
    if (paymentAttempt.product_type === "ritual" && !ritual) {
      return errorResponse("Ritual checkout details are invalid.", 422);
    }
    const itemName = ritual?.itemName || book?.itemName || DIGITAL_ORDER_ITEM_NAME;

    let fortune: { id: number; message: string } | null = null;
    if (!isBookOrder && !isRitualOrder) {
      const { data: fortunes, error: fortuneError } = await supabase
        .from("fortunes")
        .select("id, message")
        .eq("active", true)
        .limit(200);

      if (fortuneError || !fortunes?.length) {
        throw fortuneError || new Error("No active fortune messages found.");
      }

      fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    }

    const paymentRoute = paymentAttempt.payment_route === "superadmin"
      ? "superadmin"
      : "standard";
    let order = await getPayPalOrder(orderId, paymentRoute);
    let capture = captureFromOrder(order);

    if (!capture || capture.status !== "COMPLETED") {
      if (new Date(paymentAttempt.expires_at).getTime() <= Date.now()) {
        return errorResponse(
          "PayPal checkout attempt expired. Please start again.",
          410,
        );
      }
      try {
        order = await capturePayPalOrder(orderId, paymentRoute);
        capture = captureFromOrder(order);
      } catch (error) {
        if (
          error instanceof PayPalApiError &&
          error.issue === "INSTRUMENT_DECLINED"
        ) {
          const previousRawPayment =
            paymentAttempt.raw_payment &&
              typeof paymentAttempt.raw_payment === "object" &&
              !Array.isArray(paymentAttempt.raw_payment)
              ? paymentAttempt.raw_payment
              : {};
          const { error: declineUpdateError } = await supabase
            .from("payment_attempts")
            .update({
              status: "started",
              failure_reason: error.issue,
              raw_payment: {
                ...previousRawPayment,
                order,
                lastCaptureError: error.payload,
              },
            })
            .eq("id", paymentAttempt.id)
            .neq("status", "confirmed");
          if (declineUpdateError) throw declineUpdateError;

          return jsonResponse(
            {
              error:
                "The selected PayPal payment method was declined. Please choose another payment method.",
              code: error.issue,
              retryable: true,
            },
            422,
          );
        }

        throw error;
      }
    }

    if (!capture || capture.status !== "COMPLETED") {
      return errorResponse("PayPal payment was not completed.", 422, order);
    }

    const capturedAmountCents = parseMoneyToCents(capture.amount?.value);
    const capturedAmount = centsToMoney(capturedAmountCents);
    const currency = capture.amount?.currency_code || getPayPalCurrency();

    if (
      !capturedAmountCents ||
      capturedAmountCents !== parseMoneyToCents(paymentAttempt.amount) ||
      currency !== String(paymentAttempt.currency || "").toUpperCase() ||
      currency !== getPayPalCurrency()
    ) {
      return errorResponse(
        "PayPal captured amount or currency is invalid.",
        422,
        order,
      );
    }
    if (capturedAmountCents < MIN_AMOUNT_CENTS) {
      return errorResponse(
        "PayPal captured amount is below the $7 minimum.",
        422,
        order,
      );
    }
    if (ritual && capturedAmountCents !== ritual.priceCents) {
      return errorResponse("Ritual payment amount is invalid.", 422, order);
    }
    if (isBookOrder && capturedAmountCents % MIN_AMOUNT_CENTS !== 0) {
      return errorResponse(
        "Book payments must be in multiples of $7.",
        422,
        order,
      );
    }

    const displayName = String(
      paymentAttempt.display_name || order.payer?.name?.given_name ||
        "Customer",
    )
      .trim()
      .slice(0, 80);
    const contactEmail = String(paymentAttempt.contact_email || "").trim();
    const supporterMessage = String(paymentAttempt.supporter_message || "")
      .trim();
    const personalizedRequest = String(
      paymentAttempt.customer_request || supporterMessage,
    ).trim();
    const frequency = "once";
    const orderNumber = getOrderNumberFromPayPal(order);
    const rawDonorToken = createRandomToken();
    const donorTokenHash = await hashText(rawDonorToken);

    const { data: donorToken, error: donorTokenError } = await supabase
      .from("donor_tokens")
      .insert({
        token_hash: donorTokenHash,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString(),
      })
      .select("id")
      .single();
    if (donorTokenError) throw donorTokenError;

    const { data: donation, error: donationError } = await supabase
      .from("donations")
      .insert({
        display_name: displayName,
        amount: capturedAmount,
        seed_count: isRitualOrder ? 1 : seedCountFromAmount(capturedAmount),
        frequency,
        supporter_message: isRitualOrder ? null : supporterMessage || null,
        payment_method: "paypal",
        paypal_order_id: order.id,
        paypal_capture_id: capture.id,
        paypal_payer_email: order.payer?.email_address || null,
        paypal_status: capture.status,
        payment_route: paymentRoute,
        visibility_scope: paymentRoute === "superadmin"
          ? "superadmin_private"
          : "public",
        fortune_id: fortune?.id || null,
        fortune_message: fortune?.message || null,
        donor_token_id: donorToken.id,
        raw_payment: {
          provider: "PayPal",
          routing: {
            route: paymentRoute,
          },
          product: ritual
            ? { type: "ritual", ritualTier: paymentAttempt.product_id, itemName }
            : book
            ? { type: "book", id: book.id, title: book.title, itemName }
            : { type: "seed", itemName },
          order,
          digitalOrder: {
            orderNumber,
            customerName: displayName,
            contactEmail,
            payerEmail: order.payer?.email_address || null,
            paypalOrderId: order.id,
            paypalCaptureId: capture.id,
            amount: capturedAmount,
            currency,
            itemName,
            personalizedRequest,
            fulfillmentStatus: "paid_awaiting_personalized_writing",
            createdAt: capture.create_time || order.create_time ||
              new Date().toISOString(),
          },
        },
      })
      .select(
        "id, display_name, amount, seed_count, frequency, supporter_message, fortune_message, raw_payment, created_at",
      )
      .single();
    if (donationError) throw donationError;

    const digitalOrder = await ensureDigitalOrder(supabase, {
      donationId: donation.id,
      orderNumber,
      paypalOrderId: order.id,
      paypalCaptureId: capture.id,
      customerName: displayName,
      contactEmail,
      payerEmail: order.payer?.email_address || null,
      amount: capturedAmount,
      currency,
      personalizedRequest,
      blessingMessage: fortune?.message || (book ? `Deliver ${book.title} by email.` : null),
      itemName,
    });
    const seedComment = paymentRoute === "superadmin" || isBookOrder || isRitualOrder
      ? null
      : await ensureSeedComment(supabase, {
        donationId: donation.id,
        displayName,
        body: supporterMessage,
        amount: capturedAmount,
        seedCount: seedCountFromAmount(capturedAmount),
        createdAt: donation.created_at,
      });

    const { error: donorTokenLinkError } = await supabase
      .from("donor_tokens")
      .update({ donation_id: donation.id })
      .eq("id", donorToken.id);
    if (donorTokenLinkError) throw donorTokenLinkError;

    const { error: attemptConfirmError } = await supabase
      .from("payment_attempts")
      .update({
        status: "confirmed",
        paypal_capture_id: capture.id,
        failure_reason: null,
        raw_payment: { ...attemptRawPayment, order, capture },
        confirmed_at: new Date().toISOString(),
      })
      .eq("paypal_order_id", orderId);
    if (attemptConfirmError) throw attemptConfirmError;

    return jsonResponse({
      donation: {
        ...donation,
        paymentRoute,
      },
      fortune: fortune?.message || null,
      digitalOrder: mapDigitalOrder(digitalOrder),
      seedComment: seedComment ? mapSeedComment(seedComment) : null,
      donorAccessToken: rawDonorToken,
      paymentRoute,
      productType: isRitualOrder ? "ritual" : isBookOrder ? "book" : "seed",
      product: book ? { id: book.id, title: book.title, itemName } : null,
    });
  } catch (error) {
    return errorResponse("Could not capture PayPal order.", 500, String(error));
  }
});
