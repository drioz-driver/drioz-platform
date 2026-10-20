import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
WebBrowser.maybeCompleteAuthSession();
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const configured = !!url && !!key && !!process.env.EXPO_PUBLIC_API_URL;
// A session may exceed one Keychain item. Chunks remain encrypted in SecureStore.
const storage = {
  async getItem(name: string) {
    const manifest = await SecureStore.getItemAsync(name);
    if (!manifest) return null;
    const m = JSON.parse(manifest);
    const pieces = await Promise.all(
      Array.from({ length: m.count }, (_, i) =>
        SecureStore.getItemAsync(`${name}.${m.version}.${i}`),
      ),
    );
    return pieces.some((p) => p === null) ? null : pieces.join("");
  },
  async setItem(name: string, value: string) {
    const old = await SecureStore.getItemAsync(name);
    const version = Crypto.randomUUID();
    const count = Math.ceil(value.length / 400);
    for (let i = 0; i < count; i++)
      await SecureStore.setItemAsync(
        `${name}.${version}.${i}`,
        value.slice(i * 400, (i + 1) * 400),
        { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY },
      );
    await SecureStore.setItemAsync(name, JSON.stringify({ version, count }), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    if (old) {
      const m = JSON.parse(old);
      await Promise.all(
        Array.from({ length: m.count }, (_, i) =>
          SecureStore.deleteItemAsync(`${name}.${m.version}.${i}`),
        ),
      ).catch(() => {});
    }
  },
  async removeItem(name: string) {
    const old = await SecureStore.getItemAsync(name);
    await SecureStore.deleteItemAsync(name);
    if (old) {
      const m = JSON.parse(old);
      await Promise.all(
        Array.from({ length: m.count }, (_, i) =>
          SecureStore.deleteItemAsync(`${name}.${m.version}.${i}`),
        ),
      );
    }
  },
};
export const supabase = createClient(
  url || "https://not-configured.supabase.co",
  key || "not-configured",
  {
    auth: {
      storage,
      lock: processLock,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lockAcquireTimeout: 10000,
    },
  },
);
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
export const redirectTo = "drioz://auth/callback";
const exchanging = new Set<string>();
export async function authCallback(value: string) {
  if (value.split(/[?#]/)[0] !== redirectTo) return;
  const parsed = Linking.parse(value),
    code = parsed.queryParams?.code;
  if (parsed.queryParams?.error)
    throw Error(
      String(parsed.queryParams.error_description || parsed.queryParams.error),
    );
  if (typeof code !== "string" || exchanging.has(code)) return;
  exchanging.add(code);
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (exchanging.size > 128)
      exchanging.delete(exchanging.values().next().value!);
  } catch (e) {
    exchanging.delete(code);
    throw e;
  }
}
export async function googleLogin() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw Error("Google sign-in is unavailable");
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "success") await authCallback(result.url);
}
