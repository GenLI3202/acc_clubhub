# Issue #174 implementation baseline

Observed 2026-09-28 on branch `phase-13/issue-174-android`.
Production probes were read-only: `GET /openapi.json`, `GET /api/events?limit=1`,
and `GET /mobile-content/v1/en.json`. They returned HTTP 200. The deployed
OpenAPI has 50 paths, including `/auth/email-login`, `/auth/me`, `/auth/logout`
and the current administrator event routes. The English feed is schema v1
with 74 items, including 22 events. These probes do not establish that the
current branch has been deployed or that write and authentication flows work.

The existing website login accepts an allowlisted email and a shared password,
sets a secure HTTP-only `admin_session` cookie, and uses a 24-hour JWT. Its
database state allows one active administrator session. A newer website or
mobile login supersedes the prior one; logout revokes only the currently active
session. The API currently sends wildcard public CORS with credentials disabled,
so a local Capacitor origin cannot rely on cross-origin browser cookies.

The branch therefore adds `/auth/mobile-login` and `/auth/mobile-logout` and
allows `Authorization: Bearer` on existing protected routes. The bearer token is
the same JWT and active-session policy as the website cookie. The mobile client
must keep it in memory and clear it on logout, expiry, or authorization failure;
it must not put it in a bundled file, URL, or unencrypted preferences. The
production OpenAPI probe did not show these routes, so their deployment remains
unverified. Authentication from a physical Android shell also remains untested.

The mobile feed is generated from published Markdown using the existing
recurrence resolver. It is bundled in the APK and refreshed from the website.
An event slug links feed content to a live database row. This branch adds a
website endpoint that returns exact published occurrence metadata, including
capacity, deadline and official-ride status. The backend checks that endpoint
before public RSVP or live event detail, rejects unpublished and unavailable
content, and uses only the published metadata for event creation or updates.
Newly published events can return live status before the first RSVP creates a
database row. Website and Android requests now send only rider data and slug;
legacy metadata fields are accepted but ignored. Deploy the website endpoint
before the backend change. The endpoint and backend contract are verified
locally but are not deployed, and no staging write path has been exercised.

Build prerequisites: Node 22+, JDK 21, Android SDK Platform/Build Tools 36.
The working Python 3.13 test environment is `/private/tmp/acc-issue174-venv`.
An Android device, staging API and mail sink, pilot signing owner and key,
and an earlier pilot APK for upgrade tests have not yet been established.
iOS/TestFlight and store preparation remain later gates for the parent issue.
