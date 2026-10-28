import { withCors, errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { requireAdmin } from "../_shared/supabase.ts";

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
    const start = new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString();
    const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString();
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

    return jsonResponse({ transactions });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not load successful transactions.", 500, String(error));
  }
}));
