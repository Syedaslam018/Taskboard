import axios from "axios";

/**
 * Pulls the server's friendly error message out of an axios error. The API's
 * error handler always responds with `{ success: false, message }`, so we
 * surface that when present and fall back otherwise.
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback;
}
