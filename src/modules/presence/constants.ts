export const DASHBOARD_PRESENCE_TOPIC = "presence:dashboard";
export const ADMIN_PRESENCE_TOPIC = "presence:admin-status";

export const PRESENCE_AWAY_AFTER_MS = 5 * 60 * 1000;
export const LAST_SEEN_INTERVAL_MS = 2 * 60 * 1000;
export const DIRECTORY_AVATAR_TTL_SECONDS = 60 * 60;

// Supabase allows five Presence calls per client in a rolling 30-second
// window. Keep one call in reserve for channel cleanup or reconnects.
export const PRESENCE_CALL_LIMIT = 4;
export const PRESENCE_CALL_WINDOW_MS = 30 * 1000;
export const PRESENCE_CALL_RETRY_BUFFER_MS = 250;

export const PRESENCE_DEVICE_STORAGE_KEY = "dashboard-presence-device-id";
export const PRESENCE_SESSION_STORAGE_KEY = "dashboard-presence-session-id";
