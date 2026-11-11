# Tasklync deep linking: deployment guide

Canonical URLs (permanent, entity based):

| Entity | Share URL | In-app route |
|---|---|---|
| Worker | `https://tasklync.pk/worker/<id>` | `/worker/<id>` |
| Company | `https://tasklync.pk/company/<id>` | `/company/<id>` |

The app accepts exactly these shapes (`src/utils/shareLinks.ts`). Anything else on `tasklync.pk` opens Home.
`www.tasklync.pk` should 301 to the apex on the web tier but is also verified in case an old share arrives.

## 1. Files to serve on `tasklync.pk` (and `www`)

Both must be served over HTTPS, **no redirects**, status 200.

| Path | Content-Type | Template |
|---|---|---|
| `/.well-known/assetlinks.json` | `application/json` | `assetlinks.json` |
| `/.well-known/apple-app-site-association` | `application/json` (no `.json` extension) | `apple-app-site-association` |

Fill in before deploying:
- **`REPLACE_WITH_SHA256_CERT_FINGERPRINT`**: the SHA-256 of the key that signs the **release** build.
  With Play App Signing use *Play Console → Release → Setup → App signing → App signing key certificate*
  (not the upload key). For EAS-signed builds: `eas credentials -p android`. Add the upload/debug
  fingerprints as extra array entries only for internal testing.
- **`REPLACE_WITH_APPLE_TEAM_ID`**: Apple Developer → Membership → Team ID. Bundle id is `com.tasklync.user`.

## 2. Share page (backend contract): `GET /worker/:id` and `GET /company/:id`

One HTML response serves three audiences. Requests that reach this handler are those where the app did **not**
open (no app installed, desktop, or a crawler such as WhatsApp).

1. Resolve the entity server side from the id (worker-service / company profile). Never trust the path.
2. **Found and public**: HTTP 200 with dynamic Open Graph tags:
   ```html
   <meta property="og:type" content="profile">
   <meta property="og:site_name" content="Tasklync">
   <meta property="og:title" content="Ali Khan · Electrician on Tasklync">
   <meta property="og:description" content="4.8 ★ (132 reviews) · Starting from PKR 800/hr · Verified">
   <meta property="og:url" content="https://tasklync.pk/worker/<id>">
   <meta property="og:image" content="https://cdn.tasklync.pk/og/worker/<id>.jpg">   <!-- 1200x630, https, < 300 KB -->
   <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
   <meta name="twitter:card" content="summary_large_image">
   <link rel="canonical" href="https://tasklync.pk/worker/<id>">
   ```
   Only public fields (name, category, rating, city, avatar). No phone, address, email or exact location.
3. **Not found, blocked, suspended or deleted**: HTTP 404 (or 410 for deleted) with a generic Tasklync page and
   `noindex`. Never reveal why. The app shows its own "Worker Profile Not Found" state in the same cases.
4. Invalid id shape (not `[A-Za-z0-9_-]{6,64}`): 404 without querying the database.
5. Crawlers (`WhatsApp`, `facebookexternalhit`, `Twitterbot`, `TelegramBot`, `Slackbot`) get the OG HTML and no redirect.
6. Cache: `Cache-Control: public, max-age=300, stale-while-revalidate=3600`; purge on profile change.

A ready reference page with the mobile redirect logic is in `share-page.html`: on Android it fires an
`intent://` URL (opens the app, or falls back to Play with the install referrer); on iOS it tries
`tasklync://` and keeps the page with a "Get the app" button if the app does not open.

### Fallback buttons on the page

- **Android**: "Get the app" links to
  `https://play.google.com/store/apps/details?id=com.tasklync.user&referrer=link%3D%2Fworker%2F<id>`
  (URL-encode `link=/worker/<id>` once). This is the deferred deep link: the app reads it with the Play
  Install Referrer on first launch.
- **iOS**: on tap of "Get the app", run `navigator.clipboard.writeText('https://tasklync.pk/worker/<id>')`
  then navigate to the App Store URL. The app reads the URL on first launch (iOS is best effort: the user may
  overwrite the clipboard). Show a one-line note: "Link copied. Open Tasklync after installing."
- **Installed users on iOS/Android** never see this page (the OS opens the app). If the OS did show it
  (e.g. link opened inside an in-app browser), "Open in app" is `tasklync://worker/<id>`.
- **Desktop**: show the profile summary and the two store badges.

## 3. Verification

```bash
# Android: after install of a release build
adb shell pm get-app-links com.tasklync.user          # expect: tasklync.pk: verified
adb shell pm verify-app-links --re-verify com.tasklync.user
adb shell am start -a android.intent.action.VIEW -d "https://tasklync.pk/worker/<id>" com.tasklync.user

# iOS: validate the AASA file as Apple's CDN sees it
curl -sI https://app-site-association.cdn-apple.com/a/v1/tasklync.pk
xcrun simctl openurl booted "https://tasklync.pk/worker/<id>"

# Both: files reachable, correct type, no redirect
curl -sI https://tasklync.pk/.well-known/assetlinks.json
curl -sI https://tasklync.pk/.well-known/apple-app-site-association
```
Google's checker: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://tasklync.pk&relation=delegate_permission/common.handle_all_urls`

## 4. Release steps

1. Deploy the two `.well-known` files and the share page; confirm section 3 curl checks.
2. `npx expo prebuild --clean` is not required; EAS build applies `associatedDomains` and `intentFilters` from `app.config.ts`.
3. Build with EAS (a new native build is required: `expo-application` was added and the manifest/entitlements changed).
4. Set `IOS_APP_STORE_ID` in `src/utils/shareLinks.ts` once the App Store listing exists.
5. Test matrix below on release-signed builds (App Links only verify for the signed certificate).

## 5. Test matrix

| Scenario | Expected |
|---|---|
| Installed, signed in, app killed, tap link | App cold-starts, Home, then the exact worker profile opens |
| Installed, signed in, app running, tap link | Profile opens on top of current screen |
| Installed, signed out, tap link | Welcome/login; after sign-in the profile opens |
| Not installed (Android), tap link → Play → install → open | Profile opens after sign-in (Install Referrer) |
| Not installed (iOS), tap link → copy → App Store → open | Profile opens after sign-in (clipboard; best effort) |
| Link to deleted/blocked worker | App: "Worker Profile Not Found"; web: 404 |
| `https://tasklync.pk/worker/../x`, `/booking/<id>`, other host | Never opens an entity; Home |
| WhatsApp paste | Rich card with title, description, image |
