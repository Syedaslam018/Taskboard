import { api } from "./api";
import { User } from "@/types/user";

interface AuthResponse {
  success: boolean;
  data: { user: User; accessToken: string };
  message: string;
}

export const authService = {
  async register(name: string, email: string, password: string) {
    const { data } = await api.post<AuthResponse>("/auth/register", { name, email, password });
    return data.data;
  },
  async login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    return data.data;
  },
  async logout() {
    await api.post("/auth/logout");
  },
  async me() {
    const { data } = await api.get<{ success: boolean; data: { user: User } }>("/auth/me");
    return data.data.user;
  },
};
