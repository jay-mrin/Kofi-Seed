import { withCors, errorResponse, handleOptions, jsonResponse, readJson } from "../_shared/http.ts";
import { finalizeDodoPayment } from "../_shared/dodo-orders.ts";

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return errorResponse("Method not allowed.", 405);
  try {
    const body = await readJson<{ paymentId?: string; donorAccessToken?: string }>(request);
    return jsonResponse(await finalizeDodoPayment(
      String(body.paymentId || ""),
      String(body.donorAccessToken || ""),
    ));
  } catch (error) {
    const status = Number((error as Error & { status?: number })?.status) || 500;
    return errorResponse(
      status === 422 ? "Dodo payment is not complete." : "Could not confirm Dodo payment.",
      status,
      String(error),
    );
  }
}));
