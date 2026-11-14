import { withCors, errorResponse, handleOptions, jsonResponse, readJson } from "../_shared/http.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return errorResponse("Method not allowed.", 405);

  try {
    const body = await readJson<{ username?: string; password?: string }>(request);
    const username = String(body.username || "").trim().toLowerCase();
    const password = body.password;
    if (!username || username.length > 128 || typeof password !== "string" || !password || password.length > 1024) {
      return errorResponse("Invalid username or password.", 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from("unified_payment_portal_profiles")
      .select("user_id, email")
      .eq("login_username", username)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return errorResponse("Invalid username or password.", 401);

    const { data, error } = await supabase.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.session || data.user?.id !== profile.user_id) {
      return errorResponse("Invalid username or password.", 401);
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
    return errorResponse("Could not sign in.", 500);
  }
}));
