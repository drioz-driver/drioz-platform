import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  mobileIdentity,
  mobilePathAllowed,
  handleMobile,
} from "../lib/mobile-api.ts";
const token = "a".repeat(40),
  otherToken = "b".repeat(40);
const user = {
  id: "native-customer",
  email: "native@example.com",
  email_confirmed_at: "2026-10-20",
  user_metadata: { full_name: "Native Customer", role: "admin" },
};
function setup() {
  const sql = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    sql.exec(
      readFileSync(new URL("../drizzle/" + name, import.meta.url), "utf8"),
    );
  function stmt(query: string, args: any[] = []): any {
    return {
      bind: (...values: any[]) => stmt(query, values),
      first: async () => sql.prepare(query).get(...args) || null,
      all: async () => ({ results: sql.prepare(query).all(...args) }),
      run: async () => ({
        meta: { changes: Number(sql.prepare(query).run(...args).changes) },
      }),
    };
  }
  const DB = {
    prepare: stmt,
    batch: async (list: any[]) => {
      sql.exec("BEGIN");
      try {
        const result = [];
        for (const statement of list) result.push(await statement.run());
        sql.exec("COMMIT");
        return result;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return {
    sql,
    runtime: {
      DB,
      BUCKET: null,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "test-key",
      DRIOZ_OWNER_EMAIL: "owner@example.com",
    },
  };
}
const fetcher = (async (url: any, options: any) => {
  assert.equal(url, "https://example.supabase.co/auth/v1/user");
  return Response.json(
    options.headers.Authorization === "Bearer " + otherToken
      ? { ...user, id: "other", email: "other@example.com" }
      : user,
  );
}) as typeof fetch;
function request(path: string, data?: unknown, auth = token) {
  return new Request("https://api.drioz.example/api/mobile/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + auth,
      "Content-Type": "application/json",
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
test("native auth rejects cookie/header identity without bearer and validates tokens remotely", async () => {
  const { runtime } = setup();
  await assert.rejects(
    mobileIdentity(
      new Request("https://example.com", {
        headers: {
          cookie: "fake=owner",
          "oai-authenticated-user-id": "owner",
          "oai-authenticated-user-email": "owner@example.com",
        },
      }),
      runtime,
      fetcher,
    ),
  );
  const identity = await mobileIdentity(request("snapshot"), runtime, fetcher);
  assert.equal(identity.id, "supabase:native-customer");
  assert.equal((identity as any).role, undefined);
  await assert.rejects(
    mobileIdentity(request("snapshot"), runtime, (async () =>
      Response.json({ message: "expired" }, { status: 401 })) as typeof fetch),
  );
  await assert.rejects(
    mobileIdentity(request("snapshot"), runtime, (async () =>
      Response.json({ ...user, email_confirmed_at: null })) as typeof fetch),
  );
});
test("native route excludes staff and mutation endpoints from the app surface", () => {
  for (const path of [
    "staff",
    "cities",
    "regions",
    "drivers/123/review",
    "documents/123/review",
    "payments",
    "payouts",
    "bookings/123/auto-assign",
  ])
    assert.equal(mobilePathAllowed(path, "POST"), false);
  assert.equal(mobilePathAllowed("driver/location", "POST"), true);
  assert.equal(mobilePathAllowed("bookings/123/invoice", "GET"), true);
});
test("native customer can estimate and book without browser cookies, with private trip isolation", async () => {
  const { sql, runtime } = setup();
  let r = await handleMobile(request("snapshot"), "snapshot", runtime, fetcher);
  assert.equal(r.status, 200);
  assert.equal(((await r.json()) as any).me.role, "customer");
  sql
    .prepare("UPDATE cities SET enabled=1,zones=? WHERE id='hyderabad'")
    .run(JSON.stringify([{ lat: 17.44, lng: 78.39, radiusKm: 50 }]));
  const input = {
    cityId: "hyderabad",
    pickup: "Madhapur",
    destination: "Airport",
    pickupPoint: { lat: 17.44, lng: 78.39 },
    destinationPoint: { lat: 17.24, lng: 78.43 },
    tripType: "one-way",
    transmission: "manual",
    scheduledAt: null,
  };
  r = await handleMobile(request("quote", input), "quote", runtime, fetcher);
  assert.equal(r.status, 200);
  const quote: any = await r.json();
  r = await handleMobile(
    request("bookings", { quoteId: quote.id, key: crypto.randomUUID() }),
    "bookings",
    runtime,
    fetcher,
  );
  assert.equal(r.status, 200);
  const booking: any = await r.json();
  assert.equal(booking.customer_id, "supabase:native-customer");
  r = await handleMobile(
    request(`bookings/${booking.id}/invoice`, undefined, otherToken),
    `bookings/${booking.id}/invoice`,
    runtime,
    fetcher,
  );
  assert.equal(r.status, 403);
  assert.match(r.headers.get("cache-control") || "", /no-store/);
  r = await handleMobile(
    request("estimate", { oversize: "x".repeat(21000) }),
    "estimate",
    runtime,
    fetcher,
  );
  assert.equal(r.status, 413);
});
