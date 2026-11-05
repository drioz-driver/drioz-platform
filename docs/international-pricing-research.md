# International own-car driver pricing research

Reviewed 2026-11-02. Scope: all countries, with country/city-specific local-market rates. This supersedes the earlier INR conversion and administrator quote requirements. India keeps its existing DRIOZ chart. International bookings should calculate automatically from the applicable chart; a driver accepting confirms availability.

## Verified provider benchmarks

These are provider benchmarks, not adopted DRIOZ tariffs or national standard prices. Amounts are in local currency. Services providing a vehicle as well as a driver are excluded.

| Market | Service and published benchmark | Qualifications | Primary source |
| --- | --- | --- | --- |
| Dubai, UAE | AED 80 weekday / AED 100 weekend own-car trip up to 35 km; AED 40/hour, minimum 3 hours; AED 300/10-hour day | Operator defines weekdays Sunday–Thursday and weekends Friday–Saturday. Outer districts and inter-emirate journeys differ. | https://www.comfortdrive.ae/pricing/ |
| Dubai, UAE | Distance bands: AED 79 for 0–10 km, 105 for 10–20, 120 for 20–30, 135 for 30–40; 2 hours AED 160; 8 hours AED 500 | Separate distance-band business model. Do not combine its hourly prices with another provider's included distance. | https://saferdriverdubai.ae/pricing/ |
| Singapore | S$48 at 21:00–03:00; S$58 at 03:01–20:59 | S$10 supplements listed for Sunday, holiday/eve, Sentosa, manual transmission, extra stop, and commercial vehicle. | https://www.idrive.sg/valet |
| Singapore | Own-car chauffeur 3 hours S$90 for 4-seater / S$110 for 6-seater | Separate drive-home service starts S$48, or S$58 early morning. Home page and FAQ differ on airport starting price; airport price excluded pending clarification. | https://valet.sg/FAQ |
| US, provider-served metropolitan areas | US$55/hour non-member, two-hour minimum; prorated extra time | US$39/hour requires paid membership and is not the ordinary customer rate. Tolls, parking and fuel extra. Verify ZIP coverage. | https://www.dryver.com/ |
| London, UK | Own-vehicle chauffeur service from GBP 45/hour | A starting rate only. Minimum duration, tax treatment and geographic boundary still need verification. Do not substitute the GBP 75/hour vehicle-inclusive service. | https://chauffeurz.london/private-driver/ |
| Sydney / NSW, Australia | A$90 minimum; typical A$125–215 | Dual-driver service. The public headline does not supply a complete distance/time tariff; cannot derive one from its range. | https://angelift.com.au/ |
| Yarra Valley / outer east Melbourne, Australia | A$400 for own-car driver/tour guide up to 8 hours | Specific local tour product with return; not a nationwide or one-way fare. | https://drivenindulgence.com.au/designated-driver/ |
| Toronto / GTA, Canada | Under 10 km C$39.99; 11+ km C$19.99 plus C$2.50/km | Published bands leave exactly 10–11 km ambiguous. First 10 waiting minutes free, then C$1.50/minute; variable availability prices stated. | https://www.sobdrive.ca/ |
| Auckland, New Zealand | From NZ$50 including 5 km; examples: 10 km NZ$60 cash / 65 card; 20 km 100 / 106; 35 km 155 / 165 | Waiting NZ$1/minute after five minutes; weekday 16:00–18:00 surcharge 15%. Example prices do not establish an exact continuous tariff. | https://www.aucklanddialadriver.co.nz/dial-a-driver |
| Tokyo, Japan | JPY 2,000 basic dispatch charge plus JPY 2,000 for driving up to 5 km; JPY 400/km above 5 km | Dispatch charge includes 10 km collection and insurance. Distinguish collection distance from customer journey distance. | https://tokyo-daiko.com/ |
| Selected South African cities | Non-member own-car chauffeur R1,000 up to 6 hours, then R120/hour, excluding VAT | Johannesburg, Pretoria, Durban, Port Elizabeth, East London, George, Cape Town listed. Source page appears old; needs reconfirmation before adoption. | https://gfellas.co.za/chauffeur-hire |

## Rules for implementation

1. Resolve pickup country, subdivision, city and local time zone from selected place/GPS. Match the most specific chart; a city benchmark does not justify nationwide coverage or rates.
2. Persist the selected chart version, currency, local minor-unit precision, inclusions and fare breakdown in the quote and booking. Never infer currency from browser locale or a currency symbol alone.
3. Define explicit distance/time brackets, minimum hire, rounding, night/weekend rules and extras for each adopted DRIOZ chart. Provider "from" prices and example totals are insufficient to reconstruct missing formulas.
4. Display local currency consistently in estimate, accepted fare, driver offer, completion, cash confirmation, wallet, checkout and statement. Lock the chart at booking; future chart changes must not alter accepted fares.
5. Current checkout, customer wallet, driver commissions and payouts assume INR. International tariffs must not be activated by merely changing a symbol or placing foreign minor units into INR ledgers. Payment verification must compare both amount and currency.
6. Each country needs a coverage record. Countries without completed research remain explicitly unresearched; they must not silently inherit Indian or neighbouring-country prices. Lack of a verified tariff is not a per-booking administrator approval requirement.

## Current status

The user narrowed launch scope to researched markets. The implemented DRIOZ charts cover Dubai, Singapore, London, Sydney, Melbourne, Toronto GTA, Auckland, Tokyo and ten US metros. These are local DRIOZ commercial policies informed by the benchmarks, not representations of competitor quotes or whole-country availability. South Africa is excluded because its source needs reconfirmation.

Customer-facing cash fares use local currency. The existing INR accounting, wallet, checkout and driver settlement remain INR, with an explicit INR equivalent shown before booking/payment. FX is obtained from Frankfurter's public reference-rate API, cached six hours, rejected if older than ten days, and frozen in each booking. This is not local-currency card acquiring or foreign bank payout support. No new currency is inserted into an INR ledger.

Quotes are automatic for configured areas, without administrator price confirmation. The exact pickup must match the selected chart. Driver acceptance remains necessary. Existing unsupported-area enquiry endpoints remain for compatibility; no researched market uses that flow.

DRIOZ chart policies beyond fully specified public examples:
- London: GBP 45/hour, minimum two hours. Minimum is a DRIOZ policy; source only establishes a starting hourly rate.
- US: USD 55/hour, minimum two hours, prorated extra time; no membership discount.
- Dubai: published distance bands through 70 km, then AED 1.50 per extra km as a DRIOZ extension; hourly minimum two hours at AED 80/hour; eight hours AED 500, then AED 80/hour.
- Singapore: S$48 at 21:00–02:59 and S$58 otherwise; S$10 Sunday and manual supplements; hourly S$30 with three-hour minimum. No invented public-holiday calendar is applied.
- Sydney/Melbourne: DRIOZ one-way A$90 including 10 km, then A$3/km; hourly A$50 with two-hour minimum. This distance formula and minimum are DRIOZ choices informed by the A$90 minimum and A$400/eight-hour benchmarks, not published competitor formulas.
- Toronto: C$39.99 through 10 km, otherwise C$19.99 plus C$2.50/km; the 10–11 km gap is resolved by the DRIOZ policy. Hourly C$50, two-hour minimum, is a DRIOZ extension.
- Auckland: NZ$50 through 5 km, then NZ$2/km to 10 km, NZ$4/km to 20 km, NZ$55/15 per km thereafter. This continuous cash chart interpolates the source's examples; extra-distance continuation is a DRIOZ choice. Weekday 16:00–17:59 adds 15%. Hourly NZ$50, two-hour minimum, is a DRIOZ extension.
- Tokyo: JPY 4,000 through 5 km (dispatch plus driving), JPY 400 per started km thereafter. Hourly JPY 4,000, two-hour minimum, is a DRIOZ extension.

No Indian GST is added to these international chart totals; their statements are not labelled Indian GST tax invoices. Local tax compliance is not established by competitor benchmarks. Tolls/parking are reimbursed separately at the booking's frozen rate.
