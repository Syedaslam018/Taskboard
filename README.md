<<<<<<< HEAD
TaskBoard

TaskBoard is a full-stack task management and collaboration app inspired by tools like Trello and Jira.

I built it as a portfolio project to explore how a real-world team workflow comes together — from authentication and workspaces to Kanban boards, task management, comments, notifications, and real-time updates.

🚀 Try TaskBoard

Live app: https://taskboard-client-qoig.onrender.com/dashboard
API: https://taskboard-api-3569.onrender.com

🔑 Demo login

You can log in and explore the application using the demo account below:

Email:    alice@example.com
Password: password123

The demo account lets you explore the main TaskBoard features. User management and user deletion are intentionally restricted.

✨ What you can do

Create and manage workspaces

Create boards and organize work with Kanban columns

Create, assign, move, and prioritize tasks

Drag and drop tasks between columns

Add comments and follow task activity

Receive notifications

See recent workspace activity

Search and filter tasks

See changes update in real time

Use role-based access across workspaces

📸 Screenshots

Dashboard



Kanban Board



🛠️ Tech Stack

Frontend: React, TypeScript, Vite, TanStack Query, Zustand

Backend: Node.js, Express, TypeScript, Mongoose, Zod

Database: MongoDB

Realtime: Socket.IO

Authentication: JWT access/refresh tokens, bcrypt

Other: Docker, Vitest, Jest, Supertest

💡 Why I built it

I wanted to build something that went beyond a basic CRUD application.

TaskBoard gave me a chance to work on several parts of a full-stack application at the same time: authentication, authorization, API design, database relationships, drag-and-drop workflows, client state, real-time communication, notifications, and deployment.

The real-time side was especially interesting because changes such as task updates, comments, member activity, and notifications can be reflected across connected clients without relying on a page refresh.

🏗️ Project structure

Taskboard/
├── client/        # React frontend
├── server/        # Express API
├── docker-compose.yml
└── docker-compose.prod.yml

The frontend and backend are kept separate so they can be developed and deployed independently.

💻 Run locally

1. Clone the project

git clone https://github.com/Syedaslam018/Taskboard.git
cd Taskboard

2. Start the backend

=======
# TaskBoard

A Trello/Jira-style task board with workspaces, RBAC, Kanban boards, real-time updates, comments, notifications, and a dashboard.

## Stack

- **Frontend:** React + TypeScript + Vite, TanStack Query, Zustand
- **Backend:** Express + TypeScript, Mongoose, Zod
- **Database:** MongoDB
- **Realtime:** Socket.io
- **Auth:** JWT access + refresh tokens, bcrypt
- **Testing:** Jest/Supertest + Vitest
- **Docker:** Development + production setups

## Project Structure

```text
client/
└── src/
    ├── components/        # Kanban, notifications, activity
    ├── pages/             # Login, Register, Dashboard, Workspaces, Board
    ├── hooks/             # Auth, workspaces, boards, tasks, realtime, etc.
    ├── services/          # API, Socket.io, resource services
    ├── stores/            # Zustand auth store
    ├── utils/             # Reordering, debounce helpers
    ├── types/
    └── router/

server/
└── src/
    ├── config/            # Environment + database
    ├── controllers/
    ├── middleware/        # Auth, RBAC, access, validation, errors
    ├── models/            # User, Workspace, Board, Task, Comment, etc.
    ├── routes/
    ├── services/
    ├── sockets/
    ├── utils/
    └── validators/

docker-compose.yml
docker-compose.prod.yml
```

## Auth

- Access token: JWT, 15m by default, kept in memory.
- Refresh token: JWT, 7d by default, stored in an `httpOnly`, `SameSite=Lax` cookie under `/api/auth`.
- Axios automatically calls `/api/auth/refresh` after a 401 and retries once.
- Passwords use bcrypt with 12 salt rounds.
- `passwordHash` is excluded from normal queries/responses.

## Data Model

```text
User
  _id, name, email, passwordHash, avatar, timestamps

Workspace
  _id, name, description, owner
  members[] = { user, role, joinedAt }
  roles: OWNER | ADMIN | MEMBER | VIEWER

Board
  _id, workspaceId, name, description
  columns[] = { _id, name, order, isDone }
  createdBy, timestamps

Task
  _id, boardId, columnId, title, description
  priority: LOW | MEDIUM | HIGH | URGENT
  assignee, createdBy, labels, dueDate, position, timestamps

Comment
  _id, taskId, author, content, timestamps

Notification
  _id, user, type, message, workspaceId, taskId, read, timestamps

Activity
  _id, workspaceId, actor, type, message, metadata, createdAt
```

Tasks use `{ boardId, columnId, position }` for ordered board reads. Moving a task updates only the affected positions instead of rewriting the whole column.

Access to boards/tasks is checked through their parent workspace:

```text
/api/boards/:id
  -> board.workspaceId
  -> workspace membership

/api/tasks/:id
  -> task.boardId
  -> board.workspaceId
  -> workspace membership
```

## API

All responses use:

```json
{ "success": true, "data": {}, "message": "..." }
{ "success": false, "message": "..." }
```

### Auth

| Method | Route | Auth |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Public |
| POST | `/api/auth/refresh` | Refresh cookie |
| GET | `/api/auth/me` | Bearer |
| GET | `/api/health` | Public |

### Workspaces

| Method | Route | Auth |
|---|---|---|
| POST | `/api/workspaces` | Bearer |
| GET | `/api/workspaces` | Bearer |
| GET | `/api/workspaces/:id` | VIEWER+ |
| PATCH | `/api/workspaces/:id` | ADMIN+ |
| DELETE | `/api/workspaces/:id` | OWNER |
| POST | `/api/workspaces/:id/members` | ADMIN+ |
| DELETE | `/api/workspaces/:id/members/:userId` | VIEWER+* |
| PATCH | `/api/workspaces/:id/members/:userId` | ADMIN+ |
| GET | `/api/workspaces/:id/members` | VIEWER+ |
| GET | `/api/workspaces/:id/activity` | VIEWER+ |

`*` A member can remove themselves. Removing another member requires ADMIN+. The owner cannot be removed or demoted.

### Boards & Tasks

| Method | Route | Auth |
|---|---|---|
| POST | `/api/boards` | ADMIN+ |
| GET | `/api/workspaces/:id/boards` | VIEWER+ |
| GET | `/api/boards/:id` | VIEWER+ |
| PATCH | `/api/boards/:id` | ADMIN+ |
| DELETE | `/api/boards/:id` | ADMIN+ |
| POST | `/api/boards/:id/columns` | ADMIN+ |
| DELETE | `/api/boards/:id/columns/:columnId` | ADMIN+ |
| PATCH | `/api/boards/:id/columns/:columnId` | ADMIN+ |
| GET | `/api/boards/:id/tasks` | VIEWER+ |
| POST | `/api/boards/:id/tasks` | MEMBER+ |
| GET | `/api/tasks/:id` | VIEWER+ |
| PATCH | `/api/tasks/:id` | MEMBER+ |
| DELETE | `/api/tasks/:id` | ADMIN+ |
| PATCH | `/api/tasks/:id/move` | MEMBER+ |

`GET /api/boards/:id/tasks` supports `assignee`, `priority`, `columnId`, `label`, `search`, `page`, and `limit`.

### Comments, Notifications & Dashboard

| Method | Route | Auth |
|---|---|---|
| GET | `/api/tasks/:id/comments` | VIEWER+ |
| POST | `/api/tasks/:id/comments` | MEMBER+ |
| PATCH | `/api/comments/:id` | VIEWER+, author |
| DELETE | `/api/comments/:id` | VIEWER+, author |
| GET | `/api/notifications` | Bearer |
| PATCH | `/api/notifications/:id/read` | Owner |
| GET | `/api/dashboard` | Bearer |

Use `?unread=true` with notifications to show only unread items.

Auth endpoints are rate-limited to 20 requests per 15 minutes per IP.

## Realtime

Socket.io uses the same access token as REST:

```js
const socket = io("/", {
  path: "/socket.io",
  auth: { token: accessToken }
});
```

Main client events:

- `workspace:join`
- `workspace:leave`

Main server events:

- `task:created`
- `task:updated`
- `task:moved`
- `task:deleted`
- `comment:created`
- `member:added`
- `member:removed`
- `user:online`
- `user:offline`
- `notification:new`

Workspace events use `workspace:{id}` rooms. Notifications use the user's `user:{id}` room.

Frontend realtime logic lives in:

```text
client/src/services/socket.ts
client/src/hooks/useRealtimeBoard.ts
client/src/hooks/useNotifications.ts
```

## Frontend

```text
WorkspacesPage
    -> WorkspaceDetailPage
        -> BoardPage
            -> Kanban columns/tasks
```

The board uses local column state for drag-and-drop and TanStack Query for server data. `reorderColumns()` handles the actual move logic and `PATCH /api/tasks/:id/move` persists it.

When a move fails, the task query is invalidated and the board is rebuilt from server data.

Search/filtering happens client-side with a 250ms debounce. Dragging is disabled while filters are active so filtered indexes cannot produce incorrect task positions.

## Environment

Copy `server/.env.example` to `.env`:

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

## Run Locally

### Server

```bash
>>>>>>> origin
cd server
cp .env.example .env
npm install
npm run dev
<<<<<<< HEAD

The API runs on http://localhost:5000.

You'll need MongoDB running locally, or you can use the included Docker setup.

3. Start the frontend

Open another terminal:

cd client
npm install
npm run dev

The frontend runs on http://localhost:5173.
=======
```

Runs on `http://localhost:5000`.

### Client

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`.

You need MongoDB running locally, or use Docker.
>>>>>>> origin

4. Environment variables

The backend uses the values in server/.env.example.

<<<<<<< HEAD
At minimum, configure your MongoDB connection and JWT secrets before running the application locally.

🐳 Docker
=======
Demo accounts:
>>>>>>> origin

The project also includes Docker configurations for development and production.

For local development:

<<<<<<< HEAD
=======
### Development

```bash
>>>>>>> origin
docker compose up

<<<<<<< HEAD
This starts MongoDB, the API, and the client.

🧪 Testing

The project includes tests for key backend and frontend functionality.

Backend:

=======
Starts MongoDB, API (`:5000`) and client (`:5173`).

### Production

Generate secrets first:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Then configure `server/.env.production` and run:

```bash
docker compose -f docker-compose.prod.yml --env-file server/.env.production up -d --build
```

Production serves the client through nginx on `:80` and proxies `/api` and `/socket.io` to the server.

For production, use real JWT secrets, `COOKIE_SECURE=true`, HTTPS, and the exact deployed `CLIENT_URL`.

## Testing

### Server

```bash
>>>>>>> origin
cd server
npm test

<<<<<<< HEAD
Frontend:

cd client
npm test

🔮 Possible next improvements

Refresh-token rotation and reuse detection

CI/CD automation

Structured application logging

Redis-based rate limiting

Rich-text comments and mentions

File attachments for tasks

End-to-end browser testing

Workspace ownership transfer

👨‍💻 Built by

Syed Aslam

Full Stack Developer

GitHub: https://github.com/Syedaslam018

LinkedIn: https://www.linkedin.com/in/syedaslam18/

If you try TaskBoard, I'd be interested to hear what you would add or change to make the collaboration experience better.
=======
Covers auth, workspaces, boards, tasks, comments, Socket.io, notifications, and dashboard behavior.

### Client

```bash
cd client
npm test
```

Covers task reordering and the debounce utility.

Server tests use `mongodb-memory-server`, so no external MongoDB is required.

> Tests were not run in the original sandbox because it had no network access for `npm install`.

## Performance Notes

- Dashboard stats use one MongoDB `$facet` aggregation.
- Read-only Mongoose queries use `.lean()`.
- Task assignees are resolved from the workspace member list instead of populating every task.
- `TaskCard` and `KanbanColumn` use `React.memo`.
- Task moves update only affected positions.

## Current Status

All 9 planned phases are implemented:

1. Project setup
2. Authentication
3. Workspaces + RBAC
4. Boards, columns + tasks
5. Drag-and-drop
6. Socket.io realtime
7. Notifications, activity + search
8. Dashboard + performance
9. Seed data + production Docker

## Future Improvements

- Refresh-token rotation and reuse detection
- Structured logging
- Redis rate limiting
- CI/CD pipeline
- Workspace ownership transfer
- Rich text/comments + mentions
- Task file attachments
- End-to-end browser tests

## Notes

For a production deployment, use a managed MongoDB or properly configured MongoDB service, HTTPS, secure JWT secrets, and `COOKIE_SECURE=true`.
>>>>>>> origin
