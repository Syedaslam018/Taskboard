# TaskBoard — Real-Time Task & Collaboration Board

A Trello/Jira-inspired collaborative project management app: workspaces, boards, tasks,
real-time updates via Socket.io, and role-based access control.

> **Status:** All 9 phases from the original build spec are implemented: project
> setup, authentication, workspaces + RBAC, boards/columns/tasks CRUD,
> drag-and-drop UI with optimistic updates, Socket.io real-time collaboration +
> comments, notifications/activity feed/search, a real dashboard + performance
> pass, and a seed script + production Docker hardening — each phase with its own
> test suite along the way.
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
│       ├── components/kanban/       # KanbanColumn, TaskCard, TaskDetailModal, PriorityBadge
│       ├── components/notifications/  # NotificationBell
│       ├── components/activity/     # ActivityFeed
│       ├── pages/         # Login/Register/Dashboard, Workspaces(Detail)Page, BoardPage
│       ├── hooks/         # useAuth, useWorkspaces, useBoards, useTasks, useRealtimeBoard,
│       │                    useBootstrapAuth, useNotifications, useActivity,
│       │                    useWorkspaceMembers, useDashboard
│       ├── services/      # api.ts (axios + refresh interceptor), socket.ts, *Service.ts per resource
│       ├── stores/        # authStore.ts (Zustand)
│       ├── utils/         # reorder.ts, useDebouncedValue.ts (both unit tested)
│       ├── types/
│       └── router/
├── server/                # Express + TS
│   └── src/
│       ├── config/        # env.ts, db.ts
│       ├── controllers/   # auth, workspace, board, task, comment, notification, activity, dashboard
│       ├── middleware/    # auth, rbac, boardAccess, taskAccess, commentAccess, validate, errorHandler
│       ├── models/        # User, Workspace, Board, Task, Comment, Notification, Activity
│       ├── routes/        # auth, workspace, board, task, comment, notification, dashboard
│       ├── services/      # matching business logic per resource, plus dashboard.service.ts (aggregation)
│       ├── sockets/        # index.ts (auth + rooms + presence), io.ts, rooms.ts
│       ├── utils/         # AppError.ts, catchAsync.ts, apiResponse.ts, token.ts
│       └── validators/    # Zod schemas per resource
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
- columns[]      { _id, name, order, isDone }   (embedded - columns are cheap, board-scoped, low cardinality)
- createdBy      (ref User)
- createdAt / updatedAt

`columns[].isDone` (added in Phase 8) is what the dashboard uses to classify a task
as "completed" — an explicit boolean rather than matching `column.name` against
`/done/i`, since name-matching breaks the moment someone renames "Done" to
"Shipped" or adds a second done-ish column like "Deployed". The default column set
marks "Done" `isDone: true` automatically; custom column names default to `false`
and can be marked via `PATCH /api/boards/:id/columns/:columnId`.

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

```
Comment
- _id
- taskId    (ref Task, indexed with createdAt for a task's comment thread in order)
- author    (ref User)
- content
- createdAt / updatedAt
```

```
Notification
- _id
- user        (recipient, ref User, indexed with read+createdAt for the bell icon's query)
- type        TASK_ASSIGNED | TASK_MOVED | COMMENT_ADDED | MEMBER_ADDED
- message     precomputed human-readable line
- workspaceId (ref Workspace)
- taskId?     (ref Task)
- read        boolean, default false
- createdAt / updatedAt

Activity
- _id
- workspaceId (ref Workspace, indexed with createdAt for the feed's only query)
- actor       (ref User)
- type        TASK_CREATED | TASK_MOVED | TASK_DELETED | COMMENT_ADDED | MEMBER_ADDED | BOARD_CREATED
- message     precomputed human-readable line
- metadata?   loosely-typed extra context (taskId, boardId, etc.)
- createdAt
```

Both store a precomputed `message` string rather than re-deriving it from
`metadata` on every read — the activity feed and notification bell are read far
more often than these are written, so paying the (tiny) cost of building the
sentence once at write time is the right trade.

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

| GET    | `/api/tasks/:id/comments` | VIEWER+ | List a task's comments, oldest first |
| POST   | `/api/tasks/:id/comments` | MEMBER+ | Add a comment (broadcasts `comment:created`) |
| PATCH  | `/api/comments/:id` | VIEWER+, author only | Edit your own comment |
| DELETE | `/api/comments/:id` | VIEWER+, author only | Delete your own comment |
| GET    | `/api/workspaces/:id/members` | VIEWER+ | Populated member list (name/email/avatar) — used for the assignee picker |
| GET    | `/api/workspaces/:id/activity` | VIEWER+ | Workspace activity feed, newest first |
| GET    | `/api/notifications` | Bearer | Your notifications (`?unread=true` to filter), includes `unreadCount` |
| PATCH  | `/api/notifications/:id/read` | Bearer, owner only | Mark one notification read |
| PATCH  | `/api/boards/:id/columns/:columnId` | ADMIN+ | Rename a column and/or toggle its `isDone` flag |
| GET    | `/api/dashboard` | Bearer | Cross-workspace stats, "My Tasks", and recent activity for the caller |

Auth endpoints are rate-limited (20 requests / 15 min / IP).

## Socket.io (Phase 6)

Connect with the same short-lived access token used for REST, sent in the
handshake (not a cookie):

```js
import { io } from "socket.io-client";
const socket = io("/", { path: "/socket.io", auth: { token: accessToken } });
```

A connection with no token, or an expired/invalid one, is rejected before
`connection` fires. Every authenticated socket also auto-joins a private
`user:{id}` room on connect — no explicit join needed, since it's scoped to
exactly the user the JWT already proved they are.

| Client emits | Payload | Effect |
|---|---|---|
| `workspace:join` | `workspaceId`, optional ack callback | Joins `workspace:{id}` room *if* the caller is a member (same `assertWorkspaceAccess` check as REST); ack reports `{ success, message? }` |
| `workspace:leave` | `workspaceId` | Leaves the room, updates presence |

| Server emits (to `workspace:{id}` unless noted) | Payload | Fired by |
|---|---|---|
| `task:created` | the new task | `POST /api/boards/:id/tasks` |
| `task:updated` | the updated task | `PATCH /api/tasks/:id` |
| `task:moved` | the moved task | `PATCH /api/tasks/:id/move` |
| `task:deleted` | `{ taskId, boardId }` | `DELETE /api/tasks/:id` |
| `comment:created` | the new comment (with `taskId`) | `POST /api/tasks/:id/comments` |
| `member:added` | `{ workspaceId, email, role }` | `POST /api/workspaces/:id/members` |
| `member:removed` | `{ workspaceId, userId }` | `DELETE /api/workspaces/:id/members/:userId` |
| `user:online` / `user:offline` | `{ userId, workspaceId, onlineUserIds }` | Join/leave/disconnect |
| `notification:new` *(to `user:{recipientId}`, not the workspace room)* | the new `Notification` document | Task assigned, task moved (to the assignee), comment added (to the assignee/creator), member added |

**Frontend integration**: `client/src/services/socket.ts` keeps a single socket
connected for as long as an access token exists (subscribed to the Zustand auth
store — connects on login, reconnects on token refresh, disconnects on logout).
`useRealtimeBoard(boardId, workspaceId)` (used by `BoardPage`) joins the
workspace room while the board is open and applies incoming task events directly
to the `["tasks", boardId]` React Query cache — which `BoardPage`'s existing
`useEffect` then turns back into the per-column UI state automatically, so a
teammate's drag-and-drop move shows up live with no extra merge logic.
`useNotifications` listens on the personal `user:{id}` channel independently of
which board is open, and simply invalidates the notifications query on
`notification:new` — the bell icon's badge count updates live from anywhere in
the app, not just while a specific board is mounted.

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

## Seed Data

```bash
cd server
npm run seed
```

`server/src/utils/seed.ts` clears and repopulates the database with realistic demo
data (idempotent — safe to re-run): 3 users, 2 workspaces, 2 boards (each using the
standard 5-column layout every board defaults to), 19 tasks with a mix of
priorities/labels/due dates (including some intentionally overdue and some due
soon, so the dashboard has something to show), 11 comments, 4 notifications, and 7
activity log entries. It writes directly through the Mongoose models rather than
making HTTP requests against a running server, since seeding data needs neither a
server process nor a JWT.

**Demo accounts** (all share the same password):

| Email | Password | Website Redesign | Mobile App Launch |
|---|---|---|---|
| `alice@example.com` | `password123` | OWNER | ADMIN |
| `bob@example.com` | `password123` | ADMIN | OWNER |
| `carol@example.com` | `password123` | MEMBER | VIEWER |

## Docker

**Development** (bind-mounted source, hot reload, Vite dev server):

```bash
docker compose up
```

Starts MongoDB, the API on `:5000`, and the client dev server on `:5173`.

**Production** (multi-stage builds, no bind mounts, nginx-served static
frontend, non-root server container):

```bash
# Generate real secrets - do not use the dev defaults in production.
openssl rand -base64 32   # run twice, once each for JWT_ACCESS_SECRET / JWT_REFRESH_SECRET

cp server/.env.example server/.env.production
# edit server/.env.production: set the generated secrets, CLIENT_URL to your
# real deployed origin, and MONGO_URI if not using the bundled mongo service

docker compose -f docker-compose.prod.yml --env-file server/.env.production up -d --build
```

This serves the client on `:80` via nginx, which proxies `/api` and `/socket.io`
to the server container — the browser only ever talks to one origin in
production, sidestepping CORS entirely and letting the refresh-token cookie's
`SameSite=Lax` policy work without cross-site complications. See
`docker-compose.prod.yml` for the full breakdown of what's different from the dev
compose file (no source mounts, `COOKIE_SECURE=true`, required secrets with no
insecure fallback, a healthcheck on the server).

## Deployment

The Docker setup above is portable to any container host. Two realistic paths:

- **Single VM / VPS**: install Docker, copy the repo, run the production compose
  command above behind a reverse proxy (Caddy or an nginx you already run) that
  terminates TLS and forwards to the client container's port 80.
- **Managed platforms** (Render, Fly.io, Railway, etc.): build the `server` and
  `client` Dockerfiles as two separate services, point `MONGO_URI` at a managed
  MongoDB (Atlas free tier is fine for a portfolio deployment), and set
  `CLIENT_URL` on the server to the client's real deployed URL so CORS and the
  refresh cookie's origin checks are correct.

In either case: never reuse the dev JWT secrets, always set `COOKIE_SECURE=true`
once served over HTTPS, and set `CLIENT_URL` to the exact production origin (not
a wildcard) since it drives both the CORS allowlist and the Socket.io CORS
config.

## Frontend Architecture (Phase 5 additions)

```
WorkspacesPage -> WorkspaceDetailPage (boards list) -> BoardPage (Kanban)
```

- **`BoardPage`** owns a local `columns: Record<columnId, Task[]>` state, re-derived
  from the `useTasksQuery` cache via a `useEffect` whenever the server data changes.
  This local state — not the React Query cache directly — is what the drag-and-drop
  UI reorders optimistically.
- **`onDragEnd`** calls a pure, unit-tested `reorderColumns()` helper
  (`client/src/utils/reorder.ts`) to splice the moved task out of its source column
  and into the destination column *immediately*, then fires the
  `PATCH /api/tasks/:id/move` mutation in the background.
- **Rollback on failure**: `useMoveTask`'s `onError` simply invalidates the
  `["tasks", boardId]` query. That triggers a refetch, which re-runs the `useEffect`
  above and resyncs `columns` to the server's authoritative order — an implicit
  rollback with no separate "undo" code path to maintain, at the cost of a visible
  snap-back rather than an animated reverse-drag.
- **Why local state instead of a React Query optimistic update (`onMutate` +
  `setQueryData`)**: the query holds a flat, unsorted list of tasks for the whole
  board; the UI needs a grouped-by-column, ordered structure. Reordering that inside
  the cache on every drag would duplicate the same splice logic `reorderColumns`
  already does, for no real benefit — local state already resyncs automatically once
  the mutation settles.

## Frontend Architecture (Phase 7 additions)

- **Search/filter vs. drag-and-drop**: the whole board's tasks are already loaded
  client-side for drag-and-drop to work, so search and priority filtering happen
  against that same data — debounced (`useDebouncedValue`, 250ms) purely to avoid
  re-filtering on every keystroke on a large board, not because it's a network
  request. When a filter narrows the visible set, `KanbanColumn` disables dragging
  entirely (`isDropDisabled` + rendering plain `TaskCard`s instead of `Draggable`s)
  rather than risk it: a filtered subset's array indices don't correspond to real
  backend positions, so a drag during filtering could silently send the wrong
  `position` to `PATCH /api/tasks/:id/move`.
- **Notifications are workspace-agnostic**: `useNotifications` listens on the
  personal `user:{id}` socket channel (auto-joined on connect) rather than on
  whichever workspace room happens to be open, so the bell's unread badge updates
  live no matter which page you're on — unlike `useRealtimeBoard`, which is scoped
  to one board.
- **Optimistic mark-as-read**: `useMarkNotificationRead` flips `read: true` and
  decrements the unread count in the cache immediately (`onMutate`), rolling back
  via the snapshotted previous state if the request fails (`onError`) — the same
  snapshot-and-restore pattern the task drag-and-drop deliberately avoids, used
  here instead because a notification's cache shape isn't re-derived from anything
  else the way `BoardPage`'s `columns` state is, so there's no "free" resync to
  lean on.

## Performance (Phase 8)

- **Dashboard is one aggregation, not five queries.** `dashboard.service.ts` uses a
  single `Task.aggregate([...$facet])` to compute total/completed/inProgress/
  overdue/dueSoon counts *and* the "My Tasks" preview list in one round trip to
  MongoDB, instead of five separate `.countDocuments()`/`.find()` calls each
  paying their own network round trip.
- **`.lean()` on every read-only query.** Every list/read endpoint across
  workspaces, boards, tasks, comments, notifications, and activity uses `.lean()`
  — skipping Mongoose's hydration into full documents (change tracking, virtuals,
  methods) for data that's only ever serialized back out as JSON. Writes still use
  full hydrated documents where they need `.save()` or instance methods.
- **Assignee lookups avoid populate.** Tasks store `assignee` as a raw `ObjectId`
  rather than being populated on every list response — the frontend already has
  the workspace's member list (`GET /api/workspaces/:id/members`) loaded once
  per board session and looks up names client-side, instead of the API paying a
  `$lookup`/populate cost on every task list request.
- **Frontend: memoized Kanban rendering.** `TaskCard` and `KanbanColumn` are
  wrapped in `React.memo`. This only pays off because of two supporting choices:
  `reorderColumns` (Phase 5) only replaces the array reference for the source and
  destination columns of a move, so untouched columns keep a stable `tasks` array
  reference; and `BoardPage` now stores `selectedTaskId` instead of the full
  `Task` object, so `onSelectTask` is a trivial `useCallback` with an empty
  dependency array rather than a new closure every render. Together, dragging one
  card no longer re-renders every card in every column — just the two columns
  actually involved in the move.

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
- `server/tests/comment.test.ts`: adding a comment returns it with the author
  populated, a VIEWER is blocked from commenting, a member can edit their own
  comment but not someone else's (403), and 404 (not 403) for a comment reached
  through a task in a workspace the requester isn't in.
- `server/tests/socket.test.ts`: a connection with no access token is rejected
  before it completes; a member can join their workspace's room and receives a
  `user:online` presence event containing their own ID; a non-member's
  `workspace:join` attempt gets `{ success: false }`; a socket joined to the
  room receives `task:created` when a task is created over REST; and — the
  negative case that actually proves room isolation — a socket that never
  joined does **not** receive that same event.
- `server/tests/notification.test.ts`: assigning a task to someone else on
  creation notifies them (and shows up with `unreadCount: 1`); self-assignment
  does **not** notify; marking a notification read only works for its owner
  (404 for anyone else); being added to a workspace notifies you; and the
  activity feed records board/task/move events newest-first and 404s for a
  non-member.
- `server/tests/dashboard.test.ts`: tasks are classified completed/in-progress by
  their column's `isDone` flag (not name-matching); an overdue task only counts
  as overdue for its actual assignee, not for other workspace members; recent
  activity aggregates correctly across *every* workspace the user belongs to,
  not just one; and assigning a task to a non-member is rejected with 400.
- `server/tests/board.test.ts` also covers the `isDone` flag directly: the
  default board's "Done" column comes back `isDone: true` and every other
  default column `false`; a custom-column board starts with every column
  `isDone: false`; and `PATCH /api/boards/:id/columns/:columnId` can mark one.

All eight suites use an in-memory MongoDB (`mongodb-memory-server`), so no external
DB is needed to run them. The socket suite spins up a real HTTP server on an
ephemeral port and connects with `socket.io-client`, rather than mocking the
transport, so it's exercising the actual auth handshake and room-broadcast logic.

Frontend: `cd client && npm test` runs two Vitest suites —
`utils/__tests__/reorder.test.ts` (same-column reordering, cross-column moves
landing at the correct index, and that `reorderColumns` doesn't mutate its input:
the pure function driving Kanban drag-and-drop) and
`utils/__tests__/useDebouncedValue.test.ts` (using fake timers: no update before
the delay elapses, updates once it does, and rapid successive changes reset the
timer and keep only the latest value — the logic behind the board's search box).

See the note at the top of this README on why none of these suites have been
executed inside this sandbox (no network access to `npm install`).

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Vite/Express/Mongo/Docker/ESLint/Prettier scaffold | ✅ Done |
| 2 | Auth: register/login/logout/refresh/me, bcrypt, JWT, protected routes | ✅ Done |
| 3 | Workspace model, membership, RBAC middleware (OWNER/ADMIN/MEMBER/VIEWER) | ✅ Done |
| 4 | Boards, Columns, Tasks CRUD, IDOR-safe workspace scoping | ✅ Done |
| 5 | Drag-and-drop UI, optimistic updates + rollback (backend reordering already done) | ✅ Done |
| 6 | Socket.io: rooms per workspace, task/comment events, presence | ✅ Done |
| 7 | Notifications, activity feed, search/filter with debouncing | ✅ Done |
| 8 | Dashboard, performance pass (`.lean()`, indexes, memoization), broader tests | ✅ Done |
| 9 | Seed script, production Docker hardening, final docs | ✅ Done |

All 9 phases are complete. See [Future Improvements](#future-improvements) below
for what a genuinely production-bound version of this app would still need.

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

**15. Why does the drag-and-drop rollback just invalidate the query instead of restoring a saved snapshot?**
Because the local `columns` state is already derived, one-directionally, from the
`useTasksQuery` cache via a `useEffect` — it's not an independent source of truth.
Invalidating forces a refetch, and the effect re-runs and rebuilds `columns` from
whatever the server now says is correct. That's strictly simpler than snapshotting
and manually restoring the pre-drag state, and it can't drift out of sync with the
server, since it always ends up re-derived from a real fetch rather than a cached
guess. The tradeoff is a visible snap-back on failure rather than a smooth reverse
animation — a reasonable UX tradeoff for a rare error path.

**16. Why extract `reorderColumns` into its own file instead of leaving it inline in `onDragEnd`?**
Testability. `@hello-pangea/dnd`'s `DropResult` and the DOM drag events around it
are annoying to simulate in a unit test, but the actual logic that matters — "take
this item out of this array, put it in that array, at this index, without mutating
the input" — has nothing to do with dragging. Pulling it into a pure function means
`reorder.test.ts` can assert on that logic directly and fast, without mounting any
component, while `BoardPage` still calls the exact same function that ships to
production.

**17. Why authenticate sockets with the access token in the handshake instead of the refresh cookie?**
The refresh cookie is deliberately `httpOnly` so client-side JS can never read it —
that's the whole point of it being `httpOnly`. Socket.io's browser client can't
attach a cookie to the handshake the way a same-origin `fetch` can either way
without extra plumbing, so the natural fit is the same short-lived access token
already sitting in memory for REST calls. It gives sockets the identical security
posture as REST: a stolen token is only useful for ~15 minutes, and the connection
is rejected outright (via `io.use()` middleware) before `connection` even fires if
the token is missing or invalid — never silently allowed through as "anonymous."

**18. Why track presence with a `Map<workspaceId, Map<userId, Set<socketId>>>` instead of just a `Set<userId>` per workspace?**
A single `Set<userId>` breaks the moment someone opens the same board in two tabs:
closing one tab would remove them from the set and broadcast `user:offline` even
though they're still connected in the other tab. Keying by `socketId` inside each
user's entry means a user only flips to offline once every one of their
connections for that workspace has actually disconnected — `disconnect` only
removes that one `socketId`, and the "did they go offline" broadcast only fires
once their per-user `Set` is empty. It's a small amount of extra bookkeeping for a
noticeably less buggy presence indicator.

**19. Why disable drag-and-drop instead of just letting search filter the board?**
Because the drag-and-drop code sends `position` as a plain array index
(`destination.index` from `@hello-pangea/dnd`), and that index only means "the
correct slot" when the array it's computed against is the *complete, real* column.
If search narrowed a column to 2 of its 15 tasks and I dragged the second one to
index 0, the backend would receive "put this at position 0" and silently misplace
it relative to the 13 hidden tasks. Disabling drag while filtered is a small UX
cost for avoiding data corruption; the alternative (mapping filtered indices back
to true indices before sending) is solvable but adds real complexity for a
lower-priority interaction.

**20. Why do activity and notification writes happen inline in the controller instead of an event bus / message queue?**
Scale and team size. At this app's scale, a task creation touching three things
(the task write, an activity record, maybe a notification) is three fast Mongo
writes in one request — an event bus would add operational complexity (a broker,
retry/dead-letter handling, eventual-consistency bugs) without a real throughput
problem to justify it. The tradeoff is coupling: `task.controller.ts` has to know
about activity and notifications directly. If this were a larger team working on
independent domains, or if a slow notification write started blocking the task
response, I'd reach for a proper event-driven design (e.g. publish `task.created`
to a queue, let separate consumers own activity/notifications) instead.

**21. Why `$facet` instead of `Promise.all([...five separate counts])`?**
Both approaches avoid blocking one query on another, since `Promise.all` runs
them concurrently too — the real difference is round trips and load on Mongo.
Five `.countDocuments()`/`.find()` calls are five separate queries the database
has to plan and execute, each carrying its own network round trip from the app
server. `$facet` sends the base `$match` (boardId + assignee) once and lets
MongoDB itself run all five sub-pipelines against that already-filtered set in a
single request/response cycle. For a dashboard that could plausibly be polled or
loaded frequently, that's the difference between 1 round trip and 5 every time
someone opens the page.

**22. Why compute `isDone` per-board instead of a single global "done" column name?**
Because boards aren't required to share column names — one team's board might use
"Done", another might use "Shipped" or "Deployed", and a single board could
reasonably have more than one done-ish column (e.g. both "Done" and "Won't Fix"
should count as complete for dashboard purposes, "Blocked" shouldn't). Storing
`isDone` as a per-column boolean on each board handles all of that without any
special-casing in the dashboard query — it just collects every column across
every board where `isDone: true` and filters tasks against that ID set. The
alternative (a global convention like "always name it exactly 'Done'") is
brittle and silently wrong the moment someone breaks the convention.

**10. What would you change before this went to real production?**
A few things genuinely aren't done yet, listed honestly in
[Future Improvements](#future-improvements) below — refresh-token rotation with
reuse detection, centralized structured logging, Redis-backed rate limiting
across multiple instances, and a CI pipeline chief among them. (Note: when I first
answered this question back in Phase 2, I listed "RBAC and Socket.io test
coverage" as missing — those exist now, added in Phases 3 and 6 respectively, so
I've kept this answer honest as the project actually grew instead of leaving a
stale claim in place.)

## Future Improvements

Honest gaps, not implemented in this repo:

- **Refresh-token rotation with reuse detection.** Right now a refresh token is
  valid for its full 7-day lifetime with no rotation — a stolen refresh token
  works until it naturally expires. A hardened version would issue a new refresh
  token on every use, invalidate the old one, and treat a replayed old token as a
  signal to revoke the entire session family.
- **Centralized structured logging** (pino/winston) with request IDs threaded
  through each request, instead of the current bare `console.log`/`console.error`.
- **Redis-backed rate limiting.** The current `express-rate-limit` store is
  in-memory per process — fine for one server instance, but multiple instances
  behind a load balancer would each track limits independently, letting an
  attacker get N× the intended request budget by hitting different instances.
- **CI pipeline** (GitHub Actions or similar) running lint + typecheck + both test
  suites on every push/PR — the tests exist and are ready to run in CI, there's
  just no workflow file wiring that up yet.
- **Ownership transfer** for a workspace. The owner can never be removed or
  demoted by design (Phase 3), but there's also no way to *deliberately* hand
  ownership to someone else — a real gap if the original owner leaves the team.
- **Rich text / mentions in comments.** Comments are plain text; the spec's
  "someone mentions them" notification type was intentionally left out since it
  needs `@mention` parsing that plain-text comments don't support yet.
- **File attachments** on tasks — not part of the original spec's core feature
  list, but a natural next feature for a Trello-style tool.
- **E2E tests** (Playwright/Cypress) covering the full login → create workspace →
  create board → drag a task flow end-to-end in a real browser, complementing the
  unit/integration tests that exist today.

## Screenshots

Not included — generating real screenshots needs the app actually running (a
browser rendering the live UI against a live backend), which isn't possible in
the sandboxed environment this was built in. Once you run it locally
(`docker compose up` or the manual setup above), the natural ones to capture for
a portfolio README are: the Kanban board mid-drag, the notification bell dropdown,
the dashboard with real stats, and two browser windows side-by-side showing a
task move appearing live in both — that last one is the best evidence the
real-time collaboration in Phase 6 actually works.

