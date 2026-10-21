# Booking location and time interaction fixes — 21 October 2026

Reference lock: retain the approved DRIOZ forest green, cream, typography, spacing and compact booking flow. Search is the primary entry point; GPS is an explicit alternative; map adjustment remains optional. No new marketing sections.

Public references reviewed:
- Uber Help, suggested pickups: https://help.uber.com/en-GB/riders/article/what-are-suggested-pickup-location?nodeId=9edf05bf-ac3a-4cf8-b08e-76e9ca767f7f — searchable alternative pickup points.
- Ola official blog, Ride Whenever Wherever: https://blog.olacabs.com/ride-whenever-wherever/ — search or map pin. Historical guidance, not a claim about the current app screen.
- Rapido website: https://www.rapido.bike/Home — distinct pickup and drop inputs.
- DriveU Reserve: https://reserve.driveu.in/ — pickup date/time and staged booking; https://www.driveu.in/faqs/ for the service journey.

Decisions:
- Keep two obvious location methods, address search and current location; do not require GPS permission for address search.
- Reuse the live website Google Places integration inside an isolated app search screen; no copied browser keys in app source or loosened API restrictions. Validate origin, message type, coordinates and labels before selection.
- Mount the native map only when requested, rather than on every search.
- Confirm the chosen address explicitly; dismissing the screen preserves the prior location.
- Loop minute, hour and AM/PM wheels; keep calendar dates bounded so past dates cannot wrap in.
- Recenter repeated wheel rows only after settling; reuse date formatters and stable date lists.
- Preserve identity during temporary auth failures and deduplicate account refresh requests.
