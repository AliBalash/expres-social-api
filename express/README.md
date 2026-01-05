# bundle.social API gateway

TypeScript + Express backend that mirrors the bundle.social public API so you can create teams, connect social accounts, upload media, schedule posts, read analytics and verify webhooks from a single service. It exposes both the documented `/api/v1` endpoints and the legacy `/api/instagram` helpers for backwards compatibility.

## Requirements
- Node.js 18+
- bundle.social API key with the products you plan to automate (Instagram, uploads, analytics etc.)

## Setup
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the required keys:
   - `BUNDLESOCIAL_API_KEY` – API key from the dashboard.
   - `BUNDLESOCIAL_WEBHOOK_SECRET` – signing secret for `/api/webhook`.
   - Optional knobs:
     - `BUNDLESOCIAL_REDIRECT_URL` – fallback OAuth redirect URL.
     - `BUNDLESOCIAL_DEFAULT_TEAM_*` – default team name + tier.
     - `BUNDLESOCIAL_DEFAULT_PORTAL_LANGUAGE`, `BUNDLESOCIAL_PORTAL_*` – default branding for hosted portal links.
     - `BUNDLESOCIAL_DEFAULT_POST_*` – fallback post type/status/share-to-feed delays used by the Instagram helper router.
3. Start the server
   ```bash
   npm run dev        # ts-node + nodemon
   # or
   npm run build && npm start
   ```

The API listens on `http://localhost:3000` by default.

## API reference (`/api/v1`)
Base path for every endpoint below: `http://localhost:3000/api/v1`. All responses are JSON and errors are normalized by `errorHandler`.

### 9.1 App
- `GET /health` – health check straight from bundle.social (`status`, `createdAt`).

### 9.2 Organization
- `GET /organization` – subscription tier, quotas, teams, and owner metadata.

### 9.3 Team
- `GET /team` – list teams (`limit`, `offset`).
- `POST /team` – create a team (`name`, `tier`, optional `avatarUrl`, `copyTeamId`).
- `GET /team/:id` – retrieve a full team object including social accounts and bots.
- `PATCH /team/:id` – update name and/or avatar.
- `DELETE /team/:id` – delete a team.

### 9.4 socialAccount
- `POST /social-account/create-portal-link` – create a hosted portal link (pass `teamId`, `redirectUrl`, `socialAccountTypes`, optional branding flags).
- `POST /social-account/connect` – start the self-hosted OAuth flow (`teamId`, `type`, `redirectUrl`, optional `serverUrl` or `instagramConnectionMethod`).
- `GET /social-account/:id` – retrieve a social account including channels (requires `teamId` query param).
- `PATCH /social-account/:id` – update channel selection (`channelId`) and/or refresh channels (`refreshChannels: true`); requires `teamId`.
- `DELETE /social-account/:id` – disconnect the account from a team (requires `teamId`).

> ℹ️ For GET/PATCH/DELETE social-account routes you must supply `teamId` (query string or body) because bundle.social scopes every social account to a team.

### 9.5 Upload
- `GET /upload` – filter uploads by `teamId`, `status=USED|UNUSED`, or `type=image|video|document`.
- `GET /upload/:id` – inspect a single upload (size, mime, related posts).
- `POST /upload/create` – single request upload for small files (`multipart/form-data` with `teamId` + `file`).
- `POST /upload/init` – initialize a three-step upload for large files (`teamId`, `fileName`, `mimeType`).
- `POST /upload/finalize` – finalize the large upload (`teamId`, `path` returned from `/init`).

### 9.6 Post
- `POST /post` – create/schedule a multi-platform post. Pass the full body described in the bundle.social spec.
- `GET /post` – list posts for a team (`teamId` required, plus `status`, `platforms`, `limit`, `offset`, `orderBy`, `order`, `q`).
- `GET /post/:id` – retrieve per-platform data/status/errors.
- `PATCH /post/:id` – update the post body.
- `DELETE /post/:id` – delete before it publishes.
- `POST /post/:id/retry` – retry failed publications.

### 9.7 Analytics
- `GET /analytics/team/:teamId` – aggregated analytics for every platform connected to the team (returns per-platform entries + totals).
- `POST /analytics/team/:teamId/force-refresh` – force-refresh analytics for a platform (`platformType` in the body).
- `GET /analytics/social-account/:id` – profile analytics per social account (requires `teamId` query param).
- `GET /analytics/post/:postId` – post analytics across the platforms that were part of the post (optional `platformType` query to limit the response).
- `POST /analytics/post/:postId/force-refresh` – force-refresh post analytics (`platformType` in the body).

### 9.8 Comment
- `POST /comment` – create a comment across supported platforms.
- `GET /comment` – list comments for a team with filters (`teamId` required, optional `postId`, `status`, `platforms`, paging, search).
- `GET /comment/:id` – fetch a comment.
- `PATCH /comment/:id` – update comment content (if platform permits).
- `DELETE /comment/:id` – delete a comment.

### 9.9 Misc
- `GET /misc/timezones` – list supported time zones (`Intl.supportedValuesOf` when available, with sensible fallback).
- `GET /misc/platforms` – expose supported social account, analytics and comment platform enums (useful for UI dropdowns).
- `GET /misc/server` – basic server info (`now`, `uptimeSeconds`, `pid`).

### Webhook verification
- `POST /api/webhook` – receives raw JSON, verifies `x-signature` using HMAC SHA-256 and your `BUNDLESOCIAL_WEBHOOK_SECRET`, then echoes `{ received: true, type }`.

### Legacy `/api/instagram` helper router
The original Instagram-focused helpers still exist under `/api/instagram` for quick POCs:
- `GET /api/instagram/health`
- `GET /api/instagram/organization`
- `POST /api/instagram/teams`
- `GET /api/instagram/teams/:teamId`
- `POST /api/instagram/accounts/portal-link`
- `POST /api/instagram/accounts/channel`
- `POST /api/instagram/uploads/simple`
- `POST /api/instagram/posts[/(feed|reel|story)]`
- `GET /api/instagram/posts/:postId`
- `POST /api/instagram/posts/:postId/retry`

## Workflow: posting to Instagram
1. **Generate API key** – from bundle.social dashboard.
2. **Create a team** – `POST /api/v1/team` with `{ "name": "My Crew", "tier": "PRO" }`.
3. **Connect Instagram**  
   a. `POST /api/v1/social-account/create-portal-link` with `teamId`, `redirectUrl`, `socialAccountTypes: ["INSTAGRAM"]`.  
   b. Redirect the user to the returned portal URL, let them sign in, then handle the callback.  
   c. If multiple channels exist, call `PATCH /api/v1/social-account/{id}` with `{ "teamId": "<TEAM_ID>", "channelId": "<CHANNEL_ID>" }`.  
   d. Persist the returned `socialAccountId` for analytics/posts.
4. **Upload media**  
   - Small files (<90 MB): `POST /api/v1/upload/create` with multipart form (`teamId`, `file`).  
   - Large files: `POST /api/v1/upload/init`, `PUT` to the signed URL, then `POST /api/v1/upload/finalize`.
5. **Compose + schedule** – `POST /api/v1/post` with:
   ```json
   {
     "teamId": "<TEAM_ID>",
     "postDate": "2026-01-15T10:00:00Z",
     "status": "SCHEDULED",
     "title": "My Instagram Reel",
     "data": {
       "INSTAGRAM": {
         "type": "REEL",
         "text": "Check out our new product!",
         "uploadIds": ["<UPLOAD_ID>"],
         "shareToFeed": true,
         "collaborators": ["partner_username"],
         "tagged": [{"username": "friend", "x": 0.5, "y": 0.5}]
       }
     }
   }
   ```
6. **Monitor** – `GET /api/v1/post/{id}` to inspect per-platform status/errors.
7. **Handle errors** – inspect `errorsVerbose`, retry via `POST /api/v1/post/{id}/retry`, or mark the post as needed.

## Example upload call
```bash
curl -X POST http://localhost:3000/api/v1/upload/create \
  -F teamId=<TEAM_ID> \
  -F file=@/path/to/image.jpg
```
Response contains `{"id":"<UPLOAD_ID>"}` for reuse in `/api/v1/post`.

## راهنمای سریع (FA)
- آدرس پایه: `http://localhost:3000/api/v1`
- هلس چک: `GET /health`
- تیم‌ها: `GET|POST /team` و `GET|PATCH|DELETE /team/:id`
- اتصال شبکه اجتماعی: `POST /social-account/create-portal-link`, `POST /social-account/connect`, و `GET|PATCH|DELETE /social-account/:id` (با `teamId`)
- آپلود: `POST /upload/create` (مالتی‌پارت)، سه‌مرحله‌ای با `POST /upload/init` و `POST /upload/finalize`
- پست‌ها: `POST /post`, `GET /post`, `GET /post/:id`, `PATCH|DELETE /post/:id`, `POST /post/:id/retry`
- آنالیتیکس: `GET /analytics/team/:teamId`, `GET /analytics/social-account/:id?teamId=...`, `GET /analytics/post/:postId`
- کامنت‌ها: `POST/GET /comment`, `GET|PATCH|DELETE /comment/:id`
- ابزار کمکی: `GET /misc/timezones`, `GET /misc/platforms`, `GET /misc/server`

Use this summary if you prefer reading the workflow in Persian; the HTTP semantics match the English sections above.
