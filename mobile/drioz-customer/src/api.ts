import { AppState } from "react-native";
import { supabase } from "./session";
export const apiOrigin = (process.env.EXPO_PUBLIC_API_URL || "").replace(
  /\/$/,
  "",
);
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let refreshing: ReturnType<typeof supabase.auth.refreshSession> | null = null;
export async function api(
  path: string,
  data?: unknown,
  retry = true,
): Promise<any> {
  if (!apiOrigin.startsWith("https://"))
    throw Error("Set a valid HTTPS API URL in mobile configuration");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if(sessionError&&(sessionError.status===undefined||sessionError.status===0||sessionError.status===429||sessionError.status>=500)){
    throw new APIError("Could not reconnect. Check your connection and retry.",503);
  }
  if (!sessionData.session) throw new APIError("Sign in to continue", 401);
  const multipart = data instanceof FormData;
  // AbortSignal.timeout is not available on every Hermes build; use a controller.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), multipart ? 60000 : 20000);
  const foregroundRead=data===undefined&&AppState.currentState==="active";
  const lifecycle=foregroundRead?AppState.addEventListener("change",state=>{
    if(state==="background")controller.abort();
  }):null;
  let response: Response;
  try {
   // "billing/x" calls the wallet & payment API at /api/x (Razorpay, wallet, driver finance).
   response = await fetch(apiOrigin + (path.startsWith("billing/") ? "/api/" + path.slice(8) : "/api/mobile/" + path), {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + sessionData.session.access_token,
      ...(multipart ? {} : { "Content-Type": "application/json" }),
    },
    ...(data === undefined
      ? {}
      : { body: multipart ? (data as FormData) : JSON.stringify(data) }),
    signal: controller.signal,
   });
  } catch (e) {
    throw new APIError(
      controller.signal.aborted
        ? "The request timed out. Check your connection and try again."
        : "You appear to be offline. Check your connection and try again.",
      0,
    );
  } finally {
    clearTimeout(timer);
    lifecycle?.remove();
  }
  if (response.status === 401 && retry) {
    if (!refreshing) refreshing = supabase.auth.refreshSession().finally(() => { refreshing = null; });
    const refreshed = await refreshing;
    if (!refreshed.error) return api(path, data, false);
    if (refreshed.error.status === undefined || refreshed.error.status >= 500 || refreshed.error.status === 429)
      throw new APIError("Could not reconnect. Check your connection and retry.", 503);
  }
  if (
    !(response.headers.get("content-type") || "").includes("application/json")
  )
    throw Error(
      "The API is behind a website sign-in wall or returned an unexpected response. Configure an accessible DRIOZ API deployment.",
    );
  const result = await response.json();
  if (!response.ok)
    throw new APIError(result.message || "Request failed", response.status);
  return result;
}
export const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount / 100);
export type Point = {
  lat: number;
  lng: number;
  label: string;
  city?: string;
  country?: string;
};
