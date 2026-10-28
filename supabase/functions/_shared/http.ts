function getConfiguredOrigin() {
  const configured = String(Deno.env.get("SITE_ORIGIN") || "").trim();
  if (!configured || configured === "*") return "https://www.seedgarden.space";
  try {
    return new URL(configured).origin;
  } catch {
    return configured.replace(/\/+$/, "");
  }
}

const allowedOrigins = new Set([
  getConfiguredOrigin(),
  "https://www.seedgarden.space",
  "https://seedgarden.space",
  "https://kofiseed.vercel.app",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

export const corsHeaders = {
  "Access-Control-Allow-Origin": getConfiguredOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-donor-token, x-visitor-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function withCors(handler: (request: Request) => Response | Promise<Response>) {
  return async (request: Request) => {
    const response = await handler(request);
    const origin = request.headers.get("Origin") || "";
    if (!allowedOrigins.has(origin)) return response;

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

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
