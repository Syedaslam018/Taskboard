/**
 * Compact relative-time formatter ("just now", "5m ago", "3h ago", "2d ago").
 * Consolidated from three identical copies that lived in DashboardPage,
 * NotificationBell, and ActivityFeed.
 */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
