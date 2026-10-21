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
let refreshing:ReturnType<typeof supabase.auth.refreshSession>|null=null;
export async function api(
  path: string,
  data?: unknown,
  retry = true,
): Promise<any> {
  if (!apiOrigin.startsWith("https://"))
    throw Error("Set a valid HTTPS API URL in mobile configuration");
  let { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new APIError("Sign in to continue", 401);
  const multipart = data instanceof FormData;
  const response = await fetch(apiOrigin + (path.startsWith("billing/") ? "/api/"+path.slice(8) : "/api/mobile/"+path), {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + sessionData.session.access_token,
      ...(multipart ? {} : { "Content-Type": "application/json" }),
    },
    ...(data === undefined
      ? {}
      : { body: multipart ? (data as FormData) : JSON.stringify(data) }),
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 401 && retry) {
    if(!refreshing)refreshing=supabase.auth.refreshSession().finally(()=>{refreshing=null});
    const refreshed=await refreshing;
    if(!refreshed.error)return api(path,data,false);
    if(refreshed.error.status===undefined||refreshed.error.status>=500||refreshed.error.status===429)throw new APIError("Could not reconnect. Check your connection and retry.",503);
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
