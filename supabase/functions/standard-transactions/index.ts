import { withCors, errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { requireAdmin } from "../_shared/supabase.ts";

// Order placement cutoff: 4 November 2026, 00:00 Asia/Kolkata.
const SUPERADMIN_PREVIEW_START = "2026-11-03T18:30:00.000Z";

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { supabase } = await requireAdmin(request, { allowedRoles: ["standard"] });
    if (request.method !== "GET") return errorResponse("Method not allowed.", 405);

    const month = new URL(request.url).searchParams.get("month") || "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return errorResponse("Month must use YYYY-MM.", 422);
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const indiaOffset = 330 * 60_000;
    const start = new Date(Date.UTC(year, monthNumber - 1, 1) - indiaOffset).toISOString();
    const end = new Date(Date.UTC(year, monthNumber, 1) - indiaOffset).toISOString();
    const transactions: Array<{ name: string; amount: number; createdAt: string }> = [];

    for (let offset = 0;; offset += 500) {
      const { data, error } = await supabase.from("donations")
        .select("display_name, amount, created_at")
        .eq("paypal_status", "COMPLETED")
        .eq("payment_route", "standard")
        .eq("visibility_scope", "public")
        .in("payment_method", ["paypal", "dodo"])
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: true })
        .range(offset, offset + 499);
      if (error) throw error;
      transactions.push(...(data || []).map((row) => ({
        name: row.display_name,
        amount: Number(row.amount),
        createdAt: row.created_at,
      })));
      if (!data || data.length < 500) break;
    }

    const { data: settingsRow, error: settingsError } = await supabase
      .from("site_settings").select("settings").eq("id", true).maybeSingle();
    if (settingsError) throw settingsError;
    const previewEnabled = settingsRow?.settings?.superAdminStandardPreviewEnabled !== false &&
      settingsRow?.settings?.superAdminStandardPreviewEnabled !== "false";

    if (previewEnabled && end > SUPERADMIN_PREVIEW_START) {
      for (let offset = 0;; offset += 500) {
        const { data, error } = await supabase.from("donations")
          .select("display_name, amount, created_at, digital_orders!inner(fulfillment_status)")
          .eq("paypal_status", "COMPLETED")
          .eq("payment_route", "superadmin")
          .eq("visibility_scope", "superadmin_private")
          .eq("payment_method", "paypal")
          .eq("digital_orders.fulfillment_status", "fulfilled")
          .gte("created_at", SUPERADMIN_PREVIEW_START)
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + 499);
        if (error) throw error;
        transactions.push(...(data || []).map((row) => ({
          name: row.display_name,
          amount: Number(row.amount),
          createdAt: row.created_at,
        })));
        if (!data || data.length < 500) break;
      }
    }

    transactions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return jsonResponse({ transactions });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not load successful transactions.", 500, String(error));
  }
}));
