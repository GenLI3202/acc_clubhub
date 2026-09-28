# ACC ClubHub iOS release

## Current status

The Capacitor iOS project shares `mobile/src/` and the content feeds with Android.
No separate iOS content collection or backend is needed. Native archive/export
and device behavior remain unverified until Xcode and signing are configured.

## Prerequisites

1. Install Xcode 26 or newer from the Mac App Store. Launch it, complete its
   setup, and install iOS platform support and a Simulator runtime.
2. Sign in through Xcode Settings → Accounts with an Apple Developer Program
   account that can sign and distribute this app.
3. Confirm bundle ID `de.acrosscc.clubhub`, then register it with the team and
   create the matching App Store Connect app record. Do not create a second ID
   if a record already exists.
4. Install frontend and mobile dependencies with `npm ci` in each directory.

If the active tools point at Command Line Tools, use this shell setting:

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

## Build and export

From `mobile/`, set the actual team ID and an unused build number:

```bash
export IOS_TEAM_ID=YOURTEAMID
export IOS_BUILD_NUMBER=3
npm run ios:check
npm run ios:release
```

`YOURTEAMID` is a placeholder. The check validates Xcode, iOS SDK, dependencies,
and input format. Certificate and provisioning access are verified by Xcode
during the signed archive/export, not by the prerequisite check.

The release command rebuilds the shared UI/content, syncs Capacitor iOS,
archives a Release build, and exports an App Store Connect IPA under
`mobile/artifacts/ios-release/<build-number>/export/`. These files are ignored
by Git. Existing output directories are preserved; use a new build number on retry.
The command allows Xcode to manage provisioning using the account already
configured in Xcode. It does not upload or submit the app.

The existing `npm run ios:simulator` produces an unsigned Simulator `.app`.
That artifact cannot be installed on an iPhone.

## Device acceptance before distribution

- Compare the same locale and current content revision on Android and iPhone:
  Events, Media/Routes, Gear, Training, and About.
- Verify Chinese, English, and German; safe areas, small-screen layout, keyboard,
  scrolling, and navigation on iPhone.
- Verify offline first launch, cached reading, favorites, foreground refresh,
  reconnect refresh, and pull-to-refresh. Offline event registration stays disabled.
- Verify registration against an agreed test event; do not send trial registrations
  or subscriptions to real members without authorization.
- Verify system sharing, opening external links, and the calendar editor,
  including cancel/save. Test the minimum supported iOS version as well as current
  iOS before claiming compatibility; the project currently targets iOS 15.
- Verify `accclubhub://content/event/<slug>?lang=en` from both a cold launch and
  an already running app. Website Universal Links additionally need the actual
  team identifier in the site's `apple-app-site-association` file. No placeholder
  domain association should be deployed.
- Verify content continues refreshing while executable live updates are skipped
  on iOS. iOS feature changes ship through reviewed native builds.

If a device-only failure cannot be reproduced locally, create a tracking issue
with the device, iOS version, build number, and reproduction steps.

## TestFlight

Open the archive in Xcode Organizer and choose Distribute App → App Store Connect,
or upload the exported IPA with Apple's Transporter. Wait for processing, complete
the required compliance and beta information, and configure a testing group.
External testers may require Beta App Review. Enable a public invitation link
only after the build is approved and ready for testers.

Put that real invitation link behind the website's iOS test-download button.
Do not publish a fabricated link or present the IPA export as a public direct
installation download. Each TestFlight build expires after at most 90 days.

Before the App Store submission, complete screenshots, support/privacy URLs,
privacy declarations for the app and included SDKs, and review instructions.
Assess minimum-functionality requirements against the actual tested app.
For link-only club distribution, an Unlisted App request is an option after
preparing a production app; possession of the link does not enforce membership.

## Official references

- [Capacitor environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Apple distribution workflow](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Archive export files](https://help.apple.com/xcode/mac/current/en.lproj/deva1f2ab5a2.html)
- [TestFlight](https://developer.apple.com/testflight/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Unlisted App Distribution](https://developer.apple.com/support/unlisted-app-distribution/)
