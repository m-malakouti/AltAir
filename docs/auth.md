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

## Google sign-in (Chrome extension)

The account dialog includes a Continue with Google button, verified name/email,
and sign-out. This is Google identity sign-in for the extension; it does not yet
create or link a persistent backend account, grant access to backend APIs, or sync
workspace content. Existing phone/OTP development authentication is separate.
A single Google entry point handles choosing/authorizing a Google account; there
is no separate app registration database in this delivery.

### Beginner setup

1. Open `chrome://extensions`, enable Developer mode, and copy AltAir's extension ID.
2. Open Google Cloud Console and select the AltAir project. Use Google Auth Platform
   (not Google Maps and not the Maps billing setup).
3. Configure Branding, Audience and Data Access. For a personal test, choose External,
   keep the app in Testing, and add your own Google email as a test user. Request only
   `openid`, `email`, and `profile`.
4. Under Clients, create an OAuth client of type Chrome Extension (older screens may
   call it Chrome App). Enter the extension ID from step 1.
5. Copy the Client ID, which ends in `.apps.googleusercontent.com`. It is public
   configuration, not a Maps API key. No client secret belongs in extension source.
6. Put `WXT_GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID` in `.env.local`, rebuild with
   `npm.cmd run build`, and Reload the extension. Its ID must still match step 4.
7. Open a new tab, select the account icon and Continue with Google. Choose the test
   Google account and accept name/email access. Confirm name/email and test sign-out.

Without a client ID the button is visibly inactive and identity permissions are
not included. With configuration, `identity.getAuthToken` opens Google's consent
flow on user action, then HTTPS UserInfo verifies the subject and verified email.
Only a connection flag is saved in trusted `storage.session`; access tokens remain
in Chrome's identity cache. Restore is noninteractive; sign-out clears this app's
cached Google tokens and connection flag, not the browser's Google login. No remote
Google JavaScript is injected into extension pages. Nothing is sent to the OTP server.

This integration targets installed Chrome extensions. Localhost previews and Edge
are not supported by this getAuthToken integration; Edge needs a separate OAuth web
flow. Live sign-in, consent branding and extension ID matching require actual OAuth
configuration and have not been verified without it. Automated tests cover response
validation, cancellation, verified-profile retrieval and sign-out.

References:

- https://developer.chrome.com/docs/extensions/how-to/integrate/oauth
- https://developers.google.com/identity/openid-connect/reference
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support

### Google profile details

The verified UserInfo photo is displayed when it is an HTTPS Googleusercontent URL,
with an initial-letter fallback for missing or failed images. No additional Google
scopes are requested. After sign-in, an incomplete profile offers a manual birthday
and gender form, including a prefer-not-to-say option and the ability to skip.
Saved details can be edited later. The date picker uses the Persian calendar and Persian digits; the
saved birthday is displayed as a Persian calendar date. ISO Gregorian storage is preserved for compatibility. Both Google and OTP profile forms use the shared picker, with quick month/year selection and a 120-year birthday range. Calendar validity, future
dates, the 120-year boundary and gender values are validated before storage.

Details are stored only in browser.storage.local, under a key containing the stable
Google subject (`sub`), not the email address. Sign-out preserves those details for
the next sign-in of the same account. They are not uploaded, synced between devices,
or registered in the backend. Removing the extension can remove its local data.
