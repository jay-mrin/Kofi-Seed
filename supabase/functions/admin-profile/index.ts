import { errorResponse, handleOptions, jsonResponse } from "../_shared/http.ts";
import { requireAdmin } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { adminProfile } = await requireAdmin(request, { allowedRoles: ["admin", "super_admin", "standard"] });

    return jsonResponse({
      profile: adminProfile,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not load admin profile.", 500, String(error));
  }
});
