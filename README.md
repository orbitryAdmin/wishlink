# Wishlist Studio

Wishlist Studio turns product links into shareable wishlists. Product details and wishlist data are
stored in PostgreSQL; cached product images remain in `./data/images`.

## Setup 

1. Install dependencies with `npm install`.
2. Start the local PostgreSQL service:

   ```bash
   docker compose up -d db
   ```

   Or use an existing PostgreSQL database and set its connection string in `.env`.
3. Set `DATABASE_URL` in `.env` to your PostgreSQL connection string (copy `.env.example` if you
   don't already have a `.env` file).
4. Run the checked-in database migrations:

   ```bash
   npm run db:migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

The app runs on `http://localhost:3002` in development and production.
`GET /health` checks PostgreSQL connectivity and returns `200` when ready or `503` when the database
is unavailable.

The app requires `DATABASE_URL` both when applying the schema and when running. The database
connection stays server-side; do not prefix it with `NEXT_PUBLIC_`. Optional Gemini settings and the
public app URL are documented in `.env.example`. The credentials in the Compose configuration are
for local development only.

## Manager login

The manager dashboard and wishlist editor require a single username and password. Set
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `AUTH_SECRET` in `.env` on the server. Generate a unique
session signing secret with `openssl rand -base64 32`; `AUTH_SECRET` must be at least 32 characters.
Do not use the example values in production. The login session is stored in a signed, HTTP-only
cookie and expires after seven days.
Changing the username, password, or signing secret invalidates existing sessions.

The shared wishlist URLs at `/w/<slug>` remain public. The dashboard, editor pages, and all wishlist
write actions require manager authentication.

## OCI deployment

The GitHub Actions workflow at `.github/workflows/deploy-oci.yml` deploys on pushes to `main` using a
self-hosted runner. Configure these GitHub Actions secrets in the `production` environment:

- `OCI_HOST` — OCI instance hostname or IP.
- `OCI_SSH_USER` — SSH user with access to the deployment directory and Docker.
- `OCI_SSH_KEY` — private SSH key for that user.
- `OCI_SSH_PORT` — optional SSH port (defaults to `22`).
- `OCI_REMOTE_APP_DIR` — writable deployment directory on OCI; use a path ending in `wishApp`.

Create an `.env` file in that OCI deployment directory with production values, including
`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `AUTH_SECRET`. The
workflow intentionally does not copy secrets to OCI.
The container uses `/wishApp` as its working directory, listens on port `3002`, runs pending Drizzle
migrations at startup, and keeps cached images in a persistent Docker volume. Ensure the OCI network
firewall allows port `3002` if the app should be reachable directly; normally put it behind a reverse
proxy.

## Scripts

- `npm run dev` — start Next.js in development mode.
- `npm run build` — create a production build.
- `npm run start` — start the production server.
- `npm run lint` — run ESLint.
- `npm run typecheck` — run the TypeScript checker.
- `npm run db:generate` — generate a SQL migration from schema changes.
- `npm run db:migrate` — apply generated migrations to the configured PostgreSQL database.
- `npm run db:push` — sync the schema directly (useful during local development).

For schema changes, update `src/lib/schema.ts`, run `npm run db:generate`, review and commit the
generated files in `drizzle/`, then run `npm run db:migrate`.
