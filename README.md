# Video Progress Tracker

Udemy-style portal to share education videos from Google Drive with friends. They sign in (Firebase), watch courses, and progress is tracked so they can resume on re-login.

## What’s included

- **Monorepo:** `apps/web` (React + Vite), `apps/api` (Fastify), `packages/shared` (types).
- **Auth:** Firebase Authentication (email/password + Google). API verifies Firebase ID tokens.
- **Drive sync:** Admin API syncs course → section → subsection → videos from a Drive folder (see your `PLAN.md`).
- **Progress:** Stored in SQLite; resume and completion per video.

## Setup (what you need to paste)

See **[ENV_SETUP.md](./ENV_SETUP.md)** for:

- Firebase: web app config + service account key (for API).
- Google Drive: same key, Drive API enabled, folder shared with service account email.
- Where to paste each value in `apps/web/.env` and `apps/api/.env`.

## Run locally

**Prerequisites:** Node 18+, and either **pnpm** or **npm**.

1. **Env files**  
   - Copy `apps/api/.env.example` → `apps/api/.env` and fill in (see ENV_SETUP.md).  
   - Copy `apps/web/.env.example` → `apps/web/.env` and paste your Firebase web config.

2. **Install and DB**  
   ```bash
   # From repo root (use pnpm if you have it, else npm in each app)
   cd apps/api && npm install && npx prisma generate && npx prisma db push
   cd ../web && npm install
   cd ../../packages/shared && npm run build
   ```

3. **Start API and web**  
   - Terminal 1: `cd apps/api && npm run dev`  
   - Terminal 2: `cd apps/web && npm run dev`  

   API: http://localhost:3001  
   Web: http://localhost:5173 (proxies `/api` to the API).

4. **First course from Drive**  
   - Share your Drive course folder with the service account email.  
   - Call `POST /api/admin/sync` with body `{ "driveFolderId": "<folder-id>", "courseTitle": "Optional Name" }` and header `Authorization: Bearer <your-firebase-id-token>`.  
   - Set `ADMIN_UIDS` in `apps/api/.env` to your Firebase UID (get it from `GET /api/me` after signing in).

## Scripts (from root, with pnpm)

- `pnpm dev` – run API and web in parallel  
- `pnpm dev:api` / `pnpm dev:web` – run one app  
- `pnpm db:push` – sync Prisma schema to DB  
- `pnpm db:studio` – open Prisma Studio  

With npm, run `npm run dev` (and other scripts) from inside `apps/api` or `apps/web` as needed.
