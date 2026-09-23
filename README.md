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

cd server
cp .env.example .env
npm install
npm run dev

The API runs on http://localhost:5000.

You'll need MongoDB running locally, or you can use the included Docker setup.

3. Start the frontend

Open another terminal:

cd client
npm install
npm run dev

The frontend runs on http://localhost:5173.

4. Environment variables

The backend uses the values in server/.env.example.

At minimum, configure your MongoDB connection and JWT secrets before running the application locally.

🐳 Docker

The project also includes Docker configurations for development and production.

For local development:

docker compose up

This starts MongoDB, the API, and the client.

🧪 Testing

The project includes tests for key backend and frontend functionality.

Backend:

cd server
npm test

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