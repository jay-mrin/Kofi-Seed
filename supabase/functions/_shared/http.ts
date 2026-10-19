function getAllowedOrigin() {
  const configuredOrigin = String(Deno.env.get("SITE_ORIGIN") || "*").trim();
  if (!configuredOrigin || configuredOrigin === "*") return "*";

  try {
    return new URL(configuredOrigin).origin;
  } catch {
    return configuredOrigin.replace(/\/+$/, "");
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-donor-token, x-visitor-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function noContentResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function errorResponse(message: string, status = 400, details?: unknown) {
  return jsonResponse({ error: message, details }, status);
}

export function handleOptions(request: Request) {
  if (request.method === "OPTIONS") {
    return noContentResponse();
  }

  return null;
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
