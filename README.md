# TaskBoard — Real-Time Task & Collaboration Board

A Trello/Jira-inspired collaborative project management app: workspaces, boards, tasks,
real-time updates via Socket.io, and role-based access control.

> **Status:** This repo currently implements **Phase 1 (project setup), Phase 2
> (authentication), Phase 3 (workspaces + RBAC), and Phase 4 (boards, columns, tasks
> CRUD)** end-to-end, each with an integration test suite. Phases 5–9
> (drag-and-drop UI/optimistic updates, sockets, notifications, dashboard,
> Docker/seed/prod hardening) are scaffolded as clear extension points (see
> `server/src/app.ts` route comments) and are next — see [Roadmap](#roadmap).
>
> Note on test execution: this sandbox has no network access, so `npm install`
> can't run here and the test suites below have **not been executed in this
> environment** — I can't honestly claim "passing" without running them. They're
> ordinary Jest + Supertest + `mongodb-memory-server` tests with no exotic setup;
> run `npm test` in `server/` after `npm install` to verify. If anything fails,
> tell me the output and I'll fix it.

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

Workspace
- _id
- name
- description?
- owner          (ref User, indexed)
- members[]      { user (ref User), role: OWNER|ADMIN|MEMBER|VIEWER, joinedAt }
                 (indexed on members.user for "my workspaces" lookups)
- createdAt / updatedAt
```

Members are embedded on the workspace document rather than a separate collection:
membership is checked on almost every request, so this avoids an extra query/join
on the hot path, at the cost of the array growing with very large member counts
(fine for a Trello/Jira-style tool; would revisit for workspaces with thousands of
members).

Board
- _id
- workspaceId    (ref Workspace, indexed with createdAt for "boards in this workspace")
- name
- description?
- columns[]      { _id, name, order }   (embedded - columns are cheap, board-scoped, low cardinality)
- createdBy      (ref User)
- createdAt / updatedAt

Task
- _id
- boardId        (ref Board)
- columnId       (matches a columns[]._id on the parent board)
- title
- description?
- priority       LOW | MEDIUM | HIGH | URGENT (default MEDIUM)
- assignee?      (ref User, indexed)
- createdBy      (ref User)
- labels[]
- dueDate?
- position       (integer order within its column - see reordering note below)
- createdAt / updatedAt (createdAt indexed)
```
Compound index `{ boardId: 1, columnId: 1, position: 1 }` on Task serves the board's
primary read: all tasks in a board, grouped by column, already in card order.

Phase 7+ adds `Comment`, `Notification`, and `Activity` with the indexes called out
in the original spec (`taskId+createdAt`, `userId+read`, `workspaceId+createdAt`).

### IDOR-safe access chains

Boards and tasks are addressed by their own `_id` in the URL, not by `workspaceId`,
so access control has to hop upward to find out which workspace they belong to
before checking membership:

```
Board route  (/api/boards/:id)          -> board.workspaceId       -> membership check
Task route   (/api/tasks/:id)           -> task.boardId -> board.workspaceId -> membership check
```

This is `requireBoardRole` / `requireTaskRole` in `server/src/middleware/`, both
built on the same `assertWorkspaceAccess` helper the workspace routes use — so a
valid task ID belonging to a workspace you're not in returns 404, exactly like a
workspace ID would. `POST /api/boards` is the one exception: since `workspaceId`
arrives in the request body (not a URL param), the controller calls
`assertWorkspaceAccess` directly instead of using a param-based middleware.

### Efficient task reordering

Moving a task (`PATCH /api/tasks/:id/move`) doesn't rewrite every task in a column.
It does at most two `updateMany` calls with `$inc` to shift only the tasks between
the task's old and new slot (closing the gap it left, opening a slot where it
landed), then a single save on the moved task itself — see
`server/src/services/task.service.ts`. Deleting a task closes its column's gap the
same way. This is the "avoid inefficient database writes when reordering multiple
tasks" requirement from the spec; the drag-and-drop UI + optimistic updates that
call this endpoint land in Phase 5.

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
| POST   | `/api/workspaces`   | Bearer | Create a workspace (creator becomes OWNER) |
| GET    | `/api/workspaces`   | Bearer | List workspaces the caller belongs to |
| GET    | `/api/workspaces/:id` | VIEWER+ | Get one workspace (404 if not a member) |
| PATCH  | `/api/workspaces/:id` | ADMIN+ | Update name/description             |
| DELETE | `/api/workspaces/:id` | OWNER | Delete the workspace                 |
| POST   | `/api/workspaces/:id/members` | ADMIN+ | Add a member by email + role |
| DELETE | `/api/workspaces/:id/members/:userId` | VIEWER+* | Remove a member |
| PATCH  | `/api/workspaces/:id/members/:userId` | ADMIN+ | Change a member's role |

\* The member-removal route only requires VIEWER membership so anyone can hit it to
leave the workspace themselves; removing *someone else* is enforced inside the
service layer and requires ADMIN+ (see `workspace.service.ts`). The workspace owner
can never be removed or have their role changed through this endpoint — ownership
transfer would be a deliberate, separate action (not yet implemented).

| POST   | `/api/boards`       | ADMIN+ (workspace, from body) | Create a board (defaults to 5 standard columns) |
| GET    | `/api/workspaces/:id/boards` | VIEWER+ | List boards in a workspace |
| GET    | `/api/boards/:id`   | VIEWER+ | Get one board                        |
| PATCH  | `/api/boards/:id`   | ADMIN+ | Update board name/description         |
| DELETE | `/api/boards/:id`   | ADMIN+ | Delete a board (cascade-deletes its tasks) |
| POST   | `/api/boards/:id/columns` | ADMIN+ | Add a column                    |
| DELETE | `/api/boards/:id/columns/:columnId` | ADMIN+ | Delete a column (blocked while it still has tasks) |
| GET    | `/api/boards/:id/tasks` | VIEWER+ | List tasks, with `assignee`/`priority`/`columnId`/`label`/`search`/`page`/`limit` filters |
| POST   | `/api/boards/:id/tasks` | MEMBER+ | Create a task in a column |
| GET    | `/api/tasks/:id`    | VIEWER+ | Get one task                          |
| PATCH  | `/api/tasks/:id`    | MEMBER+ | Update title/description/priority/assignee/labels/dueDate |
| DELETE | `/api/tasks/:id`    | ADMIN+\*\* | Delete a task                    |
| PATCH  | `/api/tasks/:id/move` | MEMBER+ | Move a task to a column/position |

\*\* The spec's permission table grants MEMBER "create/update/move tasks, comment" but
doesn't explicitly list delete — ADMIN+ is a deliberately conservative reading of
that gap; easy to loosen to MEMBER+ if that's not the intent.

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

- `server/tests/auth.test.ts`: registration (and that `passwordHash` never leaks),
  duplicate email rejection (409), login with correct/incorrect password, `/me`
  blocked without a token and working with one.
- `server/tests/workspace.test.ts`: workspace creation makes the creator OWNER;
  non-members get 404 (not 403) reading a workspace they're not in; a VIEWER is
  blocked from updating a workspace while an ADMIN/OWNER can; a member can leave a
  workspace on their own but cannot remove someone else or the owner; only OWNER
  (not ADMIN) can delete the workspace.

- `server/tests/board.test.ts`: default columns on creation, VIEWER blocked from
  creating a board, 404 (not 403) for a non-member requesting a valid board ID,
  cascade-delete of tasks when a board is deleted, and a column can't be deleted
  while it still holds tasks.
- `server/tests/task.test.ts`: task creation and positioning, VIEWER blocked /
  MEMBER allowed to create tasks, correct reordering within a column, correct
  position updates in *both* columns when a task moves across columns, filtering
  by priority and search, and 404 (not 403) for a task in a workspace the
  requester isn't in.

All four suites use an in-memory MongoDB (`mongodb-memory-server`), so no external
DB is needed to run them. See the note at the top of this README on why they
haven't been executed inside this sandbox.

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Vite/Express/Mongo/Docker/ESLint/Prettier scaffold | ✅ Done |
| 2 | Auth: register/login/logout/refresh/me, bcrypt, JWT, protected routes | ✅ Done |
| 3 | Workspace model, membership, RBAC middleware (OWNER/ADMIN/MEMBER/VIEWER) | ✅ Done |
| 4 | Boards, Columns, Tasks CRUD, IDOR-safe workspace scoping | ✅ Done |
| 5 | Drag-and-drop UI, optimistic updates + rollback (backend reordering already done) | ⏭ Next |
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

**11. Why embed members on the Workspace document instead of a separate Membership collection?**
Membership is checked on nearly every workspace-scoped request (`requireWorkspaceRole`
runs before almost every board/task route), so keeping it on the workspace document
means that check is a single `findById` with no join. The tradeoff is the array grows
with the workspace's member count and every membership change rewrites the whole
document — a fine tradeoff for a Trello-style tool with dozens of members per
workspace, but I'd switch to a separate `Membership` collection (indexed on
`workspaceId + userId`) if this needed to support workspaces with thousands of
members, since that keeps each write small and lets you paginate the member list.

**12. Why does `GET /api/workspaces/:id` return 404 instead of 403 for a non-member?**
403 confirms the resource exists but you can't see it — which lets an attacker
enumerate valid workspace IDs by watching which ones return 403 vs 404. Returning 404
uniformly for "doesn't exist" and "you're not a member" makes workspace IDs
non-enumerable from the response code alone.

**13. How does moving a task avoid rewriting the whole column?**
The move endpoint only touches the tasks strictly between the task's old and new
position — via two `updateMany({...}, { $inc: { position: ±1 } })` calls (or one if
it's staying in the same column) — plus a single save on the moved task itself. For
a column with hundreds of cards, that's 2-3 writes instead of hundreds. The
tradeoff is `position` values can in theory get sparse or need renumbering after a
huge number of moves; a production version might switch to fractional/lexicographic
positions (e.g. "b" between "a" and "c") to avoid ever needing a bulk renumber.

**14. Why is `POST /api/boards` handled differently from `GET /api/boards/:id` for authorization?**
Every other board/task route identifies its resource by ID in the URL, so a single
middleware (`requireBoardRole`) can load it and check membership before the
controller runs. Board *creation* has no board yet — the only signal is
`workspaceId` in the request body — so that one route calls the same underlying
`assertWorkspaceAccess` helper directly inside the controller instead of via a
param-based middleware. Same security guarantee, just invoked at a different point
because there's no URL param to hang it off of.

**10. What would you change before this went to real production?**
Add centralized structured logging (pino/winston) and request IDs, move rate-limit
state to Redis so it works across multiple server instances, add refresh-token
rotation with reuse detection (invalidate the whole session family if an old refresh
token is replayed), and add integration tests for the RBAC and Socket.io layers, not
just auth.
