# Driver mobile web reference lock

Target: the already-approved DRIOZ cream/forest/mint design and its existing wallet cards. Keep the brand artwork, existing authentication, money and booking rules.
References: user-approved DRIOZ prototype and wallet; Refero bundled craft-details.md (focus states, form affordances), icons.md (consistent 20–24px Lucide outline icons), and the native app's persistent primary-navigation pattern.

Decisions: four equal mobile bottom destinations (Home, Rides, Wallet, Account), always visible without horizontal scrolling; compact sticky brand/inbox header; safe-area padding so content is never behind navigation; 44–48px controls and 16px form text; wallet credit at the top of Home; optional GPS panel collapsed below requests; bank, transfers, recharge and long history progressively disclosed on Wallet. Support, documents and inbox remain reachable from Account. Desktop operations and customer booking layouts remain separate.

Validation: review 320, 390 and 430px widths and a desktop width; verify nav bounds, wallet link, active states, account/support/document routes, bottom clearance, no horizontal overflow and readable money amounts. Use local fixture previews only for design QA; do not insert fake driver accounts or bookings into production.

Verified 2026-10-21: production build passed; local actual-component fixtures checked at 320, 390 and 430px. Navigation stayed within viewport with no horizontal overflow, Wallet stayed accessible, ride filter states and wallet disclosures worked, active-ride primary action appeared above navigation, and wallet final content retained 30px clearance. Temporary fixtures removed before production build. No financial mutations were performed.
