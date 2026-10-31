import 'server-only';
import { postgresDatabase } from './postgres';
import { privateStorage } from './private-storage';

// Only server code imports this module. Never copy privileged values into Expo.
export function runtime() {
  return {
    DB: postgresDatabase(),
    BUCKET: privateStorage(),
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    DRIOZ_OWNER_EMAIL: process.env.DRIOZ_OWNER_EMAIL,
    TRIP_PIN_SECRET: process.env.TRIP_PIN_SECRET,
    GOOGLE_MAPS_BROWSER_KEY: process.env.GOOGLE_MAPS_BROWSER_KEY,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RAZORPAYX_KEY_ID: process.env.RAZORPAYX_KEY_ID,
    RAZORPAYX_KEY_SECRET: process.env.RAZORPAYX_KEY_SECRET,
    RAZORPAYX_WEBHOOK_SECRET: process.env.RAZORPAYX_WEBHOOK_SECRET,
    RAZORPAYX_ACCOUNT_NUMBER: process.env.RAZORPAYX_ACCOUNT_NUMBER,
    // v5 optional integrations — each feature switches on only when its settings are present.
    PUSH_ENABLED: process.env.PUSH_ENABLED,
    EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN,
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
    MSG91_SMS_TEMPLATES: process.env.MSG91_SMS_TEMPLATES,
    MSG91_WHATSAPP_NUMBER: process.env.MSG91_WHATSAPP_NUMBER,
    MSG91_WHATSAPP_TEMPLATES: process.env.MSG91_WHATSAPP_TEMPLATES,
    IDFY_ACCOUNT_ID: process.env.IDFY_ACCOUNT_ID,
    IDFY_API_KEY: process.env.IDFY_API_KEY,
    DRIOZ_GSTIN: process.env.DRIOZ_GSTIN,
    DRIOZ_LEGAL_NAME: process.env.DRIOZ_LEGAL_NAME,
    DRIOZ_ADDRESS: process.env.DRIOZ_ADDRESS,
    DRIOZ_SAC: process.env.DRIOZ_SAC,
    DRIOZ_SOS_PHONE: process.env.DRIOZ_SOS_PHONE,
    ALLOW_PLATFORM_IDENTITY: false,
  };
}
