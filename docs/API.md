# DRIOZ API reference (v5)

Web: `/api/ops/<path>` (cookie session, same-origin POST). Mobile: `/api/mobile/<path>` (Supabase bearer token; allow-listed paths only). Amounts are **paise** (₹1 = 100). Times are epoch milliseconds.

## Snapshot — `GET snapshot`

Existing fields plus:

| Field | Who | Notes |
|---|---|---|
| `places[]` | everyone | `{id,label,address,lat,lng}` (max 10) |
| `company` | company members | `{id,name,gstin}` or `null` → show "Bill to company" |
| `bookings[].driver_rating` | everyone | average stars of the trip's driver |
| `bookings[].my_rating` | everyone | stars I gave this trip, or `null` |
| `bookings[].inspections` | everyone | `"pre"`, `"pre,post"` or `null` |
| `bookings[].invoice_number` | everyone | `DRZ/2026-27/000001` once issued |
| `bookings[].extras` | everyone | JSON `{extraHours,extraTime,extraTimeTax,tolls,parking,total,partner}` |
| `bookings[].cancellation_fee`, `assigned_at`, `started_at`, `completed_at`, `company_id` | everyone | |
| `earnings` | drivers | `{today,todayTrips,week,weekTrips,month,monthTrips}` from payouts (IST) |
| `driverRating` | drivers | `{avg,count}` |
| `incentives[]` | drivers | `{id,title,target,done,bonus,endsAt,achieved}` |
| `awards[]` | drivers | bonus payouts `{id,title,amount,status}` |
| `plans[]` | drivers | next 14 days `{day,start_min,end_min,off}` |
| `licenceDaysLeft` | drivers | days until licence expiry (reminder notification at ≤ 30) |
| `companies[]`, `surgeRules[]`, `incentivesAdmin[]`, `incentiveAwards[]`, `shiftPlans[]` | staff | operations data |

## Pricing — `POST estimate` / `POST quote`

Response adds `surge` (paise), `surgeLabel`, `cancellationFee`, `freeCancelMinutes` (5), `extraHourRate`.

`POST bookings {quoteId,key,billTo?:'personal'|'company'}` — `company` requires an active company membership.

## Trip lifecycle changes

| Step | Rule |
|---|---|
| Start (`status: in_progress`) | needs a **before-trip inspection** + customer's start code |
| Complete (`status: completed`) | needs an **after-trip inspection**; optional `actualHours`, `tolls`, `parking` (paise). Extra hours beyond the package are charged at the city hourly rate + tax; tolls/parking are reimbursed in full to the driver. A GST invoice number is issued. |
| Cancel by customer | free until 5 minutes after a driver is assigned; after that (or once the driver has arrived) the city `cancellation` fee applies and the driver gets their share |

## New endpoints

| Method & path | Who | Body / result |
|---|---|---|
| `GET driver/offers` | drivers (poll every 2 s while online — also the presence heartbeat) | `{offers:[{id(bookingId),offer_id,pickup,destination,trip_type,transmission,scheduled_at,partner_fare,offered_at,expires_at,attempt,hours,vehicleCategory,seconds,pickupDistanceKm}],serverNow}` |
| `POST bookings/:id/assign` | driver accepting an offer | `{driverId,offerId}` — must be the live offer; reserves the wallet commission atomically |
| `POST driver/offers/pass` | drivers | `{offerId}` → next partner |
| `GET bookings/:id/location` | trip parties, staff | `{location,target:{lat,lng,kind:'pickup'|'destination'},distanceKm,etaMinutes,status}` |
| `POST bookings/:id/share` | customer | `{path:'/share?token=…'}` — **public** live status page for family, 24 h |
| `GET share?token=` | anyone with the link | `{status,cityName,pickup,destination,driverFirstName,location,etaMinutes,expiresAt}` |
| `POST bookings/:id/rate` | customer or driver, completed trips | `{stars:1-5,comment?,tags?[]}` once per side |
| `POST bookings/:id/inspection` | assigned driver | multipart (≤ 4.4 MB total — compress photos on the device): `phase=pre|post`, `checklist` JSON `{items:{exterior,interior,tyres,lights,dashboard_warnings,documents: 'ok'|'issue'},fuelPercent?,odometerKm?}`, `notes` (required if any issue), `photos` ×0–6 JPEG/PNG ≤ 5 MB |
| `GET bookings/:id/inspections` | trip parties, staff | `{inspections:[{id,phase,checklist,notes,photoCount,createdAt}]}` |
| `GET inspections/:id/photos/:n` | trip parties, staff | image |
| `POST bookings/:id/sos` | customer or driver (live trip or ≤ 6 h after) | `{point?:{lat,lng},note?}` → safety ticket, staff push + SMS; returns `{emergencyNumber:'112'}` |
| `POST bookings/:id/message` | assigned driver, before start | `{template:'late5'|'late10'|'arrived_gate'|'cant_find'|'on_way'}` — 1/min |
| `POST places` / `POST places/:id/delete` | everyone | `{label,address,lat,lng}` |
| `POST push/register` / `POST push/unregister` | everyone | `{token:'ExponentPushToken[…]',app:'customer'|'partner',platform}` |
| `POST account/profile` | everyone | `{name?,phone?}` |
| `POST account/delete` | everyone except owner | `{confirm:'DELETE'}` — anonymises; blocked during active trips |
| `POST driver/plan` | drivers | `{day:'YYYY-MM-DD',start?:'HH:MM',end?:'HH:MM',off?:true}` (≤ 14 days ahead) |
| `POST driver/apply` | everyone | adds optional `dateOfBirth` (needed for automated licence checks) |
| `POST companies` / `POST companies/:id/members` | admin | company `{name,gstin?,billingEmail,address?,active?}`; member `{email,remove?}` |
| `POST incentives` / `POST incentives/:id/toggle` | admin | `{cityId|null,title,targetTrips,bonus,startsAt,endsAt}` |
| `POST incentive-awards/:id/paid` | admin, finance | `{reference}` |
| `POST surge-rules` / `POST surge-rules/:id/delete` | admin | `{cityId,label,multiplierBps:10100–30000,days:bitmask(Sun=1…Sat=64),start,end}` |
| `POST drivers/:id/kyc` | admin, operator | runs the IDfy licence check (needs DOB on profile) |
| `GET analytics` | admin, operator, finance | daily bookings/revenue (14 d), offer acceptance, time-to-assign, revenue by city, cancellation rate, rating, partner health flags |
| `POST cities` | admin | adds `cancellation` (paise) |

## Push payloads

`data.type==='offer_wake'` with `cityId` when a ride is booked (partner app, channel `ride-offers`; open the app to receive the 10-second offer); trip updates carry `bookingId` and `status`; SOS carries `type:'sos'`, `ticketId`.

## Runtime settings

| Setting | Enables |
|---|---|
| `PUSH_ENABLED=true`, `EXPO_ACCESS_TOKEN` (optional) | Expo push to both apps |
| `MSG91_AUTH_KEY`, `MSG91_SMS_TEMPLATES` (JSON event→flow id) | SMS for assigned / arrived / started / completed / cancelled / running_late / sos |
| `MSG91_WHATSAPP_NUMBER`, `MSG91_WHATSAPP_TEMPLATES` (JSON event→template) | WhatsApp for the same events |
| `IDFY_ACCOUNT_ID`, `IDFY_API_KEY` | automated driving-licence verification |
| `DRIOZ_GSTIN`, `DRIOZ_LEGAL_NAME`, `DRIOZ_ADDRESS`, `DRIOZ_SAC` | GST tax invoices (CGST/SGST split) |
| `DRIOZ_SOS_PHONE` | SMS to your safety desk on SOS |

## v5 notes

* Snapshot: `offerSeconds` (10) and, for admins, `offers[]` from the live offer table (`id,booking_id,driver_id,round,status,expires_at,created_at,driver_name,pickup`).
* Completion folds extras into `fare` and `partner_fare`; `extras` keeps the breakdown for invoices.
* Analytics offer metrics come from `ride_offer_events` (one row per offer).
* Wallet and payment endpoints are unchanged (`/api/wallet`, `/api/create-order`, `/api/verify-payment`, `/api/driver/*`); the apps call them as `billing/<path>`.
