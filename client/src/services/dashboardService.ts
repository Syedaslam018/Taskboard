import { api } from "./api";
import { DashboardData } from "@/types/dashboard";

export const dashboardService = {
  async get() {
    const { data } = await api.get<{ data: DashboardData }>("/dashboard");
    return data.data;
  },
};
