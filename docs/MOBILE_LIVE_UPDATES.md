# Mobile Live Updates

ACC ClubHub 0.2.0 and later can install signed HTML, CSS, JavaScript, image, and
bundled-content updates without replacing the native Android app.

iOS skips this executable-update channel. Publish iOS UI and functionality
changes through a signed TestFlight/App Store build. Both platforms continue
to refresh the same content feeds independently of executable updates.

## Publishing flow

1. Merge a binary-compatible change under `mobile/` or `shared/` to `master`.
2. GitHub Actions builds the mobile web bundle on Linux.
3. The workflow signs the ZIP with the `MOBILE_LIVE_UPDATE_PRIVATE_KEY` secret.
4. The bundle, history manifests, and native-specific manifests are uploaded to the
   `mobile-live-production` GitHub release.
5. The installed app checks `latest.json` on launch, foreground resume, and
   network reconnection.
6. A valid bundle is downloaded in the background and selected for the next app
launch. A bundle that cannot report ready within 10 seconds is automatically
rolled back and blocked.

The workflow checks the public deployed content feeds, event index, API methods,
and Android CORS before publishing. Deploy the website first, the FastAPI
backend second, then run `npm run release:check` in `mobile/`. A passing check
proves public availability and contract presence, not authenticated writes or
email delivery. Those require separate isolated staging acceptance tests.

The About page displays interface and native-base versions and offers Check for
updates and Apply update. Applying requires a reload confirmation so unsaved
forms are not discarded automatically during an active session.

## Native compatibility channels

Native codes 2 and 3 use identical plugin dependencies and public signing keys;
their Android changes are version metadata and release signing configuration.
The same signed web bundle supports both:

- `latest.json` stays compatible with native code 2 and its original update client.
- `latest-native-2.json` and `latest-native-3.json` contain the same bundle with
  their respective native code.
- Updated clients choose a manifest using the actual installed native version,
  rather than the web bundle's build version.
- Each code has `manifest-<commit>-native-<code>.json` for rollback. Code 2 also
  retains `manifest-<commit>.json` for the legacy channel.

Do not add a code to `supported_native_version_codes` without comparing native
plugins, permissions, Capacitor configuration, and the embedded public key.

Content feeds continue to update separately from
`https://www.across-cc.de/mobile-content/live/v1/{locale}.json`.

## One-time signing setup

The public key in `mobile/live_update_public.pem` is embedded in the native app.
Its private key must never be committed. The matching repository secret is set
with:

```bash
gh secret set MOBILE_LIVE_UPDATE_PRIVATE_KEY \
  --repo GenLI3202/acc_clubhub \
  < .private/mobile_live_update_private.pem
```

Keep a secure offline backup of the private key. Losing or rotating it requires
a new native app because existing installations only trust the embedded public
key.

## Manual publishing and verification

The workflow can be run from GitHub Actions with `workflow_dispatch`. To package
locally after `npm run build`:

```bash
GITHUB_SHA=<full-commit-sha> \
LIVE_UPDATE_PRIVATE_KEY_PATH=../.private/mobile_live_update_private.pem \
npm run live-update:package
```

The packaging script verifies its own RSA-SHA256 signature before writing files
under `mobile/artifacts/live-update/`. It also records a SHA-256 checksum in the
manifest. The native plugin validates the signature before extracting a bundle.
The build includes `app-build.json`; packaging rejects a preview/staging build,
dirty source tree at build time, or a source revision different from `GITHUB_SHA`.
Commit the intended change and rebuild before signing.

## Rollback

Every deployment keeps native-specific history manifests and the corresponding
ZIP. To roll back code 3, copy its history manifest to `latest-native-3.json`;
for code 2, update both `latest.json` and `latest-native-2.json`. Upload these
manifests to the production release with `--clobber`. Keep the referenced ZIP
available. Devices select the signed bundle on their next update check.

## Native update boundary

Live updates currently support native version codes `2` and `3`. A new APK or
IPA is still required when changing native plugins, permissions, signing,
entitlements, the app icon, splash screen, or native Android/iOS source. In that
case, increment the native version code and update
`mobile/live_update.config.json` before publishing new web bundles.

A read-only 0.3.0 preview has OTA disabled and cannot bootstrap itself remotely.
Replace it once using `npm run android:connected` and the resulting APK. Keep the
same signing certificate and install over the existing app to preserve local
data. The connected base keeps native code 3 while the web interface is 0.3.1.
