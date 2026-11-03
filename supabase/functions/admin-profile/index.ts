import { withCors, errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { getPortalProfile } from "../_shared/supabase.ts";
import { getPayPalClientId } from "../_shared/paypal.ts";

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { profile } = await getPortalProfile(request);

    return jsonResponse({
      profile,
      ...(profile.role === "super_admin"
        ? { payment: { superAdminPayPalClientId: getPayPalClientId("superadmin") } }
        : {}),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not load admin profile.", 500, String(error));
  }
}));
