import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

/**
 * Runs once on app load. The access token lives only in memory (see
 * authStore.ts / README for why), so a full page refresh loses it - but the
 * httpOnly refresh cookie set at login is still valid. This silently
 * exchanges that cookie for a new access token before rendering protected
 * routes, so refreshing the page doesn't look like a logout. If there's no
 * valid refresh cookie, it fails silently and the user lands on /login,
 * same as if they'd never logged in.
 */
export function useBootstrapAuth(): boolean {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  useEffect(() => {
    let cancelled = false;
    axios
      .post("/auth/refresh", {}, { withCredentials: true })
      .then((res) => {
        if (!cancelled) setAccessToken(res.data.data.accessToken);
      })
      .catch(() => {
        // No valid refresh cookie - the user simply isn't logged in yet.
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setAccessToken]);

  return isBootstrapping;
}
