import { withCors, errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { requireUnifiedPaymentPortal } from "../_shared/supabase.ts";
import { isSocialAssignmentApproved, SOCIAL_HIGH_VALUE_EXCLUSION_START } from "../_shared/social-source.ts";

// Match the four partner portals' existing history and eligibility exactly.
const SOCIAL_PORTAL_START = "2026-11-03T18:30:00.000Z";
const IST_OFFSET_MS = 330 * 60_000;

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== "GET") return errorResponse("Method not allowed.", 405);
    const { supabase } = await requireUnifiedPaymentPortal(request);
    const month = new URL(request.url).searchParams.get("month") || "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return errorResponse("Month must use YYYY-MM.", 422);
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1) - IST_OFFSET_MS).toISOString();
    const end = new Date(Date.UTC(year, monthNumber, 1) - IST_OFFSET_MS).toISOString();
    if (end <= SOCIAL_PORTAL_START) return jsonResponse({ transactions: [] });

    const transactions: Array<{ name: string; amount: number; email: string; createdAt: string; socialSource: string }> = [];
    for (let offset = 0;; offset += 500) {
      const { data, error } = await supabase.from("donations")
        .select("display_name, amount, created_at, social_source, paypal_payer_email, digital_orders(contact_email)")
        .in("social_source", ["anshu", "badal", "rohit", "alok"])
        .or(`amount.lt.55,and(social_source.in.(anshu,badal),created_at.lt.${SOCIAL_HIGH_VALUE_EXCLUSION_START})`)
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
        if (!isSocialAssignmentApproved(row)) continue;
        const order = Array.isArray(row.digital_orders) ? row.digital_orders[0] : row.digital_orders;
        transactions.push({
          name: row.display_name,
          amount: Number(row.amount),
          email: order?.contact_email || row.paypal_payer_email || "",
          createdAt: row.created_at,
          socialSource: row.social_source,
        });
      }
      if (!data || data.length < 500) break;
    }

    return jsonResponse({ transactions });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not load unified portal orders.", 500);
  }
}));
