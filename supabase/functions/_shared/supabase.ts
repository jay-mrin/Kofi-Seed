import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { jsonResponse } from "./http.ts";

export type AdminRole = "admin" | "super_admin";
export type SocialPortalSource = "anshu" | "badal";

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

export async function getPortalProfile(request: Request) {
  const token = (request.headers.get("Authorization") || "")
    .replace(/^Bearer\s+/i, "").trim();
  if (!token) throw jsonResponse({ error: "Missing portal bearer token." }, 401);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw jsonResponse({ error: "Invalid portal token." }, 401);
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_profiles")
    .select("user_id, email, display_name, role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (adminError) throw adminError;
  if (adminProfile) {
    if (!["admin", "super_admin"].includes(adminProfile.role)) {
      throw jsonResponse({ error: "This account cannot access a portal." }, 403);
    }
    return {
      supabase,
      profile: {
        userId: adminProfile.user_id,
        email: adminProfile.email || data.user.email || "",
        displayName: adminProfile.display_name || "",
        role: adminProfile.role as AdminRole,
      },
    };
  }

  const { data: socialProfile, error: socialError } = await supabase
    .from("social_portal_profiles")
    .select("user_id, email, display_name, social_source")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (socialError) throw socialError;
  if (!socialProfile) {
    throw jsonResponse({ error: "This account cannot access a portal." }, 403);
  }
  if (!["anshu", "badal"].includes(socialProfile.social_source)) {
    throw jsonResponse({ error: "This social portal is unavailable." }, 403);
  }

  return {
    supabase,
    profile: {
      userId: socialProfile.user_id,
      email: socialProfile.email || data.user.email || "",
      displayName: socialProfile.display_name,
      role: "social_partner" as const,
      socialSource: socialProfile.social_source as SocialPortalSource,
    },
  };
}

export async function requireSocialPortal(request: Request) {
  const result = await getPortalProfile(request);
  if (result.profile.role !== "social_partner") {
    throw jsonResponse({ error: "This account cannot access a social portal." }, 403);
  }
  return {
    supabase: result.supabase,
    socialSource: result.profile.socialSource,
    profile: result.profile,
  };
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
