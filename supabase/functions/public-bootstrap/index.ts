import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { getPayPalClientId } from "../_shared/paypal.ts";
import { getSupabaseAdmin, hashText } from "../_shared/supabase.ts";

function getUtcHourStart(date = new Date()) {
  const hour = new Date(date);
  hour.setUTCMinutes(0, 0, 0);
  return hour.toISOString();
}

function getIndiaDayStart(date = new Date()) {
  const indiaOffsetMilliseconds = 5.5 * 60 * 60 * 1000;
  const indiaDate = new Date(date.getTime() + indiaOffsetMilliseconds);
  return new Date(Date.UTC(
    indiaDate.getUTCFullYear(),
    indiaDate.getUTCMonth(),
    indiaDate.getUTCDate(),
  ) - indiaOffsetMilliseconds).toISOString();
}

function sanitizePath(value: string | null) {
  const path = String(value || "/").trim();

  if (!path || path.includes("://")) return "/";

  return path.slice(0, 180);
}

async function recordPageView(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  request: Request,
  visitorKeyHash: string,
  path: string,
  paymentRoute: "standard" | "superadmin",
) {
  if (!visitorKeyHash) return;

  const { error } = await supabase.from("page_views").upsert(
    {
      visitor_key_hash: visitorKeyHash,
      view_hour: getUtcHourStart(),
      path,
      payment_route: paymentRoute,
      user_agent: (request.headers.get("user-agent") || "").slice(0, 220),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "visitor_key_hash,view_hour" },
  );

  if (error) throw error;
}

async function loadCriticalData(
  supabase: ReturnType<typeof getSupabaseAdmin>,
) {
  const { data: settingsRow, error: settingsError } = await supabase
    .from("site_settings")
    .select("settings")
    .eq("id", true)
    .maybeSingle();
  if (settingsError) throw settingsError;

  const settings = settingsRow?.settings &&
      typeof settingsRow.settings === "object"
    ? settingsRow.settings
    : {};
  return {
    settings,
    payment: {
      superAdminPayPalClientId: getPayPalClientId("superadmin"),
      currency: Deno.env.get("PAYPAL_CURRENCY") || "USD",
      env: Deno.env.get("PAYPAL_ENV") || "sandbox",
    },
  };
}

async function loadPublicContent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
) {
  const [donationsResult, seedCommentsResult, goalTotalResult] = await Promise.all([
    supabase
      .from("donations")
      .select(
        "id, display_name, amount, seed_count, frequency, supporter_message, paypal_status, created_at, payment_route, visibility_scope, payment_method, raw_payment",
      )
      .eq("paypal_status", "COMPLETED")
      .eq("payment_route", "standard")
      .gte("created_at", getIndiaDayStart())
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("seed_comments")
      .select(
        "id, display_name, body, amount, seed_count, source, created_at, donations(payment_route, visibility_scope, payment_method, raw_payment)",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.rpc("get_confirmed_seed_total_cents"),
  ]);

  if (donationsResult.error) throw donationsResult.error;
  if (seedCommentsResult.error) throw seedCommentsResult.error;
  if (goalTotalResult.error) throw goalTotalResult.error;

  const confirmedSeedDonations = (donationsResult.data || [])
    .filter((donation) => {
      if (!["paypal", "dodo"].includes(donation.payment_method)) return false;
      const rawPayment =
        donation.raw_payment && typeof donation.raw_payment === "object"
          ? donation.raw_payment
          : {};
      return rawPayment.mode !== "test" && rawPayment.product?.type !== "book";
    });
  const goalAmountCents = 70000;
  const confirmedAmountCents = Math.max(Number(goalTotalResult.data) || 0, 0) % goalAmountCents;
  const confirmedSeedCount = Math.floor(confirmedAmountCents / 700);
  const donations = confirmedSeedDonations
    .filter((donation) => donation.visibility_scope === "public")
    .slice(0, 50);
  const seedComments = (seedCommentsResult.data || []).filter(
    (comment: Record<string, any>) => {
      if (comment.source === "legacy") return true;
      const donation = Array.isArray(comment.donations)
        ? comment.donations[0]
        : comment.donations;
      if (!donation) return true;
      if (
        donation.visibility_scope !== "public" ||
        !["paypal", "dodo"].includes(donation.payment_method)
      ) return false;
      const rawPayment =
        donation.raw_payment && typeof donation.raw_payment === "object"
          ? donation.raw_payment
          : {};
      return rawPayment.mode !== "test";
    },
  ).slice(0, 520);

  return {
    goalProgress: {
      confirmedSeedCount,
      goalSeedCount: 100,
      confirmedAmountCents,
      goalAmountCents,
      percentage: confirmedAmountCents / 700,
    },
    donations: donations.map((donation) => ({
      id: donation.id,
      name: donation.display_name,
      amount: Number(donation.amount),
      frequency: donation.frequency,
      message: donation.supporter_message,
      createdAt: donation.created_at,
    })),
    seedComments: seedComments.map((comment) => ({
      id: comment.id,
      name: comment.display_name,
      text: comment.body,
      amount: comment.amount === null ? null : Number(comment.amount),
      seedCount: comment.seed_count,
      source: comment.source,
      createdAt: comment.created_at,
    })),
  };
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const url = new URL(request.url);
    const requestedMode = url.searchParams.get("mode");
    const mode = requestedMode === "critical" || requestedMode === "content"
      ? requestedMode
      : "full";
    const visitorKey = url.searchParams.get("visitorKey") || "";
    const path = sanitizePath(url.searchParams.get("path"));
    const paymentRoute = "superadmin";
    const supabase = getSupabaseAdmin();
    const criticalDataPromise = mode === "content"
      ? Promise.resolve(null)
      : loadCriticalData(supabase);

    if (mode === "critical") {
      return jsonResponse(await criticalDataPromise);
    }

    const visitorKeyHash = visitorKey ? await hashText(visitorKey) : "";
    const pageViewPromise = recordPageView(
      supabase,
      request,
      visitorKeyHash,
      path,
      paymentRoute,
    ).catch((pageViewError) => {
      console.error("Could not record page view.", pageViewError);
    });
    const [criticalData, contentData] = await Promise.all([
      criticalDataPromise,
      loadPublicContent(supabase),
      pageViewPromise,
    ]);

    return jsonResponse(
      mode === "content"
        ? contentData
        : { ...(criticalData || {}), ...contentData },
    );
  } catch (error) {
    return errorResponse("Could not load public data.", 500, String(error));
  }
});
