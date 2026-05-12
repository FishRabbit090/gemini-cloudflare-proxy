const UPSTREAM_ORIGIN = "https://generativelanguage.googleapis.com";
const DEFAULT_UPSTREAM_PATH = "/v1beta";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return jsonResponse({
        ok: true,
        upstream: UPSTREAM_ORIGIN,
        nativeBaseUrl: `${url.origin}${DEFAULT_UPSTREAM_PATH}`,
        openAICompatibleBaseUrl: `${url.origin}/v1beta/openai/`,
        auth: {
          native: "Send x-goog-api-key, ?key=, or configure GEMINI_API_KEY.",
          openAICompatible: "Use Authorization: Bearer <Gemini API key>.",
          proxyToken: "Optional: set PROXY_AUTH_TOKEN and send x-proxy-token."
        }
      }, request);
    }

    const auth = validateProxyAuth(request, url, env);
    if (!auth.ok) {
      return jsonResponse({ error: auth.error }, request, 401);
    }

    const upstreamUrl = new URL(url.pathname + url.search, UPSTREAM_ORIGIN);
    upstreamUrl.searchParams.delete("proxy_token");

    const headers = buildUpstreamHeaders(request.headers, env, auth.proxyAuthorized);
    const init = {
      method: request.method,
      headers,
      body: hasRequestBody(request.method) ? request.body : undefined,
      redirect: "manual"
    };

    try {
      const upstreamResponse = await fetch(upstreamUrl, init);
      return withCors(upstreamResponse, request);
    } catch (error) {
      console.error(JSON.stringify({
        message: "Gemini upstream request failed",
        error: error instanceof Error ? error.message : String(error)
      }));

      return jsonResponse({
        error: "Upstream request failed",
        upstream: UPSTREAM_ORIGIN
      }, request, 502);
    }
  }
};

function validateProxyAuth(request, url, env) {
  if (!env.PROXY_AUTH_TOKEN) {
    return { ok: true, proxyAuthorized: false };
  }

  const provided = request.headers.get("x-proxy-token") || url.searchParams.get("proxy_token") || "";
  if (!provided) {
    return { ok: false, error: "Missing proxy token. Send x-proxy-token or proxy_token." };
  }

  if (!timingSafeEqual(provided, env.PROXY_AUTH_TOKEN)) {
    return { ok: false, error: "Invalid proxy token." };
  }

  return { ok: true, proxyAuthorized: true };
}

function buildUpstreamHeaders(incoming, env, proxyAuthorized) {
  const headers = new Headers();

  for (const [key, value] of incoming) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (lower === "host") continue;
    if (lower === "cf-connecting-ip") continue;
    if (lower === "cf-ipcountry") continue;
    if (lower === "cf-ray") continue;
    if (lower === "x-proxy-token") continue;
    headers.set(key, value);
  }

  if (env.GEMINI_API_KEY && proxyAuthorized && !hasGoogleCredential(headers)) {
    headers.set("x-goog-api-key", env.GEMINI_API_KEY);
  }

  headers.set("host", "generativelanguage.googleapis.com");
  return headers;
}

function hasGoogleCredential(headers) {
  return Boolean(
    headers.get("x-goog-api-key") ||
    headers.get("authorization")
  );
}

function hasRequestBody(method) {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  for (const [key, value] of corsHeaders(request)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonResponse(body, request, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...Object.fromEntries(corsHeaders(request))
    }
  });
}

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "*";
  return new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": request.headers.get("access-control-request-headers") || "authorization,content-type,x-goog-api-key,x-proxy-token",
    "access-control-max-age": "86400",
    "vary": "Origin, Access-Control-Request-Headers"
  });
}

function timingSafeEqual(left, right) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
  }

  return diff === 0;
}
