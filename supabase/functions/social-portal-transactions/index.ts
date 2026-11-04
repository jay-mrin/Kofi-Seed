import { withCors, errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { requireSocialPortal } from "../_shared/supabase.ts";

// 4 November 2026, 00:00 Asia/Kolkata. Existing orders stay unchanged.
const SOCIAL_PORTAL_START = "2026-11-03T18:30:00.000Z";
const IST_OFFSET_MS = 330 * 60_000;

function getPayPalNetAmount(rawPayment: any, captureId: string): number | null {
  if (!captureId || !rawPayment || typeof rawPayment !== "object") return null;
  const purchaseUnits = Array.isArray(rawPayment.order?.purchase_units)
    ? rawPayment.order.purchase_units
    : [];
  const orderCaptures = purchaseUnits.flatMap((unit: any) =>
    Array.isArray(unit?.payments?.captures) ? unit.payments.captures : []);
  const candidates = [
    ...orderCaptures,
    rawPayment.capture,
    rawPayment.webhook?.resource,
  ];
  for (const capture of candidates) {
    if (capture?.id !== captureId) continue;
    const net = capture.seller_receivable_breakdown?.net_amount;
    if (net?.currency_code !== "USD" ||
        typeof net.value !== "string" ||
        !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(net.value)) continue;
    const amount = Number(net.value);
    if (Number.isFinite(amount)) return amount;
  }
  return null;
}

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== "GET") return errorResponse("Method not allowed.", 405);
    const { supabase, socialSource } = await requireSocialPortal(request);
    const month = new URL(request.url).searchParams.get("month") || "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return errorResponse("Month must use YYYY-MM.", 422);
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1) - IST_OFFSET_MS).toISOString();
    const end = new Date(Date.UTC(year, monthNumber, 1) - IST_OFFSET_MS).toISOString();
    if (end <= SOCIAL_PORTAL_START) return jsonResponse({ transactions: [] });

    const transactions: Array<{ name: string; amount: number; netAmount: number | null; email: string; createdAt: string }> = [];
    for (let offset = 0;; offset += 500) {
      const { data, error } = await supabase.from("donations")
        .select("display_name, amount, created_at, paypal_payer_email, paypal_capture_id, raw_payment, digital_orders(contact_email)")
        .eq("social_source", socialSource)
        .eq("payment_method", "paypal")
        .eq("paypal_status", "COMPLETED")
        .in("payment_route", ["standard", "superadmin"])
        .in("visibility_scope", ["public", "superadmin_private"])
        .gte("created_at", SOCIAL_PORTAL_START)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + 499);
      if (error) throw error;

      for (const row of data || []) {
        const order = Array.isArray(row.digital_orders)
          ? row.digital_orders[0]
          : row.digital_orders;
        transactions.push({
          name: row.display_name,
          amount: Number(row.amount),
          netAmount: getPayPalNetAmount(row.raw_payment, row.paypal_capture_id),
          email: order?.contact_email || row.paypal_payer_email || "",
          createdAt: row.created_at,
        });
      }
      if (!data || data.length < 500) break;
    }

    return jsonResponse({ transactions });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not load social portal orders.", 500, String(error));
  }
}));
