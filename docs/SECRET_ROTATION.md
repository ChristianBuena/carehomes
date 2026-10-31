# Secret Rotation Checklist

Written for release blocker S-5 (docs/RELEASE_READINESS.md). No secret values appear in this document. Only variable names and commit ids are listed.

## 1. What leaked

Found with `npm run scan:secrets:history` and `git log --all -- <path>`. These commits are on `origin`, so treat every value in them as public.

| File in history | Commits | Variable names it contained | Reachable from |
|---|---|---|---|
| `carehomes-support-docs/.env` | `fb6d8f7`, `9627451` | `DATABASE_URL`, `JWT_SECRET` (both); `EMAIL_USER`, `EMAIL_PASS` (from `9627451`) | `main` history (most branches) |
| `.env` | `c55dfb2`, `b09f8fc` (removed in `caa67e3`, `246a00c`) | `DATABASE_URL`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS` | `origin/merge/frontend-backend-unwired`, `origin/revert-9-merge/frontend-backend-unwired` |
| `docker-compose.yml` | `e639f34` (and all later commits until `0837177` on `release-blockers`) | Postgres password (`POSTGRES_PASSWORD`, and inside `DATABASE_URL`) | `main` and all current branches |
| `carehomes-support-docs/docker-compose.yml` | `93c7985` | Postgres password | `main` history |
| `carehomes-mvp/docker-compose.yml` | `0add5f9` | Postgres password | `main` history |
| `prisma/seed.ts` | every commit before `860ccde` | Admin, member and demo account passwords (not env vars) | all branches |

What was checked in the audit (by hash comparison, values never printed):

- `JWT_SECRET` and `EMAIL_PASS` in the leaked `.env` **differ** from today's local dev `.env`.
- `EMAIL_USER` and `DATABASE_URL` in the leaked `.env` **match** today's local dev `.env`.
- Production values: **not checked** (no access). You must compare them yourself.

Not leaked (never found in history): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_*`, `UPLOADTHING_TOKEN`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`. If you are not sure whether one of these was ever pasted into a commit, chat or ticket, rotate it anyway.

## 2. Rotation order

Rotate in this order. Each step lists where to change the value and what breaks.

| Step | Secret | Rotate if | Where to update | What breaks |
|---|---|---|---|---|
| 1 | Seeded accounts | Production or staging was ever seeded with the old `prisma/seed.ts` | Production database: find users with the old seed emails (the admin address in `prisma/seed.ts` before `860ccde`, `member@carehomesdocs.org`, `free@carehomesdocs.org`). Delete them, or reset their passwords | Nothing, unless a real person uses one of those accounts. Check first |
| 2 | Database password (`DATABASE_URL`, `POSTGRES_PASSWORD`) | Production or any shared database uses a password that appears in history (compare it yourself) | Database server (`ALTER ROLE ... PASSWORD`), then the host's secret store, then `.env.local` on every developer machine | App loses its DB connection between the role change and the redeploy. Do both in one maintenance window |
| 3 | `EMAIL_PASS` (Gmail app password) and `EMAIL_USER` | Always for `EMAIL_PASS` if production ever used the leaked value. `EMAIL_USER` is an address, not a secret, but the account behind it should get a new app password | Google account: revoke the old app password, create a new one. Then the host's secret store | OTP and notification emails fail until the new value is deployed, so **nobody can log in** during that gap (login needs the email OTP). Deploy immediately after creating the new app password |
| 4 | `JWT_SECRET` | Production ever used a leaked value. If you are unsure, rotate | Host's secret store. Generate with `openssl rand -base64 48` | **Every user is logged out** (all 7-day `auth-token` cookies and in-flight `mfa-pending` cookies become invalid). Users sign in again with password + OTP. No data loss. Do it at a quiet time and tell members |
| 5 | Stripe, Cloudinary, UploadThing keys | Not found in history. Rotate only if exposed elsewhere | Provider dashboards, then the host's secret store. For Stripe, roll the webhook signing secret together with the endpoint | Payments, uploads or webhooks fail between the roll and the redeploy |

After each step: redeploy, then log in once as a test user (password + OTP) and load the dashboard.

## 3. Creating the first admin safely

The seed (`npm run db:seed`) refuses to run when `NODE_ENV=production` and has no built-in passwords. For production:

1. Sign up through the normal `/signup` page with the admin's real email, using a strong password. MFA by email OTP applies as for any user.
2. Promote that one account with a single SQL statement, run by someone with database access. Replace the placeholder; check the row count is 1:

   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = '<admin email>';
   ```

3. Log out and back in (the role is stored in the session token; KNOWN_ISSUES "role from token").
4. Record who was promoted and when in the access review log.

For local development only: set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` (12+ characters each) in `.env.local`, then run `npm run db:seed`.

## 4. Optional: scrub the history (you run this, after rotating)

Rotating comes first. Scrubbing history does not un-leak a value that was already pushed and cloned. It only stops new clones from carrying it. These commands **rewrite history and need a force push**. They were not run as part of this work.

Before you start:

- Rotate everything in section 2 first.
- Tell every collaborator. After the force push, they must re-clone or hard-reset; old clones and forks still contain the secrets.
- Open pull requests will need to be recreated.
- GitHub keeps cached views of old commits. Ask GitHub Support to purge them if needed.

Using `git filter-repo` (install with `pip install git-filter-repo`), on a fresh mirror clone:

```bash
git clone --mirror <repo-url> carehomes-scrub.git
cd carehomes-scrub.git

# 1. Remove the leaked env files from every commit
git filter-repo --invert-paths \
  --path .env \
  --path carehomes-support-docs/.env

# 2. Replace the old hard-coded passwords wherever they appear.
#    Create replacements.txt yourself (one line per old value):
#      <old value>==>REDACTED
#    Do not commit replacements.txt.
git filter-repo --replace-text ../replacements.txt

# 3. Check, then push every ref
npm run scan:secrets:history   # run from a normal clone of the rewritten repo
git push --force --mirror
```

Also consider deleting the obsolete remote branches that only exist to carry old work: `origin/merge/frontend-backend-unwired` and `origin/revert-9-merge/frontend-backend-unwired` hold the root `.env` commits.

## 5. Prevent it happening again

- `.gitignore` ignores `.env*` except `.env.example`.
- `npm run scan:secrets` fails on secret-looking tracked content. Add it to CI or a pre-commit hook.
- Turn on GitHub secret scanning and push protection for the repository.
