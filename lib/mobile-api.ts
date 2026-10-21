import { managedIdentity } from "./auth/identity.ts";
import { operations, ApiError } from "./operations.ts";
type Runtime = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  DB: any;
  BUCKET: any;
  DRIOZ_OWNER_EMAIL?: string;
  TRIP_PIN_SECRET?: string;
  RAZORPAY_KEY_ID?: string;
};
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
  const response = await fetcher(
    runtime.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/user",
    {
      headers: {
        apikey: runtime.SUPABASE_PUBLISHABLE_KEY,
        Authorization: "Bearer " + match[1],
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
      /^bookings\/[^/]+\/(invoice|location)$/.test(path) ||
      /^tickets\/[^/]+$/.test(path) ||
      /^documents\/[^/]+$/.test(path)
    );
  if (method !== "POST") return false;
  return (
    [
      "coverage",
      "estimate",
      "quote",
      "bookings",
      "driver/apply",
      "driver/availability",
      "driver/location",
      "documents",
      "tickets",
      "notifications/read",
    ].includes(path) ||
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
        multipart ? 6 * 1024 * 1024 : 20000,
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
    const result = await ops.handle(actor, path, request.method, data, request);
    if (result instanceof Response) {
      const h = new Headers(result.headers);
      Object.entries(headers).forEach(([k, v]) => h.set(k, v));
      return new Response(result.body, { status: result.status, headers: h });
    }
    return Response.json(result, { headers });
  } catch (error) {
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
