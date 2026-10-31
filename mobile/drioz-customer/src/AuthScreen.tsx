import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Platform,
  Linking,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Apple from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase, googleLogin, redirectTo, configured } from "./session";
import { Field, Button, Card, Choices, Banner, Icon, s, colors } from "./ui";
import { AnimatedWheel } from "./Steering";

const hero = require("../assets/brand/hero.jpg");
const logo = require("../assets/brand/logo-light.png");

export default function AuthScreen() {
  const [mode, setMode] = useState("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [tone, setTone] = useState<"bad" | "good">("bad");
  async function run(task: () => Promise<void | string>) {
    setBusy(true);
    setMessage("");
    try {
      const ok = await task();
      if (typeof ok === "string") {
        setTone("good");
        setMessage(ok);
      }
    } catch (e) {
      setTone("bad");
      setMessage(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }
  const valid =
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    (mode === "login"
      ? password.length > 0
      : password.length >= 12 && name.trim().length >= 2);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
        <ImageBackground source={hero} style={{ minHeight: 330 }} resizeMode="cover">
          <LinearGradient
            colors={["rgba(7,17,14,0.35)", "rgba(7,17,14,0.92)"]}
            style={{ flex: 1, padding: 24, paddingTop: 28, justifyContent: "space-between", minHeight: 330 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Image source={logo} style={{ width: 130, height: 45 }} resizeMode="contain" accessibilityLabel="DRIOZ" />
              
            </View>
            <View style={{ gap: 10 }}>
              <AnimatedWheel size={44} motion="steer" duration={2400} rim="#E9F2EE" hub={colors.night} />
              <Text style={[s.eyebrow, { color: colors.brand }]}>{"Your personal driver, anytime"}</Text>
              <Text style={{ color: "#fff", fontSize: 40, fontWeight: "800", letterSpacing: -1.2, lineHeight: 42 }}>
                {"Your car."}{"\n"}
                <Text style={{ color: colors.brand, fontStyle: "italic", fontWeight: "500" }}>{"Your time."}</Text>
              </Text>
              <Text style={{ color: "#B9CBC4", fontSize: 15, lineHeight: 21 }}>
                {"Book a verified driver for your own car — one way, round trip or outstation."}
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>
        <View style={[s.content, { marginTop: -22, paddingBottom: 40 }]}>
          <Card style={{ gap: 10 }}>
            {!configured && (
              <Banner
                tone="warn"
                text="Build configuration is incomplete. Set the API URL and Supabase public keys before signing in."
              />
            )}
            <Choices
              value={mode}
              set={(v) => {
                setMode(v);
                setMessage("");
              }}
              values={[
                { label: "Sign in", value: "login" },
                { label: "Create account", value: "signup" },
              ]}
            />
            {mode === "signup" && (
              <>
                <Field label="Full name" value={name} onChange={setName} autoCapitalize="words" maxLength={80} />
              </>
            )}
            <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" placeholder="you@example.com" maxLength={254} />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              secure={!show}
              placeholder={mode === "signup" ? "At least 12 characters" : "Your password"}
              maxLength={128}
            />
            <Button
              variant="ghost"
              small
              icon={show ? "eye-off-outline" : "eye-outline"}
              title={show ? "Hide password" : "Show password"}
              onPress={() => setShow(!show)}
              style={{ alignSelf: "flex-start", marginTop: -4 }}
            />
            {message ? <Banner tone={tone} text={message} /> : null}
            <Button
              variant="dark"
              busy={busy}
              disabled={!configured || !valid}
              title={mode === "login" ? "Sign in" : "Create account"}
              icon="arrow-forward"
              onPress={() =>
                run(async () => {
                  if (mode === "login") {
                    const { error } = await supabase.auth.signInWithPassword({
                      email: email.trim().toLowerCase(),
                      password,
                    });
                    if (error) throw Error("Unable to sign in. Check your details and confirm your email.");
                  } else {
                    const { error } = await supabase.auth.signUp({
                      email: email.trim().toLowerCase(),
                      password,
                      options: {
                        emailRedirectTo: redirectTo,
                        data: { full_name: name.trim(), account_intent: "customer" },
                      },
                    });
                    if (error) throw error;
                    return "Check your email on this phone to confirm your account.";
                  }
                })
              }
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
              <Text style={s.muted}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
            </View>
            <Button
              secondary
              icon="logo-google"
              disabled={busy || !configured}
              title="Continue with Google"
              onPress={() => run(googleLogin)}
            />
            {Platform.OS === "ios" && process.env.EXPO_PUBLIC_APPLE_SIGN_IN === "true" && (
              <Apple.AppleAuthenticationButton
                buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={{ height: 52 }}
                onPress={() =>
                  run(async () => {
                    const nonce = Crypto.randomUUID(),
                      hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
                    const result = await Apple.signInAsync({
                      requestedScopes: [
                        Apple.AppleAuthenticationScope.FULL_NAME,
                        Apple.AppleAuthenticationScope.EMAIL,
                      ],
                      nonce: hash,
                    });
                    if (!result.identityToken) throw Error("Apple did not return an identity token");
                    const { error } = await supabase.auth.signInWithIdToken({
                      provider: "apple",
                      token: result.identityToken,
                      nonce,
                    });
                    if (error) throw error;
                  })
                }
              />
            )}
            {mode === "login" && (
              <Button
                variant="ghost"
                small
                title="Forgot password?"
                disabled={!configured}
                onPress={() =>
                  Linking.openURL((process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "") + "/forgot-password").catch(() => {})
                }
              />
            )}
          </Card>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingHorizontal: 4 }}>
            <Icon name="shield-checkmark" size={18} color={colors.brandDeep} />
            <Text style={[s.muted, { flex: 1 }]}>
              {"Every DRIOZ driver passes licence, identity and driving-assessment checks before their first trip."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
