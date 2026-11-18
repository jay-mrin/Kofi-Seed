import { withCors, errorResponse, handleOptions, jsonResponse, readJson } from "../_shared/http.ts";
import { getPortalProfile, getSupabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return errorResponse("Method not allowed.", 405);

  try {
    const body = await readJson<{ username?: string; password?: string; refreshToken?: string }>(request);
    const supabase = getSupabaseAdmin();
    const refreshing = Object.hasOwn(body, "refreshToken");
    let result;
    let expectedUserId = "";

    if (refreshing) {
      if (typeof body.refreshToken !== "string" || !body.refreshToken || body.refreshToken.length > 4096 || body.username || body.password) {
        return errorResponse("Your session expired. Please sign in again.", 401);
      }
      result = await supabase.auth.refreshSession({ refresh_token: body.refreshToken });
    } else {
      const username = String(body.username || "").trim().toLowerCase();
      const password = body.password;
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
      if (!username || username.length > (isEmail ? 254 : 128) || typeof password !== "string" || !password || password.length > 1024) {
        return errorResponse("Invalid username or password.", 401);
      }

      let email = username;
      if (!isEmail) {
        const { data: profile, error: profileError } = await supabase
          .from("unified_payment_portal_profiles")
          .select("user_id, email")
          .eq("login_username", username)
          .maybeSingle();
        if (profileError) throw profileError;
        let loginProfile = profile;
        if (!loginProfile) {
          const { data: partner, error: partnerError } = await supabase
            .from("social_portal_profiles")
            .select("user_id, email")
            .eq("login_username", username)
            .maybeSingle();
          if (partnerError) throw partnerError;
          loginProfile = partner;
        }
        if (!loginProfile) return errorResponse("Invalid username or password.", 401);
        email = loginProfile.email;
        expectedUserId = loginProfile.user_id;
      }
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    const { data, error } = result;
    if (error) {
      if (error.status === 429) return errorResponse("Too many sign-in attempts. Please wait and try again.", 429);
      if (!error.status || error.status >= 500) return errorResponse("The sign-in service is temporarily unavailable. Please try again.", 503);
      return errorResponse(refreshing ? "Your session expired. Please sign in again." : "Invalid username or password.", 401);
    }
    if (!data?.session || !data.user?.id || (expectedUserId && data.user.id !== expectedUserId)) {
      return errorResponse(refreshing ? "Your session expired. Please sign in again." : "Invalid username or password.", 401);
    }

    // Authentication never grants a portal role. Recheck the current profile on
    // both login and refresh using the same authorization as protected endpoints.
    try {
      const { profile } = await getPortalProfile(new Request(request.url, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }));
      if (profile.userId !== data.user.id) return errorResponse("Invalid username or password.", 401);
    } catch (error) {
      if (error instanceof Response && [401, 403].includes(error.status)) return errorResponse("Invalid username or password.", 401);
      throw error;
    }

    const response = jsonResponse({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return errorResponse("The sign-in service is temporarily unavailable. Please try again.", 503);
  }
}));
