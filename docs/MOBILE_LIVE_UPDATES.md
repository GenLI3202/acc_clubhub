# Mobile Live Updates

ACC ClubHub 0.2.0 and later can install signed HTML, CSS, JavaScript, image, and
bundled-content updates without replacing the native Android or iOS app.

## Publishing flow

1. Merge a binary-compatible change under `mobile/` or `shared/` to `master`.
2. GitHub Actions builds the mobile web bundle on Linux.
3. The workflow signs the ZIP with the `MOBILE_LIVE_UPDATE_PRIVATE_KEY` secret.
4. The bundle, immutable history manifest, and `latest.json` are uploaded to the
   `mobile-live-production` GitHub release.
5. The installed app checks `latest.json` on launch, foreground resume, and
   network reconnection.
6. A valid bundle is downloaded in the background and selected for the next app
   launch. A bundle that cannot report ready within 10 seconds is automatically
   rolled back and blocked.

Content feeds continue to update separately from
`https://www.across-cc.de/mobile-content/v1/{locale}.json`.

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

## Rollback

Every deployment keeps `manifest-<commit-sha>.json` and its corresponding ZIP
in the production release. To roll back, download the desired history manifest,
rename it to `latest.json`, and upload it to `mobile-live-production` with
`--clobber`. Devices will select that signed bundle on their next update check.

## Native update boundary

Live updates must remain compatible with native version code `2`. A new APK or
IPA is still required when changing native plugins, permissions, signing,
entitlements, the app icon, splash screen, or native Android/iOS source. In that
case, increment the native version code and update
`mobile/live_update.config.json` before publishing new web bundles.
