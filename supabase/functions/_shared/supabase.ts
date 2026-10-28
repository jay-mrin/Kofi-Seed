import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { jsonResponse } from "./http.ts";

export type AdminRole = "admin" | "super_admin" | "standard";

export function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireAdmin(
  request: Request,
  options: {
    allowedRoles?: AdminRole[];
  } = {},
) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const allowedRoles = options.allowedRoles || ["admin"];

  if (!token) {
    throw jsonResponse({ error: "Missing admin bearer token." }, 401);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw jsonResponse({ error: "Invalid admin token." }, 401);
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_profiles")
    .select("user_id, email, display_name, role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !adminProfile) {
    throw jsonResponse({ error: "This account is not an admin." }, 403);
  }

  const role: AdminRole = (adminProfile.role as AdminRole) || "admin";

  if (!allowedRoles.includes(role)) {
    throw jsonResponse({ error: "This admin account cannot access this portal." }, 403);
  }

  return {
    supabase,
    user: data.user,
    adminProfile: {
      userId: adminProfile.user_id,
      email: adminProfile.email || data.user.email || "",
      displayName: adminProfile.display_name || "",
      role,
    },
  };
}

export async function hashText(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function createRandomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
