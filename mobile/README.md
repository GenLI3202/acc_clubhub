# ACC ClubHub Mobile

Capacitor 8 application for Android and iOS. The app renders a local Preact
interface and consumes versioned, sanitized content generated from the Astro
Markdown collections. It does not load the production website inside a remote
WebView.

## Included in the test build

- German, English, and Chinese event, route, training, gear, and media content
- A bundled content snapshot for first launch and offline fallback
- Cached remote content with schema and minimum-version validation
- Automatic content refresh on launch, foreground resume, and network reconnect
- Signed over-the-air updates for binary-compatible app UI and interaction changes
- Pull-to-refresh from the top of every app page
- Five official sections: Events, Media with Routes, Gear, Training, and About
- Photography-led section heroes using the website's artwork and localized copy
- Local search and favorites
- Live event status and email-based registration
- Event-update subscription
- Native share sheet and calendar editor
- Custom-scheme and website deep-link handling
- External-browser isolation for hosted and third-party links

Admin dashboards, magic-link login, unsubscribe tokens, and other private pages
are intentionally not exposed in the app.

## Requirements

- Node.js 22 or newer
- Android: JDK 21, Android SDK Platform 36, and Build Tools 36
- iOS: a full Xcode installation with an iOS Simulator runtime

The application id and bundle id are `de.acrosscc.clubhub`. Confirm this id
before creating permanent store records or signing credentials.

## Commands

Run from `mobile/`:

```bash
npm install
npm run dev
npm test
npm run build
npm run sync
npm run android:debug
npm run ios:simulator
```

`npm run build` first builds the Astro frontend, copies the three generated
feeds and ACC logo into the mobile bundle, then type-checks and builds the local
Preact application.

The Android command writes the installable test package to:

```text
mobile/artifacts/acc-clubhub-0.2.0-debug.apk
```

The iOS simulator command uses unsigned simulator output under
`mobile/artifacts/ios-simulator/`. TestFlight still requires an Apple Developer
team, signing certificate, provisioning, and App Store Connect app record.

## Runtime configuration

Copy `.env.example` to `.env.local` only when an endpoint override is needed:

```text
VITE_API_URL=https://acc-clubhub-events-ms.vercel.app
VITE_CONTENT_BASE_URL=https://www.across-cc.de/mobile-content/v1
VITE_SITE_URL=https://www.across-cc.de
```

The defaults match production, so no environment file is required for the
standard test build.

## Independent content synchronization

The installed app does not connect to a developer computer. Content follows
this publishing path:

1. Editors update the existing Astro Markdown collections.
2. The frontend deployment generates the sanitized, versioned feeds at
   `/mobile-content/v1/{locale}.json`.
3. The app downloads the selected locale directly from the public website.
4. A valid response replaces the last-known-good cache; failed requests keep
   cached or bundled content available.

The app refreshes on launch, when returning to the foreground, after a network
reconnection, or when the page is pulled down from the top. Normal content
changes do not require a new APK. The frontend version containing the feed
route must be deployed before network synchronization can succeed.

## Online app updates

Version 0.2.0 includes a native live-update client. After a mobile or shared-code
change is merged to `master`, GitHub Actions builds and signs the web bundle and
publishes it to the `mobile-live-production` release. Installed apps check that
channel on launch, foreground resume, and network reconnection. A valid update
is downloaded silently and becomes active the next time the app is opened.

The app only accepts bundles from the configured repository and native version,
and verifies them with the RSA public key embedded in the installed binary. A
failed bundle automatically rolls back to the built-in version. See
[`docs/MOBILE_LIVE_UPDATES.md`](../docs/MOBILE_LIVE_UPDATES.md) for signing-key
setup, publishing, and rollback operations.

Changes to native plugins, system permissions, entitlements, icons, splash
screens, or Android/iOS code still require a new APK or IPA. Content, layout,
navigation, CSS, images, and binary-compatible JavaScript changes do not.

## Deep-link verification

The native projects already register:

- `accclubhub://content/{type}/{slug}?lang={locale}`
- `https://across-cc.de/...`
- `https://www.across-cc.de/...`

The custom scheme works in internal testing. Verified Android App Links and iOS
Universal Links additionally require domain files that contain production
signing identifiers:

- `/.well-known/assetlinks.json` with the release certificate fingerprint
- `/.well-known/apple-app-site-association` with the Apple Team ID and bundle id

Add those files only after the final signing identities exist; placeholder
identifiers would cause verification to fail.

## Security boundaries

- Remote production pages are never placed in Capacitor's `server.url`.
- Live-update bundles must pass RSA-SHA256 signature verification before use.
- Markdown is sanitized during feed generation and again before local rendering.
- Incompatible content schemas are rejected and fall back to a last-known-good
  or bundled feed.
- Registration is disabled when live server state cannot be checked.
- Only internet and network-state Android permissions are present. Calendar
  creation uses the operating system editor, so broad calendar read access is
  not requested.
- iOS includes the required UserDefaults privacy-manifest declaration for local
  favorites and language preferences.
