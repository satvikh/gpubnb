export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatTimeAgo(value: string | null) {
  if (!value) return "Never";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function estimateRemaining(progress: number, startedAt: string | null) {
  if (!startedAt || progress <= 0) return "Calculating";
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  const remaining = Math.max(1, Math.round((elapsed / progress) * (100 - progress)));
  return formatDuration(remaining);
}
