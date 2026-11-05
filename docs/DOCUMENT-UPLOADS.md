# Document upload correction

Document files are capped at 4 MiB (4,194,304 bytes), consistent with the private storage adapter. Both clients previously advertised 5 MB, exceeding the adapter and Vercel request limit. Multipart endpoints allow 4,400,000 bytes including envelope overhead. Images/PDFs remain signature-validated by the server; access rules and the private bucket are unchanged.

Mobile uploads now validate non-empty file metadata, infer MIME when picker providers omit it, and use the actual File when running on web. The old shared app and new Partner app both need rebuilding to include client changes. Website rejects oversized files before sending. Both client helpers handle HTTP 413 before parsing JSON so Vercel rejections show a useful size error.

Live health check on 2026-11-01 reported database connected and documents configured. The existing storage bucket is private and allows PDF/JPEG/PNG. These checks do not prove every device upload works; run a small document upload on the rebuilt app and website to confirm end to end. No user documents were uploaded for diagnostics.
