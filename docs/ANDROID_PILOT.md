# Android pilot build and acceptance

The pilot build uses Android package `de.acrosscc.clubhub`, version 0.3.0,
code 3. Build inputs must point to an isolated staging API and mail sink.
The installed app shows a staging banner and disables the production live
update channel. It bundles the same local content UI as the debug build.

Before building, assign a named signing custodian and backup custodian. Store
the keystore and password material outside the repository, with a recoverable
encrypted backup. Keep the same signing certificate for every later upgrade;
decide Play App Signing enrollment and upload-key custody before creating store
records. An Android debug key is a different signing identity and cannot
upgrade an installed pilot that uses the release key.

Run from `mobile/` after committing the exact source revision. Supply real
HTTPS staging endpoints and external signing credentials through your secret
manager; the shell variable names are shown here without values:
The content URL must serve the dynamic `/mobile-content/live/v1` feed; the
static `/mobile-content/v1` path is reserved for the packaged fallback.

```bash
ACC_PILOT_API_URL=... \
ACC_PILOT_CONTENT_BASE_URL=... \
ACC_PILOT_SITE_URL=... \
ACC_PILOT_KEYSTORE=... \
ACC_PILOT_STORE_PASSWORD=... \
ACC_PILOT_KEY_ALIAS=... \
ACC_PILOT_KEY_PASSWORD=... \
ACC_PILOT_SIGNING_OWNER=... \
npm run android:pilot
```

The command refuses missing inputs, a keystore inside the repository, a dirty
worktree, and production endpoint hosts. It builds and signs a release APK,
verifies its signature using Android build tools, and writes:

- `mobile/artifacts/acc-clubhub-0.3.0-pilot.apk`
- `mobile/artifacts/acc-clubhub-0.3.0-pilot.json` with package/version line,
  endpoint URLs, source revision, APK SHA-256 and signing certificate digest.

Keep both artifacts in access-controlled distribution storage. Do not send
keystore material or passwords with the APK. Installation can use
`adb install -r mobile/artifacts/acc-clubhub-0.3.0-pilot.apk`. If Android
reports a signature mismatch, check the currently installed certificate;
do not uninstall before preserving the prior pilot and investigating the key.

For each physical device, record model, Android version, install time,
package/version, signing digest, source revision, test account, and whether an
upgrade from the preceding pilot succeeded. Test first install, relaunch,
activity list/detail, official insurance acknowledgement, confirmed and
waitlisted registrations, admin login and logout, participant list, check-in,
cancel/restore, reschedule, event cancellation, reminders, keyboard/back
behavior, external website return, and weak/no network. Use isolated test
events and a mail sink for every write or notification. Compare resulting API
and website state, and record email sent/skipped/failed counts separately.
Collect rider and admin feedback and triage blockers before distribution.

The debug APK is a read-only preview of public production content. It can test
installation and browsing, but disables registration, subscription, and admin
writes, and is not the signed staging pilot.
Until a signing custodian, staging environment, prior pilot APK, and Android
device evidence are available, this gate remains pending. iOS TestFlight and
store artifacts are separate later gates under issue #174.
