import { managedIdentity } from "./auth/identity.ts";
import { operations, ApiError } from "./operations.ts";
import { runtimeOptions, type DriozRuntime } from "./runtime-options.ts";
import { databaseOutOfDate } from "./migrations-pending.ts";
type Runtime = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  DB: any;
  BUCKET: any;
  DRIOZ_OWNER_EMAIL?: string;
  TRIP_PIN_SECRET?: string;
  RAZORPAY_KEY_ID?: string;
};
// Warm server instances remember a verified access token briefly, so polling and pricing calls
// skip a round trip to Supabase Auth. Suspension is still enforced on every request by ops.actor().
const IDENTITY_TTL_MS = 60_000;
const verified = new Map<string, { identity: any; until: number }>();
async function tokenKey(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
function tokenExpiry(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}
export async function mobileIdentity(
  request: Request,
  runtime: Runtime,
  fetcher: typeof fetch = fetch,
) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer ([A-Za-z0-9._~-]{32,8192})$/.exec(header);
  if (!match) throw new ApiError(401, "Sign in to DRIOZ");
  if (!runtime.SUPABASE_URL || !runtime.SUPABASE_PUBLISHABLE_KEY)
    throw new ApiError(503, "Authentication is not configured");
  const key = fetcher === fetch ? await tokenKey(match[1]) : "";
  const cached = key ? verified.get(key) : undefined;
  if (cached && cached.until > Date.now()) return cached.identity;
  const identity = await verifyIdentity(match[1], runtime, fetcher);
  const until = Math.min(Date.now() + IDENTITY_TTL_MS, tokenExpiry(match[1]));
  if (key && until > Date.now()) {
    if (verified.size >= 5000) verified.delete(verified.keys().next().value as string);
    verified.set(key, { identity, until });
  }
  return identity;
}
async function verifyIdentity(
  token: string,
  runtime: Runtime,
  fetcher: typeof fetch,
) {
  const response = await fetcher(
    runtime.SUPABASE_URL!.replace(/\/$/, "") + "/auth/v1/user",
    {
      headers: {
        apikey: runtime.SUPABASE_PUBLISHABLE_KEY!,
        Authorization: "Bearer " + token,
      },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) {
    if ([400,401,403].includes(response.status))throw new ApiError(401, "Your session has expired. Sign in again.");
    throw new ApiError(503, "Account verification is temporarily unavailable. Please retry.");
  }
  const identity = managedIdentity(await response.json());
  if (!identity)
    throw new ApiError(401, "Verify your account before continuing");
  return identity;
}
export function mobilePathAllowed(path: string, method: string) {
  if (method === "GET")
    return (
      path === "snapshot" ||
      path === "pulse" ||
      path === "driver/offers" ||
      /^bookings\/[^/]+\/inspections$/.test(path) ||
      /^inspections\/[^/]+\/photos\/\d$/.test(path) ||
      /^bookings\/[^/]+\/(invoice|location)$/.test(path) ||
      /^tickets\/[^/]+$/.test(path) ||
      /^documents\/[^/]+$/.test(path)
    );
  if (method !== "POST") return false;
  return (
    [
      "coverage",
      "estimate",
      "price",
      "quote",
      "bookings",
      "driver/apply",
      "driver/availability",
      "driver/location",
      "driver/offers/pass",
      "documents",
      "tickets",
      "notifications/read",
      "places",
      "push/register",
      "push/unregister",
      "account/profile",
      "account/delete",
      "driver/plan",
    ].includes(path) ||
    /^places\/[^/]+\/delete$/.test(path) ||
    /^bookings\/[^/]+\/(rate|inspection|sos|message|share)$/.test(path) ||
    /^bookings\/[^/]+\/(assign|status|start-code)$/.test(path) ||
    /^tickets\/[^/]+$/.test(path) ||
    /^location-requests\/[^/]+\/cancel$/.test(path)
  );
}
async function boundedBody(request: Request, maximum: number) {
  if (Number(request.headers.get("content-length") || 0) > maximum)
    throw new ApiError(413, "Request too large");
  const chunks: Uint8Array[] = [];
  let length = 0;
  const reader = request.body?.getReader();
  if (reader)
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new ApiError(413, "Request too large");
      }
      chunks.push(part.value);
    }
  return new Blob(chunks as BlobPart[]);
}
export async function handleMobile(
  request: Request,
  path: string,
  runtime: Runtime,
  fetcher: typeof fetch = fetch,
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Authorization",
  };
  try {
    if (!mobilePathAllowed(path, request.method))
      throw new ApiError(404, "Endpoint not found");
    const identity = await mobileIdentity(request, runtime, fetcher);
    if (!runtime.DB) throw new ApiError(503, 'Database unavailable');
    const ops = operations(
      runtime.DB,
      runtime.BUCKET,
      runtime.DRIOZ_OWNER_EMAIL || "",
      runtime.TRIP_PIN_SECRET || "",
      runtime.RAZORPAY_KEY_ID,
      true,
      runtimeOptions(runtime as unknown as DriozRuntime),
    );
    const actor = await ops.actor(identity);
    let data: any = null;
    if (request.method === "POST") {
      await ops.limit(actor);
      const multipart = (request.headers.get("content-type") || "").startsWith(
        "multipart/form-data",
      );
      const body = await boundedBody(
        request,
        multipart ? 4_400_000 : 20000,
      );
      if (multipart)
        request = new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body,
        });
      else {
        try {
          data = JSON.parse(await body.text());
        } catch {
          throw new ApiError(400, "Invalid JSON");
        }
      }
    }
    // The dashboard snapshot reads ~25 tables: run it on one connection with one consistent view.
    const result =
      path === "snapshot" && request.method === "GET" && runtime.DB.readSnapshot
        ? await runtime.DB.readSnapshot((db: any) =>
            operations(db, runtime.BUCKET, runtime.DRIOZ_OWNER_EMAIL || "", runtime.TRIP_PIN_SECRET || "", runtime.RAZORPAY_KEY_ID, true,
              runtimeOptions(runtime as unknown as DriozRuntime)).handle(actor, path, request.method, data, request))
        : await ops.handle(actor, path, request.method, data, request);
    if (result instanceof Response) {
      const h = new Headers(result.headers);
      Object.entries(headers).forEach(([k, v]) => h.set(k, v));
      return new Response(result.body, { status: result.status, headers: h });
    }
    return Response.json(result, { headers });
  } catch (error) {
    if (!(error instanceof ApiError))
      console.error(
        "mobile request failed",
        path,
        error instanceof Error ? error.message : "Unknown error",
      );
    if (!(error instanceof ApiError) && databaseOutOfDate(error))
      return Response.json(
        { message: "The DRIOZ server database is out of date. Ask your administrator to apply the latest migrations.", code: "migrations_pending" },
        { status: 503, headers },
      );
    if (error instanceof ApiError)
      return Response.json(
        { message: error.message },
        { status: error.status, headers },
      );
    return Response.json(
      { message: "Unable to complete this request. Please retry." },
      { status: 503, headers },
    );
  }
}
