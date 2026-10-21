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
    ALLOW_PLATFORM_IDENTITY: false,
  };
}
