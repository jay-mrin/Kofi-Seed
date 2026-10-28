import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const PAGE_SIZE = 40;

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "GET") return errorResponse("Method not allowed.", 405);

  try {
    const offsetText = new URL(request.url).searchParams.get("offset") || "0";
    if (!/^(0|[1-9]\d*)$/.test(offsetText) || Number(offsetText) > 100000) {
      return errorResponse("Invalid transaction offset.", 422);
    }
    const offset = Number(offsetText);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("donations")
      .select("id, display_name, seed_count, raw_payment")
      .eq("paypal_status", "COMPLETED")
      .eq("payment_route", "standard")
      .eq("visibility_scope", "public")
      .in("payment_method", ["paypal", "dodo"])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = data || [];
    return jsonResponse({
      transactions: rows
        .filter((row) => row.raw_payment?.mode !== "test")
        .map((row) => ({ name: row.display_name, seedCount: Number(row.seed_count) })),
      nextOffset: rows.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
    });
  } catch (error) {
    return errorResponse("Could not load recent transactions.", 500, String(error));
  }
});
