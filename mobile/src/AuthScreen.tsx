import React, { useState } from "react";
import { ScrollView, Text, Platform, Linking, View, Pressable } from "react-native";
import * as Apple from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase, googleLogin, redirectTo, configured } from "./session";
import { Field, Button, Choices, Brand, colors, s } from "./ui";
export default function AuthScreen() {
  const [mode, M] = useState("login"),
    [intent, I] = useState("customer"),
    [name, N] = useState(""),
    [email, E] = useState(""),
    [password, P] = useState(""),
    [busy, B] = useState(false),
    [message, S] = useState("");
  async function run(task: () => Promise<void>) {
    B(true);
    S("");
    try {
      await task();
    } catch (e) {
      S(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      B(false);
    }
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:24}}>
      <View style={{paddingHorizontal:26,paddingTop:14,paddingBottom:12}}>
      <Brand compact />
      <Text style={[s.h1,{marginTop:16,fontSize:28,lineHeight:34}]}>{mode === "login" ? "Welcome back." : "Create your account."}</Text>
      <Text style={[s.muted,{marginTop:6}]}>{mode === "login" ? "Your car. Your time." : "Your car. Your time. Your DRIOZ account."}</Text>
      {!configured && (
        <Text style={s.error}>
          Build configuration is incomplete. Set the API URL and Supabase public
          configuration before signing in.
        </Text>
      )}
      <View style={{gap:3,marginTop:16}}>
        {mode === "signup" && (
          <>
            <Field label="Full name" value={name} onChange={N} />
            <Choices
              value={intent}
              set={I}
              values={[
                { label: "Customer", value: "customer" },
                { label: "Driver partner", value: "driver" },
              ]}
            />
          </>
        )}
        <Field
          label="Email"
          value={email}
          onChange={E}
          keyboard="email-address"
          placeholder="you@example.com"
          compact
        />
        <Field label="Password" value={password} onChange={P} secure compact placeholder="Enter your password"/>
        {mode === "signup" && <Text style={s.muted}>Use at least 12 characters for your password.</Text>}
        {mode === "login" && <Pressable accessibilityRole="button" disabled={busy || !configured} onPress={()=>run(async()=>{await Linking.openURL(process.env.EXPO_PUBLIC_API_URL+"/forgot-password")})} style={{minHeight:40,alignSelf:"flex-end",justifyContent:"center"}}><Text style={{fontSize:12,fontWeight:"600",color:colors.ink}}>Forgot password?</Text></Pressable>}
        <Button
          dark
          disabled={busy || !configured}
          title={
            busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"
          }
          onPress={() =>
            run(async () => {
              if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                  email: email.trim(),
                  password,
                });
                if (error) throw error;
              } else {
                if (name.trim().length < 2 || password.length < 12)
                  throw Error(
                    "Enter your name and a password of at least 12 characters",
                  );
                const { error } = await supabase.auth.signUp({
                  email: email.trim(),
                  password,
                  options: {
                    emailRedirectTo: redirectTo,
                    data: { full_name: name.trim(), account_intent: intent },
                  },
                });
                if (error) throw error;
                S("Check your email to confirm your account.");
              }
            })
          }
        />
        <View style={[s.row,{marginVertical:7}]}><View style={{height:1,flex:1,backgroundColor:colors.line}}/><Text style={[s.muted,{fontSize:11}]}>or</Text><View style={{height:1,flex:1,backgroundColor:colors.line}}/></View>
        <Button
          secondary
          disabled={busy || !configured}
          title="Continue with Google"
          onPress={() => run(googleLogin)}
        />
        {Platform.OS === "ios" &&
          process.env.EXPO_PUBLIC_APPLE_SIGN_IN === "true" && (
            <Button
              secondary
              disabled={busy}
              title="Continue with Apple"
              onPress={() =>
                run(async () => {
                  const nonce = Crypto.randomUUID(),
                    hash = await Crypto.digestStringAsync(
                      Crypto.CryptoDigestAlgorithm.SHA256,
                      nonce,
                    );
                  const result = await Apple.signInAsync({
                    requestedScopes: [
                      Apple.AppleAuthenticationScope.FULL_NAME,
                      Apple.AppleAuthenticationScope.EMAIL,
                    ],
                    nonce: hash,
                  });
                  if (!result.identityToken)
                    throw Error("Apple did not return an identity token");
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
        {message && (
          <Text accessibilityRole="alert" style={s.text}>
            {message}
          </Text>
        )}
      </View>
      <Pressable accessibilityRole="button" disabled={busy} style={{minHeight:44,marginTop:6,justifyContent:"center",alignItems:"center"}} onPress={()=>{M(mode === "login" ? "signup" : "login");S("");}}><Text style={[s.text,{fontSize:12}]}>{mode === "login" ? "New to DRIOZ?  " : "Already registered?  "}<Text style={{fontWeight:"700",textDecorationLine:"underline"}}>{mode === "login" ? "Create account" : "Sign in"}</Text></Text></Pressable>
      </View>
    </ScrollView>
  );
}
