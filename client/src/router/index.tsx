import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import WorkspacesPage from "@/pages/WorkspacesPage";
import WorkspaceDetailPage from "@/pages/WorkspaceDetailPage";
import BoardPage from "@/pages/BoardPage";
import ProtectedRoute from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/workspaces", element: <WorkspacesPage /> },
      { path: "/workspaces/:workspaceId", element: <WorkspaceDetailPage /> },
      { path: "/boards/:boardId", element: <BoardPage /> },
    ],
  },
]);
