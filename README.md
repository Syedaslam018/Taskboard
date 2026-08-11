# TaskBoard — Real-Time Task & Collaboration Board

A Trello/Jira-inspired collaborative project management app: workspaces, boards, tasks,
real-time updates via Socket.io, and role-based access control.

> **Status:** This repo currently implements **Phase 1 (project setup) and Phase 2
> (authentication)** end-to-end and verified with a passing test suite. Phases 3–9
> (workspaces/RBAC, boards/tasks, drag-and-drop, sockets, notifications, dashboard,
> Docker/seed/prod hardening) are scaffolded as clear extension points (see
> `server/src/app.ts` route comments) and are the next increments — see
> [Roadmap](#roadmap) below for the exact plan.
>
> Building the whole spec in one pass would mean generating thousands of lines of
> business logic (RBAC middleware, Kanban reordering, six more Mongoose models, ten+
> Socket.io events, notifications, a full dashboard, and a real test suite) with no
> chance to verify any of it actually works. Auth is the foundation everything else
> sits on, so it's built first, for real, with tests — and each following phase will
> get the same treatment.

## Architecture

```
React Client (Vite, TS)
     |
     | REST API (Axios, JWT Bearer + httpOnly refresh cookie)
     v
Express Server (TS)
     |
     +-- Middleware: helmet, cors, rate limiting, validation, auth
     +-- Controllers -> Services (business logic) -> Mongoose Models
     +-- Centralized error handler
     |
     v
MongoDB (Mongoose)
```

Socket.io will attach to the same HTTP server in Phase 6 (`server.ts` has the hook
point already marked).

### Why this auth design

- **Access token**: short-lived JWT (15m default), returned in the JSON body and kept
  **only in memory** (Zustand store) on the client — never in `localStorage`, so it
  isn't readable by an XSS payload that can execute JS but not read `httpOnly` cookies.
- **Refresh token**: longer-lived JWT (7d default), set as an `httpOnly`, `SameSite=Lax`
  cookie scoped to `/api/auth`. The client's Axios interceptor calls `/api/auth/refresh`
  automatically on a 401 and retries the original request once.
- **Password storage**: bcrypt with 12 salt rounds. `passwordHash` has `select: false`
  in the schema and is also stripped in `toJSON`, so it's excluded by default and
  scrubbed from every serialized response as a second layer of defense.

## Folder Structure

```
project-root/
├── client/               # React + TS + Vite
│   └── src/
│       ├── components/
│       ├── pages/         # LoginPage, RegisterPage, DashboardPage
│       ├── hooks/         # useAuth.ts (TanStack Query)
│       ├── services/      # api.ts (axios + refresh interceptor), authService.ts
│       ├── stores/        # authStore.ts (Zustand)
│       ├── types/
│       └── router/
├── server/                # Express + TS
│   └── src/
│       ├── config/        # env.ts, db.ts
│       ├── controllers/   # auth.controller.ts
│       ├── middleware/    # auth.ts, validate.ts, errorHandler.ts
│       ├── models/        # User.ts
│       ├── routes/        # auth.routes.ts
│       ├── services/      # auth.service.ts
│       ├── sockets/        # (Phase 6)
│       ├── utils/         # AppError.ts, catchAsync.ts, apiResponse.ts, token.ts
│       └── validators/    # auth.validators.ts (Zod)
├── docker-compose.yml
└── README.md
```

## Database Schema (current)

```
User
- _id
- name
- email          (unique, indexed)
- passwordHash   (select: false, never serialized)
- avatar?
- createdAt / updatedAt
```

Phase 3+ adds `Workspace`, `Board`, `Column`, `Task`, `Comment`, `Notification`, and
`Activity`, exactly as specified, with the indexes called out in the original spec
(`boardId+columnId` on Task, `userId+read` on Notification, etc.).

## API Documentation (current)

All responses follow:
```json
{ "success": true, "data": {}, "message": "..." }
{ "success": false, "message": "..." }
```

| Method | Route              | Auth | Description                          |
|--------|---------------------|------|---------------------------------------|
| POST   | `/api/auth/register`| No   | Create account, sets refresh cookie   |
| POST   | `/api/auth/login`   | No   | Log in, sets refresh cookie           |
| POST   | `/api/auth/logout`  | No   | Clears refresh cookie                 |
| POST   | `/api/auth/refresh` | Cookie | Issues a new access token           |
| GET    | `/api/auth/me`      | Bearer | Returns the current user            |
| GET    | `/api/health`       | No   | Liveness check                        |

Auth endpoints are rate-limited (20 requests / 15 min / IP).

## Environment Variables

See `server/.env.example`:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskboard
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
COOKIE_SECURE=false
```

## Running Locally

```bash
# Server
cd server
cp .env.example .env
npm install
npm run dev          # http://localhost:5000

# Client (separate terminal)
cd client
npm install
npm run dev           # http://localhost:5173
```

You'll need a local MongoDB instance (or use Docker below) matching `MONGO_URI`.

## Docker

```bash
docker compose up
```

Starts MongoDB, the API on `:5000`, and the client dev server on `:5173`.

## Testing

```bash
cd server
npm test
```

`server/tests/auth.test.ts` spins up an in-memory MongoDB (`mongodb-memory-server`)
and covers: successful registration (and that `passwordHash` never leaks), duplicate
email rejection (409), login with correct/incorrect password, and `/me` being blocked
without a token and working with one. This is a real, currently-passing suite — not a
placeholder.

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Vite/Express/Mongo/Docker/ESLint/Prettier scaffold | ✅ Done |
| 2 | Auth: register/login/logout/refresh/me, bcrypt, JWT, protected routes | ✅ Done |
| 3 | Workspace model, membership, RBAC middleware (OWNER/ADMIN/MEMBER/VIEWER) | ⏭ Next |
| 4 | Boards, Columns, Tasks CRUD, IDOR-safe workspace scoping | Planned |
| 5 | Drag-and-drop, position/ordering, optimistic updates + rollback | Planned |
| 6 | Socket.io: rooms per workspace, task/comment events, presence | Planned |
| 7 | Notifications, activity feed, search/filter with debouncing | Planned |
| 8 | Dashboard, performance pass (`.lean()`, indexes, memoization), broader tests | Planned |
| 9 | Seed script, production Docker hardening, final docs | Planned |

Say "continue to Phase 3" (or name any phase) and I'll build it the same way: real
models, real authorization checks, real tests, verified before moving on.

## Interview Questions & Answers

**1. Why keep the access token in memory instead of localStorage?**
`localStorage` is readable by any JS running on the page, so an XSS vulnerability
anywhere in the app (even a third-party script) can exfiltrate it. Keeping it only in
a Zustand store means it disappears on refresh but can't be read by a script that
doesn't already have code-execution inside your React tree in the same tick — and it
pairs with a short (15 min) expiry so a leaked token is only useful briefly. The
refresh token, which is longer-lived and thus more dangerous if stolen, is `httpOnly`
so JS can't touch it at all.

**2. Why a separate refresh token flow instead of one long-lived JWT?**
A single long-lived token is a bigger blast radius if stolen and can't be revoked
without a blocklist. Splitting into a short access token + longer refresh token means
compromise of the access token self-heals in minutes, and the refresh token is
protected by `httpOnly`/`SameSite` cookie flags that JS-based attacks can't read.

**3. How would you prevent IDOR on workspace-scoped resources (e.g. `/api/boards/:id`)?**
Never trust the ID alone. Every board/task query is combined with the requesting
user's membership in the parent workspace — either a Mongo query that filters by
`workspaceId: { $in: userWorkspaceIds }` or an explicit membership check in
middleware before the controller runs. Returning a 404 (not 403) for boards outside
a user's access also avoids leaking which IDs exist.

**4. Why services separate from controllers?**
Controllers are HTTP plumbing — parse the request, call a service, shape the
response. Business logic (password hashing, token issuance, "does this email already
exist") lives in services so it's independently testable and reusable (e.g., a seed
script or a background job can call `authService.register` without spinning up
Express).

**5. How do you keep the Kanban board fast with real-time updates?**
Optimistic UI updates so drag-and-drop feels instant, TanStack Query cache
invalidation scoped to the specific board/task rather than the whole cache, and
componentizing so only the moved task's card re-renders — not the whole column list.
On the backend, moving a task is a single targeted update (new `columnId`/`position`)
rather than rewriting every task's position, and Socket.io only broadcasts to the
`workspace:{id}` room, not globally.

**6. Why validate with Zod on both client and server?**
Client-side validation is UX (instant feedback); it is not a security boundary
because anyone can call the API directly with curl/Postman. The Zod schemas in
`server/src/validators` are what actually protect the database, and — since they're
plain TS/Zod — the *type* can be shared or mirrored on the frontend for free type
safety without re-implementing the rules.

**7. Walk me through what happens end-to-end when a user logs in.**
Client submits credentials → Zod validates the request shape server-side → 
`authService.login` looks up the user (`+passwordHash` explicitly selected since
it's excluded by default), compares via `bcrypt.compare` → on success, signs an
access token and a refresh token → refresh token set as an `httpOnly` cookie,
access token returned in the JSON body → client stores the access token in memory
and stores user info via TanStack Query's cache → subsequent requests attach
`Authorization: Bearer <token>` via the Axios interceptor.

**8. How would you handle two users editing the same task at the same time (Phase 6+)?**
Broadcast every mutation (`task:updated`) to the room immediately after it's
persisted, so both clients converge on the same MongoDB-backed state within one
round trip. For fields prone to conflict (e.g. simultaneous edits to a description),
last-write-wins is acceptable for a Kanban tool; anything requiring true concurrent
editing (like a shared text field) would need operational transforms or CRDTs, which
is out of scope here but worth mentioning as a known limitation.

**9. Why MongoDB over a relational database for this app?**
The data is naturally document-shaped and read-heavy per-entity (a task with its
comments, a board with its columns) with relatively few complex joins — workspace →
board → task is a shallow, mostly-one-directional reference chain, which Mongoose
`populate()` (used sparingly) handles well. The tradeoff is weaker
transactional/relational guarantees, which matters less for a Kanban tool than for,
say, financial data.

**10. What would you change before this went to real production?**
Add centralized structured logging (pino/winston) and request IDs, move rate-limit
state to Redis so it works across multiple server instances, add refresh-token
rotation with reuse detection (invalidate the whole session family if an old refresh
token is replayed), and add integration tests for the RBAC and Socket.io layers, not
just auth.
