import {
  withCors,
  errorResponse,
  handleOptions,
  jsonResponse,
  readJson,
} from "../_shared/http.ts";
import { requireAdmin } from "../_shared/supabase.ts";

const ACTIVE_SETTING_KEYS = [
  "profileTitle",
  "followersText",
  "aboutTitle",
  "aboutCollapsed",
  "aboutExpanded",
  "topicLabel",
  "supportTitle",
  "seedPrice",
  "blessingWallEnabled",
  "dodoCheckoutVisible",
  "paypalCheckoutVisible",
  "homepagePayPalRoute",
  "alternateCardCheckoutVisible",
] as const;

function keepActiveSettings(settings: Record<string, unknown>) {
  const activeSettings: Record<string, unknown> = {};

  for (const key of ACTIVE_SETTING_KEYS) {
    if (Object.hasOwn(settings, key)) activeSettings[key] = settings[key];
  }

  return activeSettings;
}

function isEnabled(value: unknown) {
  return value === true || value === "true";
}

function checkoutVisibility(
  settings: Record<string, unknown>,
  key: "dodoCheckoutVisible" | "paypalCheckoutVisible" | "alternateCardCheckoutVisible",
) {
  const value = Object.hasOwn(settings, key)
    ? settings[key]
    : key === "dodoCheckoutVisible" ? settings.mockCheckoutVisible : false;
  return value !== false && value !== "false";
}

function selectedCheckout(settings: Record<string, unknown>) {
  return {
    dodoCheckoutVisible: false,
    paypalCheckoutVisible: true,
    homepagePayPalRoute: settings.homepagePayPalRoute === "superadmin" ? "superadmin" : "standard",
  };
}

function applySiteSettings(
  existing: Record<string, unknown>,
  submitted: Record<string, unknown>,
) {
  const next = { ...existing };

  if (Object.hasOwn(submitted, "seedPrice")) {
    next.seedPrice = Math.max(
      Number.parseInt(String(submitted.seedPrice), 10) || 11,
      11,
    );
  }
  if (Object.hasOwn(submitted, "blessingWallEnabled")) {
    next.blessingWallEnabled = submitted.blessingWallEnabled !== false &&
      submitted.blessingWallEnabled !== "false";
  }

  return next;
}

Deno.serve(withCors(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { supabase, adminProfile } = await requireAdmin(request, {
      allowedRoles: ["admin", "super_admin"],
    });

    if (request.method === "GET") {
      const { data, error } = await supabase.from("site_settings").select(
        "settings",
      ).eq("id", true).single();
      if (error) throw error;
      const saved = data.settings as Record<string, unknown>;
      return jsonResponse({
        settings: {
          ...keepActiveSettings(saved),
          ...selectedCheckout(saved),
          alternateCardCheckoutVisible: checkoutVisibility(saved, "alternateCardCheckoutVisible"),
        },
      });
    }

    if (request.method !== "POST" && request.method !== "PUT") {
      return errorResponse("Method not allowed.", 405);
    }

    const body = await readJson<{ settings?: Record<string, unknown> }>(
      request,
    );
    if (!body.settings || typeof body.settings !== "object") {
      return errorResponse("Settings payload is required.", 422);
    }

    const { data: current, error: currentError } = await supabase
      .from("site_settings")
      .select("settings")
      .eq("id", true)
      .maybeSingle();
    if (currentError) throw currentError;

    const currentSettings =
      (current?.settings && typeof current.settings === "object"
        ? current.settings
        : {}) as Record<string, unknown>;
    const submittedSettings = keepActiveSettings(body.settings);
    const existingSettings = keepActiveSettings(currentSettings);
    let settingsToSave = applySiteSettings(existingSettings, submittedSettings);

    if (adminProfile.role === "super_admin") {
      const submittedRoute = submittedSettings.homepagePayPalRoute;
      const checkoutSelection = selectedCheckout({
        ...currentSettings,
        ...(submittedRoute === "standard" || submittedRoute === "superadmin"
          ? { homepagePayPalRoute: submittedRoute }
          : {}),
      });
      settingsToSave = {
        ...settingsToSave,
        ...checkoutSelection,
        alternateCardCheckoutVisible: Object.hasOwn(submittedSettings, "alternateCardCheckoutVisible")
          ? isEnabled(submittedSettings.alternateCardCheckoutVisible)
          : checkoutVisibility(currentSettings, "alternateCardCheckoutVisible"),
      };
    } else {
      settingsToSave = {
        ...settingsToSave,
        ...selectedCheckout(currentSettings),
        alternateCardCheckoutVisible: checkoutVisibility(currentSettings, "alternateCardCheckoutVisible"),
      };
    }

    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: true, settings: settingsToSave }, { onConflict: "id" })
      .select("id")
      .single();

    if (error) throw error;

    const { data: savedSettings, error: savedSettingsError } = await supabase
      .from("site_settings")
      .select("settings")
      .eq("id", true)
      .single();
    if (savedSettingsError) throw savedSettingsError;

    return jsonResponse({ settings: savedSettings.settings });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse("Could not save admin settings.", 500, String(error));
  }
}));
