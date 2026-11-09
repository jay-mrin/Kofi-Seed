import {
  withCors,
  errorResponse,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/http.ts";
import { requireAdmin } from "../_shared/supabase.ts";

type UpdateOrderBody = {
  donationId?: string;
  socialSource?: string;
  fulfillmentStatus?: string;
  fulfillmentNote?: string;
  fulfilledAt?: string | null;
  purgeAll?: boolean;
  password?: string;
  fromDate?: string;
  toDate?: string;
  includePublicComments?: boolean;
};

// 4 November 2026, 00:00 Asia/Kolkata. Earlier orders stay outside social portals.
const SOCIAL_PORTAL_START = "2026-11-03T18:30:00.000Z";

type DeleteDonationBody = {
  donationId?: string;
  purgeAll?: boolean;
  password?: string;
};

function buildFulfillmentUpdate(
  body: UpdateOrderBody,
  fulfillmentStatus: "fulfilled" | "paid_awaiting_personalized_writing",
  requestedFulfilledAt: string,
) {
  return {
    fulfillment_status: fulfillmentStatus,
    ...(Object.hasOwn(body, "fulfillmentNote")
      ? { fulfillment_note: String(body.fulfillmentNote || "").trim().slice(0, 1200) || null }
      : {}),
    fulfilled_at: fulfillmentStatus === "fulfilled"
      ? new Date(requestedFulfilledAt).toISOString()
      : null,
  };
}

function isDateOnly(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getUtcDayStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function getUtcNextDayStart(value: string) {
  const date = getUtcDayStart(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function getCalendarMonthRange(month: string, startOffset: number, endOffset: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  if (monthIndex < 1 || monthIndex > 12 ||
      ![startOffset, endOffset].every((offset) => Number.isInteger(offset) && Math.abs(offset) <= 840)) {
    throw new Error("Invalid calendar month or timezone offset.");
  }
  return {
    start: new Date(Date.UTC(year, monthIndex - 1, 1) + startOffset * 60_000).toISOString(),
    end: new Date(Date.UTC(year, monthIndex, 1) + endOffset * 60_000).toISOString(),
  };
}

async function loadCalendarDonations(query: any) {
  const donationsById = new Map<string, Record<string, any>>();
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data || []) as Array<Record<string, any>>;
    for (const donation of page) donationsById.set(String(donation.id), donation);
    if (page.length < pageSize) break;
  }
  return Array.from(donationsById.values());
}

function applyDateRange(query: any, fromDate: string, toDate: string) {
  let nextQuery = query;
  if (fromDate) {
    nextQuery = nextQuery.gte(
      "created_at",
      getUtcDayStart(fromDate).toISOString(),
    );
  }
  if (toDate) {
    nextQuery = nextQuery.lt(
      "created_at",
      getUtcNextDayStart(toDate).toISOString(),
    );
  }
  return nextQuery;
}

function applyAdminDonationScope(query: any, role: "admin" | "super_admin") {
  if (role === "super_admin") {
    return query
      .eq("payment_route", "superadmin")
      .eq("visibility_scope", "superadmin_private")
      .eq("payment_method", "paypal");
  }

  return query
    .eq("payment_route", "standard")
    .eq("visibility_scope", "public")
    .in("payment_method", ["paypal", "dodo"]);
}

function mapDigitalOrder(value: any) {
  const order = Array.isArray(value) ? value[0] : value;

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.order_number,
    donationId: order.donation_id,
    paypalOrderId: order.paypal_order_id,
    paypalCaptureId: order.paypal_capture_id,
    provider: order.payment_provider,
    providerOrderId: order.provider_order_id,
    providerTransactionId: order.provider_transaction_id,
    customerName: order.customer_name,
    contactEmail: order.contact_email,
    payerEmail: order.payer_email,
    amount: Number(order.amount),
    currency: order.currency,
    itemName: order.item_name,
    redeemedBookTitle: order.redeemed_book_title,
    personalizedRequest: order.personalized_request,
    blessingMessage: order.blessing_message,
    fulfillmentStatus: order.fulfillment_status,
    fulfillmentNote: order.fulfillment_note,
    fulfilledAt: order.fulfilled_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { supabase, adminProfile } = await requireAdmin(request, {
      allowedRoles: ["admin", "super_admin"],
    });
    const url = new URL(request.url);

    if (request.method === "PUT") {
      const body = await readJson<UpdateOrderBody>(request);
      if (Object.hasOwn(body, "socialSource")) {
        if (adminProfile.role !== "admin" && adminProfile.role !== "super_admin") {
          return errorResponse("This account cannot assign an order to a social portal.", 403);
        }
        const donationId = String(body.donationId || "").trim();
        const socialSource = body.socialSource;
        if (!donationId || (socialSource !== "anshu" && socialSource !== "badal")) {
          return errorResponse("Choose an order and either Anshu or Badal.", 422);
        }

        const paymentRoute = adminProfile.role === "admin" ? "standard" : "superadmin";
        const visibilityScope = adminProfile.role === "admin" ? "public" : "superadmin_private";
        const { data, error } = await supabase.from("donations")
          .update({ social_source: socialSource, social_source_manually_assigned: true })
          .eq("id", donationId)
          .eq("payment_route", paymentRoute)
          .eq("visibility_scope", visibilityScope)
          .eq("payment_method", "paypal")
          .eq("paypal_status", "COMPLETED")
          .gte("created_at", SOCIAL_PORTAL_START)
          .select("id, social_source")
          .maybeSingle();
        if (error) throw error;
        if (!data) return errorResponse("This order cannot be assigned to a social portal.", 404);
        return jsonResponse({ donationId: data.id, socialSource: data.social_source });
      }
      if (body.purgeAll) {
        if (adminProfile.role !== "super_admin") {
          return errorResponse(
            "Only superadmins can erase all payment records.",
            403,
          );
        }
        const purgePassword = Deno.env.get("SUPERADMIN_PURGE_PASSWORD");
        if (!purgePassword) {
          return errorResponse(
            "Global purge is not configured. Set SUPERADMIN_PURGE_PASSWORD first.",
            503,
          );
        }
        if (String(body.password || "") !== purgePassword) {
          return errorResponse("Incorrect purge password.", 403);
        }

        const fromDate = String(body.fromDate || "").trim();
        const toDate = String(body.toDate || "").trim();
        const includePublicComments = body.includePublicComments === true;

        if (fromDate && !isDateOnly(fromDate)) {
          return errorResponse("From date must use YYYY-MM-DD.", 422);
        }
        if (toDate && !isDateOnly(toDate)) {
          return errorResponse("To date must use YYYY-MM-DD.", 422);
        }
        if (
          fromDate && toDate &&
          getUtcDayStart(fromDate).getTime() > getUtcDayStart(toDate).getTime()
        ) {
          return errorResponse("From date cannot be after to date.", 422);
        }

        const { data: donationsToPurge, error: donationsToPurgeError } =
          await applyDateRange(
            supabase.from("donations").select(
              "id, donor_token_id, paypal_order_id, dodo_checkout_session_id, dodo_payment_id",
            ),
            fromDate,
            toDate,
          );
        if (donationsToPurgeError) throw donationsToPurgeError;

        const donationIds = (donationsToPurge || []).map((
          donation: { id: string },
        ) => donation.id).filter(Boolean);
        const donorTokenIds = (donationsToPurge || [])
          .map((donation: { donor_token_id?: string | null }) =>
            donation.donor_token_id
          )
          .filter(Boolean);
        const paypalOrderIds = (donationsToPurge || [])
          .map((donation: { paypal_order_id?: string | null }) =>
            donation.paypal_order_id
          )
          .filter(Boolean);
        const dodoSessionIds = (donationsToPurge || [])
          .map((donation: { dodo_checkout_session_id?: string | null }) =>
            donation.dodo_checkout_session_id
          )
          .filter(Boolean);
        const dodoPaymentIds = (donationsToPurge || [])
          .map((donation: { dodo_payment_id?: string | null }) =>
            donation.dodo_payment_id
          )
          .filter(Boolean);

        if (!includePublicComments) {
          if (donationIds.length) {
            const { error: unlinkSeedCommentsError } = await supabase
              .from("seed_comments")
              .update({ donation_id: null })
              .in("donation_id", donationIds);
            if (unlinkSeedCommentsError) throw unlinkSeedCommentsError;
          }

          if (donationIds.length) {
            const { error: unlinkDonorTokensError } = await supabase
              .from("donor_tokens")
              .update({ donation_id: null })
              .in("donation_id", donationIds);
            if (unlinkDonorTokensError) throw unlinkDonorTokensError;
          }
        } else {
          const { error: seedCommentsError } = await applyDateRange(
            supabase.from("seed_comments").delete(),
            fromDate,
            toDate,
          ).not("id", "is", null);
          if (seedCommentsError) throw seedCommentsError;

        }

        if (donationIds.length) {
          const { error: orderError } = await supabase.from("digital_orders")
            .delete().in("donation_id", donationIds);
          if (orderError) throw orderError;

          if (paypalOrderIds.length) {
            const { error: paymentAttemptError } = await supabase
              .from("payment_attempts")
              .delete()
              .in("paypal_order_id", paypalOrderIds);
            if (paymentAttemptError) throw paymentAttemptError;
          }

          if (dodoSessionIds.length) {
            const { error: dodoAttemptError } = await supabase
              .from("payment_attempts")
              .delete()
              .in("dodo_checkout_session_id", dodoSessionIds);
            if (dodoAttemptError) throw dodoAttemptError;
          }

          if (dodoPaymentIds.length) {
            const { error: dodoWebhookError } = await supabase
              .from("dodo_webhook_events")
              .delete()
              .in("dodo_payment_id", dodoPaymentIds);
            if (dodoWebhookError) throw dodoWebhookError;
          }

          const { error: donationError } = await supabase.from("donations")
            .delete().in("id", donationIds);
          if (donationError) throw donationError;
        }

        if (includePublicComments && donorTokenIds.length) {
          const { error: donorTokensError } = await supabase.from(
            "donor_tokens",
          ).delete().in("id", donorTokenIds);
          if (donorTokensError) throw donorTokensError;
        }

        const { error: eventsError } = await applyDateRange(
          supabase.from("checkout_events").delete(),
          fromDate,
          toDate,
        ).not(
          "id",
          "is",
          null,
        );
        if (eventsError) throw eventsError;

        return jsonResponse({
          success: true,
          purged: true,
          range: { fromDate: fromDate || null, toDate: toDate || null },
          includePublicComments,
          deletedPaymentRecords: donationIds.length,
        });
      }

      const donationId = String(body.donationId || "").trim();
      const fulfillmentStatus = body.fulfillmentStatus === "fulfilled"
        ? "fulfilled"
        : "paid_awaiting_personalized_writing";
      const requestedFulfilledAt = String(body.fulfilledAt || "").trim();

      if (
        fulfillmentStatus === "fulfilled" &&
        (!requestedFulfilledAt ||
          Number.isNaN(Date.parse(requestedFulfilledAt)))
      ) {
        return errorResponse(
          "A valid fulfillment date and time is required.",
          422,
        );
      }

      if (!donationId) return errorResponse("Order id is required.", 422);

      let donationQuery = supabase
        .from("donations")
        .select("id")
        .eq("id", donationId);

      donationQuery = applyAdminDonationScope(donationQuery, adminProfile.role);

      const { data: donation, error: donationError } = await donationQuery
        .maybeSingle();

      if (donationError) throw donationError;
      if (!donation) return errorResponse("Order record not found.", 404);

      const { data, error } = await supabase
        .from("digital_orders")
        .update(buildFulfillmentUpdate(body, fulfillmentStatus, requestedFulfilledAt))
        .eq("donation_id", donationId)
        .select(
          "id, order_number, donation_id, payment_provider, provider_order_id, provider_transaction_id, paypal_order_id, paypal_capture_id, customer_name, contact_email, payer_email, amount, currency, item_name, redeemed_book_title, personalized_request, blessing_message, fulfillment_status, fulfillment_note, fulfilled_at, created_at, updated_at",
        )
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return errorResponse(
          "Digital order not found for this payment record.",
          404,
        );
      }

      return jsonResponse({ order: mapDigitalOrder(data) });
    }

    if (request.method === "DELETE") {
      const body = await readJson<DeleteDonationBody>(request);
      const donationId = String(body.donationId || "").trim();

      if (!donationId) return errorResponse("Order id is required.", 422);

      let donationQuery = supabase
        .from("donations")
        .select("id, paypal_order_id, dodo_checkout_session_id, dodo_payment_id")
        .eq("id", donationId);

      donationQuery = applyAdminDonationScope(donationQuery, adminProfile.role);

      const { data: donation, error: donationError } = await donationQuery
        .maybeSingle();

      if (donationError) throw donationError;
      if (!donation) return errorResponse("Order record not found.", 404);

      const { error: commentDeleteError } = await supabase.from("seed_comments")
        .delete().eq("donation_id", donationId);
      if (commentDeleteError) throw commentDeleteError;

      const { error: orderDeleteError } = await supabase.from("digital_orders")
        .delete().eq("donation_id", donationId);
      if (orderDeleteError) throw orderDeleteError;

      if (donation.paypal_order_id) {
        const { error: paymentAttemptDeleteError } = await supabase
          .from("payment_attempts")
          .delete()
          .eq("paypal_order_id", donation.paypal_order_id);
        if (paymentAttemptDeleteError) throw paymentAttemptDeleteError;
      }

      if (donation.dodo_checkout_session_id) {
        const { error: paymentAttemptDeleteError } = await supabase
          .from("payment_attempts")
          .delete()
          .eq("dodo_checkout_session_id", donation.dodo_checkout_session_id);
        if (paymentAttemptDeleteError) throw paymentAttemptDeleteError;
      }

      if (donation.dodo_payment_id) {
        const { error: webhookDeleteError } = await supabase
          .from("dodo_webhook_events")
          .delete()
          .eq("dodo_payment_id", donation.dodo_payment_id);
        if (webhookDeleteError) throw webhookDeleteError;
      }

      const { error: deleteError } = await supabase.from("donations").delete()
        .eq("id", donationId);
      if (deleteError) throw deleteError;

      return jsonResponse({ success: true, donationId });
    }

    if (request.method !== "GET") {
      return errorResponse("Method not allowed.", 405);
    }

    const month = url.searchParams.get("month");
    let query = supabase
      .from("donations")
      .select(
        [
          "id",
          "display_name",
          "amount",
          "seed_count",
          "frequency",
          "supporter_message",
          "payment_method",
          "paypal_status",
          "paypal_order_id",
          "paypal_capture_id",
          "paypal_payer_email",
          "dodo_checkout_session_id",
          "dodo_payment_id",
          "payment_route",
          "visibility_scope",
          "social_source",
          "social_source_manually_assigned",
          "fortune_message",
          "raw_payment",
          "created_at",
          "digital_orders(id, order_number, donation_id, payment_provider, provider_order_id, provider_transaction_id, paypal_order_id, paypal_capture_id, customer_name, contact_email, payer_email, amount, currency, item_name, redeemed_book_title, personalized_request, blessing_message, fulfillment_status, fulfillment_note, fulfilled_at, created_at, updated_at)",
        ].join(", "),
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    query = applyAdminDonationScope(query, adminProfile.role);

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) return errorResponse("Invalid calendar month.", 422);
      let range;
      try {
        range = getCalendarMonthRange(
          month,
          Number(url.searchParams.get("startOffset") || 0),
          Number(url.searchParams.get("endOffset") || 0),
        );
      } catch {
        return errorResponse("Invalid calendar month or timezone offset.", 422);
      }
      query = query.gte("created_at", range.start).lt("created_at", range.end);
    }

    const donations = await loadCalendarDonations(query);

    return jsonResponse({
      donations: donations.map((donation) => ({
        id: donation.id,
        name: donation.display_name,
        amount: Number(donation.amount),
        seedCount: donation.seed_count,
        frequency: donation.frequency,
        message: donation.supporter_message,
        paymentMethod: donation.payment_method,
        status: donation.paypal_status,
        orderId: donation.dodo_checkout_session_id || donation.paypal_order_id,
        captureId: donation.dodo_payment_id || donation.paypal_capture_id,
        payerEmail: donation.paypal_payer_email,
        paymentRoute: donation.payment_route || "standard",
        visibilityScope: donation.visibility_scope || "public",
        socialSource: donation.social_source || null,
        socialSourceManuallyAssigned: donation.social_source_manually_assigned === true,
        fortuneMessage: donation.fortune_message,
        rawPayment: donation.raw_payment,
        digitalOrder: mapDigitalOrder(donation.digital_orders),
        createdAt: donation.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not load admin donations.", 500, String(error));
  }
}));
