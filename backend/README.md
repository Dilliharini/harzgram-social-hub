# HarzGram Express + PostgreSQL API

This folder contains the optional REST backend for the existing HarzGram frontend. It uses Express, PostgreSQL, bcrypt password hashes, and server-side PostgreSQL sessions. The frontend remains in mock mode unless explicitly switched to the real API.

## Requirements

- Node.js 20 or newer
- PostgreSQL 13 or newer, running locally

## 1. Create the database

In PowerShell, create a local database using a PostgreSQL role that can create databases:

```powershell
createdb -U postgres harzgram
```

If `createdb` is not on `PATH`, use `psql` instead:

```powershell
psql -U postgres -c "CREATE DATABASE harzgram;"
```

Copy the environment template and edit `backend\.env` with your local database role/password and a newly generated session secret:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set `DATABASE_URL`, `SESSION_SECRET` (at least 32 characters), and `SEED_DEMO_PASSWORD` in that local file. The example file contains placeholders only. Do not commit `.env`.
Generate a session secret locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste its output into `SESSION_SECRET`.

## 2. Install backend dependencies and create tables

From the repository root:

```powershell
Set-Location backend
npm install
npm run db:setup
```

`db:setup` applies the idempotent `schema.sql` and tracked SQL migrations. Run it again after backend updates to apply new migrations; it preserves existing users and posts. It includes additive post image URL, image-only post, Stories, and notifications migrations. These migrations add columns/tables and indexes without resetting existing data. The API creates its PostgreSQL session table on first start. Deleting a post cascades to its comments and likes through existing foreign keys; uploaded local image files are removed only after the database deletion commits.

## 3. Add optional demo data

With `SEED_DEMO_PASSWORD` set in `backend\.env`, run:

```powershell
npm run seed
```

This inserts six sample accounts, example posts/comments, and follow relationships. Each sample account uses the `SEED_DEMO_PASSWORD` value you chose locally. The seeder stores only bcrypt hashes and can be rerun.

## 4. Start the API

From `backend\`:

```powershell
npm run dev
```

The API listens at `http://localhost:3000`; verify it with `Invoke-RestMethod http://localhost:3000/health`.

Post images are limited to 10 MB and must be JPEG, PNG, or WebP. The API validates image signatures, writes files under `backend\uploads` by default, and serves them from `/uploads/<generated-name>`. Only the image URL is stored in PostgreSQL. The upload directory is ignored by Git. To choose another local storage directory, set `UPLOAD_DIR` in `backend\.env` (relative paths are resolved from `backend\`). If the API is accessed using a different host or port, set `PUBLIC_API_URL` to its browser-reachable base URL and restart the backend; this value is saved with image posts.

`PUBLIC_API_URL` must be the API origin only, such as `http://localhost:3000`; `UPLOAD_DIR` defaults to `uploads`. The frontend mock still supports text-only posts, while image uploads require the real API (`VITE_USE_MOCK_API=false`).

Stories require the real API and are created with an image plus an optional caption. Images use the same JPEG/PNG/WebP validation and 10 MB limit as post uploads, and are stored in the local upload directory rather than PostgreSQL. Story records store only the image URL and metadata. Stories appear in the signed-in feed, can be opened and navigated with the story viewer, and expire 24 hours after posting. Expired stories are hidden immediately and their database records and local images are cleaned up at backend startup and every 15 minutes. Apply the Stories migration with `npm run db:setup` before starting the updated backend.

In-app notifications are created when another user likes or comments on your post, or follows you. Actions on your own content do not notify you. The signed-in user can list notifications, check their unread count, and mark individual or all notifications as read. Notifications link to the associated post when it still exists, or to the actor's profile for follows and posts that were deleted. No email or push notifications are sent.

## 5. Point the frontend at the API

In a second PowerShell window, from the repository root, create the frontend environment file:

```powershell
Copy-Item .env.example .env
```

Set these values in the root `.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK_API=false
```

The backend mounts the contract paths directly at its origin (for example `/auth/login` and `/feed`), so the base URL intentionally does not end in `/api`. Start the frontend from the repository root:

```powershell
npm run dev
```

The backend defaults CORS to `http://localhost:5173`. If Vite reports a different origin, set `FRONTEND_ORIGIN` in `backend\.env` to that exact origin and restart the backend. Cookie-based sessions are sent by the frontend using credentialed requests.

Remove the root `.env` or set `VITE_USE_MOCK_API=true` to return to mock mode. Keep local environment files and real credentials out of version control.

## API contract

All endpoints return JSON; errors have a `{ "message": "..." }` body. Except sign-up, sign-in, sign-out, current-user lookup, and health, routes require an authenticated session.

| Method   | Path                          | Result                                                                              |
| -------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `POST`   | `/auth/signup`                | Create account and session; returns `AppUser`                                       |
| `POST`   | `/auth/login`                 | Start session; returns `AppUser`                                                    |
| `POST`   | `/auth/logout`                | Destroy session; returns `{ "ok": true }`                                           |
| `GET`    | `/auth/me`                    | `AppUser` or `null`                                                                 |
| `GET`    | `/feed`                       | `FeedPost[]`, newest first                                                          |
| `GET`    | `/notifications`              | Up to 100 newest notifications for the signed-in recipient                          |
| `GET`    | `/notifications/unread-count` | `{ count }` unread notifications for the signed-in recipient                        |
| `PATCH`  | `/notifications/:id/read`     | Mark one of the signed-in recipient's notifications as read                         |
| `PATCH`  | `/notifications/read-all`     | Mark all of the signed-in recipient's notifications as read                         |
| `GET`    | `/stories`                    | Active `Story[]` for the signed-in user, grouped by author                          |
| `POST`   | `/stories`                    | Multipart `image` plus optional `caption`; returns the created `Story`              |
| `GET`    | `/posts/:id`                  | One `FeedPost`                                                                      |
| `POST`   | `/posts`                      | JSON `{ "text": "..." }` or multipart `text` / optional `image`; returns `FeedPost` |
| `DELETE` | `/posts/:id`                  | Deletes only the signed-in author's post and returns `{ ok, imageCleanupPending }`  |
| `POST`   | `/posts/:id/like`             | Toggle like; returns `{ likedByMe, likeCount }`                                     |
| `GET`    | `/posts/:id/comments`         | `PostComment[]`                                                                     |
| `POST`   | `/posts/:id/comments`         | Body `{ "text": "..." }`; returns `PostComment`                                     |
| `GET`    | `/users/:username`            | `UserProfile`                                                                       |
| `GET`    | `/users/:username/posts`      | `FeedPost[]`                                                                        |
| `GET`    | `/users?q=<query>`            | Matching `UserSummary[]`                                                            |
| `GET`    | `/users/suggested`            | Up to five `UserSummary` suggestions                                                |
| `POST`   | `/users/:username/follow`     | Toggle follow; returns `{ isFollowing, followerCount }`                             |

`joinedAt` and post/comment `createdAt` values are Unix timestamps in milliseconds, matching the frontend TypeScript contract.

Story `createdAt` and `expiresAt` values are also Unix timestamps in milliseconds. Story records expire exactly 24 hours after creation; expired rows are excluded from `GET /stories` even before background cleanup runs.

A post must include text, an image, or both. Text is limited to 280 characters; image-only posts are supported. Existing text-only JSON post requests remain supported.
