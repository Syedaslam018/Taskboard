import { Task } from "./task";
import { ActivityEntry } from "./activity";

export interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  dueSoon: number;
}

export interface DashboardData {
  stats: DashboardStats;
  myTasks: Task[];
  recentActivity: ActivityEntry[];
}
