# Local registration and OTP login

The account entry is in the New Tab right column and in the Side Panel and Popup.
Mobile number -> OTP -> first name, last name, birth date, gender for new accounts.
Existing accounts return directly to their profile. Closing the dialog preserves
the in-progress form until the page closes. Local workspace tools do not require login.

## Current delivery mode

There is **no SMS provider configured**. All /api/auth routes are restricted to
Development plus a loopback client address. The UI clearly labels the returned
code as a local test code, not a sent SMS. Production/remote requests return 503.
No SMS is sent and no external account is created. Do not deploy this development
auth implementation as production authentication.

## API and storage

- POST /api/auth/request: normalized Iranian mobile number, random six-digit OTP,
  5-minute expiry, 60-second resend interval, maximum 5 issuances per phone/hour.
- POST /api/auth/verify: opaque 256-bit challenge ID and OTP; at most 5 attempts,
  single-use verification under a lock, resend invalidates previous challenges.
- GET /api/auth/me: bearer session and optional completed profile.
- POST /api/auth/profile: authorized, create-once profile; server validates names,
  birth date (ISO Gregorian, up to 120 years ago), gender allowlist.
- POST /api/auth/logout: revokes current session.
- All routes: 30 requests per client IP/minute, no-store responses.
- Random 256-bit session tokens are hashed in memory. Pending registration
  sessions last 1 hour; existing-account login sessions last 24 hours.
- Frontend token storage uses browser.storage.session (default trusted extension
  contexts only), or sessionStorage in localhost previews. Never storage.sync.
- Profiles persist as a Data Protection encrypted file in ignored
  server/AltAir.MarketApi/App_Data/auth. Key files are in its keys directory and
  protected with Windows DPAPI on Windows. Never commit either.
- OTPs, quotas and sessions are in memory and reset on server restart. Profile
  files survive restart. This local file store supports one server process only.

## Before production

Choose an SMS provider/template and configure credentials exclusively on the
server. Replace the development delivery response (never return a real OTP),
introduce a database and durable distributed challenge/limit/session storage,
configure HTTPS and exact allowed extension/web origins, and add provider failure
and delivery integration tests. SMS verification in this build proves only
knowledge of the displayed local code, not ownership of a phone.

References: [ASP.NET Core Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/consumer-apis/overview)
and [Chrome session storage](https://developer.chrome.com/docs/extensions/reference/api/storage).
