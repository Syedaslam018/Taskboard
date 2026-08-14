/**
 * Demo data seed script. Run with `npm run seed` (see package.json).
 *
 * Writes directly through the Mongoose models rather than making HTTP
 * requests against a running server - there's no server process, no JWTs,
 * and no Socket.io connection needed to seed a database, so going through
 * the REST API here would just be unnecessary overhead and a second thing
 * that could fail. It intentionally does NOT emit Socket.io events or
 * create real-time side effects; this is offline data setup, not a
 * simulation of live usage.
 *
 * Idempotent: clears its own demo collections before inserting, so it's
 * safe to run more than once against the same database.
 */
import bcrypt from "bcrypt";
import mongoose, { Types } from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { User } from "../models/User";
import { Workspace, WorkspaceRole } from "../models/Workspace";
import { Board, DEFAULT_COLUMNS } from "../models/Board";
import { Task, TaskPriority } from "../models/Task";
import { Comment } from "../models/Comment";
import { Notification, NotificationType } from "../models/Notification";
import { Activity, ActivityType } from "../models/Activity";

const SALT_ROUNDS = 12;
const DEMO_PASSWORD = "password123";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS);

async function clearDemoData(): Promise<void> {
  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    Board.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
    Activity.deleteMany({}),
  ]);
}

async function seed(): Promise<void> {
  await connectDB();
  console.log("[seed] clearing existing data...");
  await clearDemoData();

  console.log("[seed] creating users...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const [alice, bob, carol] = await User.create([
    { name: "Alice Chen", email: "alice@example.com", passwordHash },
    { name: "Bob Martinez", email: "bob@example.com", passwordHash },
    { name: "Carol Nguyen", email: "carol@example.com", passwordHash },
  ]);

  console.log("[seed] creating workspaces...");
  const websiteWorkspace = await Workspace.create({
    name: "Website Redesign",
    description: "Q3 marketing site relaunch",
    owner: alice._id,
    members: [
      { user: alice._id, role: WorkspaceRole.OWNER, joinedAt: new Date() },
      { user: bob._id, role: WorkspaceRole.ADMIN, joinedAt: new Date() },
      { user: carol._id, role: WorkspaceRole.MEMBER, joinedAt: new Date() },
    ],
  });

  const mobileWorkspace = await Workspace.create({
    name: "Mobile App Launch",
    description: "iOS/Android v1.0 release",
    owner: bob._id,
    members: [
      { user: bob._id, role: WorkspaceRole.OWNER, joinedAt: new Date() },
      { user: alice._id, role: WorkspaceRole.ADMIN, joinedAt: new Date() },
      { user: carol._id, role: WorkspaceRole.VIEWER, joinedAt: new Date() },
    ],
  });

  // Both boards use the same standard 5-column layout (Backlog/To Do/In
  // Progress/Review/Done) that every new board defaults to - see
  // DEFAULT_COLUMNS in models/Board.ts - rather than inventing one-off
  // column sets, so the seeded boards look like what a real user gets.
  const makeColumns = () =>
    DEFAULT_COLUMNS.map((name, index) => ({
      _id: new Types.ObjectId(),
      name,
      order: index,
      isDone: name === "Done",
    }));

  console.log("[seed] creating boards...");
  const sprintBoard = await Board.create({
    workspaceId: websiteWorkspace._id,
    name: "Sprint Board",
    description: "Current sprint work",
    columns: makeColumns(),
    createdBy: alice._id,
  });

  const launchBoard = await Board.create({
    workspaceId: mobileWorkspace._id,
    name: "Launch Plan",
    description: "Path to v1.0",
    columns: makeColumns(),
    createdBy: bob._id,
  });

  const col = (board: typeof sprintBoard, name: string) =>
    board.columns.find((c) => c.name === name)!._id;

  console.log("[seed] creating tasks...");
  type TaskSeed = {
    board: typeof sprintBoard;
    columnName: string;
    title: string;
    description?: string;
    priority: TaskPriority;
    assignee?: Types.ObjectId;
    labels?: string[];
    dueDate?: Date;
  };

  const taskSeeds: TaskSeed[] = [
    // Sprint Board (Website Redesign)
    { board: sprintBoard, columnName: "Backlog", title: "Redesign pricing page", priority: TaskPriority.MEDIUM, labels: ["design"] },
    { board: sprintBoard, columnName: "Backlog", title: "Audit accessibility (WCAG AA)", priority: TaskPriority.LOW, assignee: carol._id },
    { board: sprintBoard, columnName: "Backlog", title: "Migrate blog to new CMS", priority: TaskPriority.MEDIUM },
    { board: sprintBoard, columnName: "To Do", title: "Implement Login API", priority: TaskPriority.HIGH, assignee: bob._id, dueDate: daysFromNow(2), labels: ["backend"] },
    { board: sprintBoard, columnName: "To Do", title: "Design new navbar", priority: TaskPriority.MEDIUM, assignee: carol._id, dueDate: daysFromNow(5) },
    { board: sprintBoard, columnName: "To Do", title: "Set up CI pipeline", priority: TaskPriority.HIGH, assignee: alice._id, dueDate: daysFromNow(-1) },
    { board: sprintBoard, columnName: "In Progress", title: "Dashboard UI", priority: TaskPriority.HIGH, assignee: carol._id, dueDate: daysFromNow(1), labels: ["frontend"] },
    { board: sprintBoard, columnName: "In Progress", title: "API rate limiting", priority: TaskPriority.URGENT, assignee: bob._id, dueDate: daysFromNow(-2), labels: ["backend", "security"] },
    { board: sprintBoard, columnName: "In Progress", title: "Payment integration", priority: TaskPriority.HIGH, assignee: alice._id },
    { board: sprintBoard, columnName: "Review", title: "Database Optimization", priority: TaskPriority.MEDIUM, assignee: bob._id },
    { board: sprintBoard, columnName: "Review", title: "Refactor auth middleware", priority: TaskPriority.LOW, assignee: alice._id },
    { board: sprintBoard, columnName: "Done", title: "Set up project scaffolding", priority: TaskPriority.MEDIUM, assignee: alice._id },
    { board: sprintBoard, columnName: "Done", title: "Configure ESLint/Prettier", priority: TaskPriority.LOW, assignee: bob._id },
    // Launch Plan (Mobile App Launch)
    { board: launchBoard, columnName: "Backlog", title: "App Store screenshots", priority: TaskPriority.LOW },
    { board: launchBoard, columnName: "Backlog", title: "Push notification opt-in flow", priority: TaskPriority.MEDIUM, assignee: alice._id },
    { board: launchBoard, columnName: "To Do", title: "Beta TestFlight rollout", priority: TaskPriority.HIGH, assignee: bob._id, dueDate: daysFromNow(3) },
    { board: launchBoard, columnName: "To Do", title: "Crash reporting integration", priority: TaskPriority.MEDIUM, assignee: alice._id, dueDate: daysFromNow(-3), labels: ["mobile"] },
    { board: launchBoard, columnName: "In Progress", title: "Offline mode support", priority: TaskPriority.HIGH, assignee: bob._id, dueDate: daysFromNow(4) },
    { board: launchBoard, columnName: "Done", title: "App icon & splash screen", priority: TaskPriority.LOW, assignee: alice._id },
  ];

  const createdTasks = [];
  for (const seedTask of taskSeeds) {
    const task = await Task.create({
      boardId: seedTask.board._id,
      columnId: col(seedTask.board, seedTask.columnName),
      title: seedTask.title,
      description: seedTask.description,
      priority: seedTask.priority,
      assignee: seedTask.assignee,
      createdBy: seedTask.board.createdBy,
      labels: seedTask.labels ?? [],
      dueDate: seedTask.dueDate,
      position: 0, // seed data doesn't need meaningful ordering within a column
    });
    createdTasks.push(task);
  }

  console.log("[seed] creating comments...");
  const commentSeeds: Array<{ taskIndex: number; author: Types.ObjectId; content: string }> = [
    { taskIndex: 3, author: alice._id, content: "Let's use JWT with refresh tokens for this." },
    { taskIndex: 3, author: bob._id, content: "API integration is almost complete." },
    { taskIndex: 4, author: carol._id, content: "Sharing a Figma link in Slack shortly." },
    { taskIndex: 6, author: bob._id, content: "This is blocked on the design handoff." },
    { taskIndex: 6, author: carol._id, content: "Handoff is done, unblocking now." },
    { taskIndex: 7, author: alice._id, content: "Let's cap this at 100 requests/min per IP." },
    { taskIndex: 7, author: bob._id, content: "Agreed, implementing with express-rate-limit." },
    { taskIndex: 9, author: bob._id, content: "Added compound indexes, should be much faster now." },
    { taskIndex: 15, author: bob._id, content: "TestFlight build #12 is live." },
    { taskIndex: 17, author: bob._id, content: "Offline queue is syncing correctly on reconnect." },
    { taskIndex: 17, author: alice._id, content: "Nice, can you add a test for the conflict case?" },
  ];

  for (const c of commentSeeds) {
    await Comment.create({ taskId: createdTasks[c.taskIndex]._id, author: c.author, content: c.content });
  }

  console.log("[seed] creating notifications...");
  await Notification.create([
    {
      user: bob._id,
      type: NotificationType.TASK_ASSIGNED,
      message: "Alice Chen assigned you \"Implement Login API\"",
      workspaceId: websiteWorkspace._id,
      taskId: createdTasks[3]._id,
      read: false,
    },
    {
      user: carol._id,
      type: NotificationType.COMMENT_ADDED,
      message: "Bob Martinez commented on \"Dashboard UI\"",
      workspaceId: websiteWorkspace._id,
      taskId: createdTasks[6]._id,
      read: false,
    },
    {
      user: carol._id,
      type: NotificationType.MEMBER_ADDED,
      message: "Alice Chen added you to \"Website Redesign\"",
      workspaceId: websiteWorkspace._id,
      read: true,
    },
    {
      user: alice._id,
      type: NotificationType.TASK_MOVED,
      message: "Bob Martinez moved your task \"Payment integration\" to In Progress",
      workspaceId: websiteWorkspace._id,
      taskId: createdTasks[8]._id,
      read: false,
    },
  ]);

  console.log("[seed] creating activity log...");
  await Activity.create([
    {
      workspaceId: websiteWorkspace._id,
      actor: alice._id,
      type: ActivityType.BOARD_CREATED,
      message: "Alice Chen created the board \"Sprint Board\"",
    },
    {
      workspaceId: websiteWorkspace._id,
      actor: alice._id,
      type: ActivityType.TASK_CREATED,
      message: 'Alice Chen created "Implement Login API"',
    },
    {
      workspaceId: websiteWorkspace._id,
      actor: bob._id,
      type: ActivityType.TASK_MOVED,
      message: 'Bob Martinez moved "Dashboard UI" to In Progress',
    },
    {
      workspaceId: websiteWorkspace._id,
      actor: carol._id,
      type: ActivityType.COMMENT_ADDED,
      message: 'Carol Nguyen commented on "Design new navbar"',
    },
    {
      workspaceId: websiteWorkspace._id,
      actor: alice._id,
      type: ActivityType.MEMBER_ADDED,
      message: "Alice Chen added carol@example.com to the workspace",
    },
    {
      workspaceId: mobileWorkspace._id,
      actor: bob._id,
      type: ActivityType.BOARD_CREATED,
      message: 'Bob Martinez created the board "Launch Plan"',
    },
    {
      workspaceId: mobileWorkspace._id,
      actor: bob._id,
      type: ActivityType.TASK_MOVED,
      message: 'Bob Martinez moved "Offline mode support" to In Progress',
    },
  ]);

  console.log("\n[seed] done!");
  console.log("[seed] demo accounts (all use the same password):");
  console.log(`  alice@example.com / ${DEMO_PASSWORD}  (OWNER of Website Redesign, ADMIN of Mobile App Launch)`);
  console.log(`  bob@example.com   / ${DEMO_PASSWORD}  (ADMIN of Website Redesign, OWNER of Mobile App Launch)`);
  console.log(`  carol@example.com / ${DEMO_PASSWORD}  (MEMBER of Website Redesign, VIEWER of Mobile App Launch)`);
}

seed()
  .then(() => disconnectDB())
  .then(() => {
    console.log("[seed] disconnected, exiting.");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[seed] failed:", err);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
