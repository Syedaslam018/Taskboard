import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { useBootstrapAuth } from "@/hooks/useBootstrapAuth";
import { initSocketSync } from "@/services/socket";
import "@/services/api";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// Sets up the accessToken -> socket connection subscription once, before
// any component renders. See services/socket.ts.
initSocketSync();

function App() {
  // Exchanges the httpOnly refresh cookie for a fresh access token on load,
  // so a page refresh doesn't look like a logout. See useBootstrapAuth.ts.
  const isBootstrapping = useBootstrapAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
