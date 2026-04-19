# Domain Migration: `accross-cc.de` → `across-cc.de`

> **Status:** New domain `across-cc.de` purchased on 2026-04-19. Old domain `accross-cc.de` was live for ~1 week before typo was caught (extra `c` in "across").
>
> **Strategy:** Migrate to correct domain, 301 redirect from old, keep old domain renewed for 1 year as safety net.

---

## 1. Repo changes (hardcoded references to replace)

Global find/replace: `accross-cc` → `across-cc` in these files:

| File | Occurrences | Notes |
|---|---|---|
| `backend/config.py:20` | 1 | `PUBLIC_FRONTEND_URL` default |
| `backend/services/email.py` | 13 | 6× `noreply@events.accross-cc.de`, 3× `letusride@accross-cc.de`, 4× `frontend_url` default |
| `backend/tests/test_confirmation_email.py:13` | 1 | Test fixture |
| `frontend/src/pages/[lang]/privacy.astro` | 6 | zh/en/de contact email (2 each) |
| `frontend/src/pages/[lang]/about.astro:54` | 1 | About page email |
| `frontend/public/admin/config.yml:44-45` | 2 | Sveltia CMS `site_url` + `display_url` |
| `README.md` | — | Live site link |
| `MAINTENANCE.md` | — | Multiple refs to domain + email subdomain |
| `progress.md` | — | Historical log entries (keep as-is OR update — discuss) |
| `docs/**/*.md` | — | Plan docs; update current ones, leave archived ones alone |

**Verification command:**
```bash
grep -rn "accross-cc" --exclude-dir=node_modules --exclude-dir=.venv .
```

---

## 2. External systems (NOT in repo — must configure manually)

### 2.1 IONOS (DNS host)
- Dashboard: [ionos.de](https://ionos.de) → Domains & SSL → `across-cc.de` → DNS tab
- **Records to add on new domain** (mirror what `accross-cc.de` has):
  - **A record** `@` → `216.198.79.1` (Vercel)
  - **CNAME** `www` → Vercel target
  - **A record** `events` → Resend target (for email subdomain)
  - **TXT (DKIM)** for `events.across-cc.de` — value from Resend dashboard
  - **TXT (SPF)** for `events.across-cc.de`
  - **MX** for `events.across-cc.de`
- **Old domain (`accross-cc.de`):** after new domain is live, change A/CNAME to redirect target (or use Vercel's redirect feature on the old domain)

### 2.2 Vercel
- Project → Settings → Domains → add `across-cc.de` and `www.across-cc.de`
- SSL cert auto-issued
- **Environment variable to update** (Production + Preview):
  - `PUBLIC_FRONTEND_URL` = `https://www.across-cc.de`
- **Redeploy** after env var change
- For old domain: set 301 redirect to new domain

### 2.3 Resend (transactional email)
- Domain: `events.across-cc.de` — must be re-verified on new domain
- Dashboard: [resend.com](https://resend.com) → Domains → Add Domain
- Region: EU (Frankfurt) — same as old
- Copy DKIM/SPF/MX records to IONOS (see 2.1)
- **From address** will become: `noreply@events.across-cc.de`
- Old `events.accross-cc.de` sending domain: keep active during transition, remove later

### 2.4 Supabase (Auth)
- Dashboard → Authentication → URL Configuration
- **Site URL:** `https://www.across-cc.de`
- **Redirect URLs:** add `https://www.across-cc.de/auth/callback` (keep old for now)

### 2.5 GitHub OAuth (admin dashboard login)
- Registered callback URL per `docs/rebuild_plan/implemented/admin_portal_subplan.md:45`
- Update Authorized callback URL to `https://www.across-cc.de/auth/callback`
- Add new URL first, remove old after migration verified

### 2.6 Contact email `letusride@accross-cc.de`
- Decide: set up same mailbox on new domain (`letusride@across-cc.de`)?
- If yes: configure in IONOS mail settings, then update all `letusride@...` refs in repo
- Set forwarder on old mailbox → new address

---

## 3. Community-facing updates

- WeChat group announcement (quietly fix the domain without drawing attention)
- Xiaohongshu bio
- Google Business / local listings
- Any printed flyers / posters — reprint next batch with corrected URL
- Social media profiles

---

## 4. Recommended migration order (zero-downtime)

1. Add new domain to Vercel (keep old domain live)
2. Configure IONOS DNS for new domain (A/CNAME)
3. Re-verify Resend on `events.across-cc.de` (both email subdomains coexist temporarily)
4. Update Supabase Auth + GitHub OAuth to accept BOTH old and new callback URLs
5. Global grep/replace in repo → PR → merge → Vercel redeploys with new `PUBLIC_FRONTEND_URL`
6. Verify new domain works end-to-end (signup, email, login)
7. Configure 301 redirect on old domain
8. After 1–2 weeks of stable operation: remove old URLs from Supabase/GitHub OAuth allowed lists
9. After 1 year: decide whether to renew old domain or let it lapse

---

## 5. Reference docs in repo

- `MAINTENANCE.md` — DNS/Resend/SSL runbook (update after migration completes)
- `docs/deployment/phase_4_3_1_deployment_guide.md` — deployment flow
- `progress.md:75-79` — original go-live checklist (useful as migration template)
- `docs/rebuild_plan/implemented/admin_portal_subplan.md:45` — GitHub OAuth callback
- `docs/rebuild_plan/implemented/participant_portal_subplan.md:188` — `PUBLIC_FRONTEND_URL` env var

---

## 6. Rollback plan

If new domain has issues:
- Old domain `accross-cc.de` remains registered (renewed 1 year)
- Revert Vercel env var `PUBLIC_FRONTEND_URL` to old
- Revert Supabase Site URL
- Old DNS still resolves — site still works on old typo'd domain

Rollback window: as long as old domain is renewed (until 2027-04-ish).
