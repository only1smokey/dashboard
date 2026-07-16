import {
  ADMIN_PRESENCE_TOPIC,
  DASHBOARD_PRESENCE_TOPIC,
  PRESENCE_AWAY_AFTER_MS,
  PRESENCE_CALL_LIMIT,
  PRESENCE_CALL_RETRY_BUFFER_MS,
  PRESENCE_CALL_WINDOW_MS,
} from "./constants.ts";
import {
  presenceDeviceLabels,
  presenceSectionIds,
  type AdminPresencePayload,
  type NormalPresencePayload,
  type PeopleDirectoryEntry,
  type PersonPresence,
  type PresenceActivity,
  type PresenceDevice,
  type PresenceDeviceLabel,
  type PresenceModuleActivityInput,
  type PresencePreferences,
  type PresenceSectionActivityInput,
  type PresenceSession,
  type PresenceStatus,
  type PublishedPresenceActivity,
} from "./types.ts";

export const defaultPresencePreferences: PresencePreferences = {
  showCurrentSection: true,
  showDetailedActivity: true,
  showMediaTitles: true,
  showOnline: true,
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifierPattern = /^[a-z][a-z0-9-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 40 &&
    Number.isFinite(Date.parse(value))
  );
}

function isShortText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= maximum
  );
}

function isDeviceLabel(value: unknown): value is PresenceDeviceLabel {
  return presenceDeviceLabels.some((label) => label === value);
}

function isLiveStatus(
  value: unknown,
): value is Exclude<PresenceStatus, "offline"> {
  return value === "online" || value === "away";
}

function readPublishedActivity(
  value: unknown,
): PublishedPresenceActivity | undefined {
  if (!isRecord(value)) return undefined;
  if (value.kind !== "section" && value.kind !== "module") return undefined;
  if (
    !isShortText(value.actionId, 64) ||
    !identifierPattern.test(value.actionId) ||
    typeof value.priority !== "number" ||
    !Number.isInteger(value.priority) ||
    value.priority < 0 ||
    value.priority > 100 ||
    !isIsoTimestamp(value.startedAt) ||
    !isIsoTimestamp(value.updatedAt)
  ) {
    return undefined;
  }

  const sectionId = presenceSectionIds.find((id) => id === value.sectionId);
  const moduleId =
    typeof value.moduleId === "string" && identifierPattern.test(value.moduleId)
      ? value.moduleId
      : undefined;

  if (value.kind === "section" && !sectionId) return undefined;
  if (value.kind === "module" && !moduleId) return undefined;
  if (value.title !== undefined && !isShortText(value.title, 200)) {
    return undefined;
  }
  if (value.details !== undefined && !isShortText(value.details, 500)) {
    return undefined;
  }
  if (
    value.viewingLocation !== undefined &&
    !isShortText(value.viewingLocation, 200)
  ) {
    return undefined;
  }

  return {
    actionId: value.actionId,
    ...(typeof value.details === "string" ? { details: value.details } : {}),
    kind: value.kind,
    ...(moduleId ? { moduleId } : {}),
    priority: value.priority,
    ...(sectionId ? { sectionId } : {}),
    startedAt: value.startedAt,
    ...(typeof value.title === "string" ? { title: value.title } : {}),
    updatedAt: value.updatedAt,
    ...(typeof value.viewingLocation === "string"
      ? { viewingLocation: value.viewingLocation }
      : {}),
  };
}

function readBasePayload(value: unknown) {
  if (!isRecord(value)) return null;
  if (
    value.version !== 1 ||
    typeof value.userId !== "string" ||
    !uuidPattern.test(value.userId) ||
    typeof value.deviceId !== "string" ||
    !uuidPattern.test(value.deviceId) ||
    typeof value.sessionId !== "string" ||
    !uuidPattern.test(value.sessionId) ||
    !isLiveStatus(value.status) ||
    !isIsoTimestamp(value.timestamp)
  ) {
    return null;
  }

  return {
    deviceId: value.deviceId,
    deviceLabel: isDeviceLabel(value.deviceLabel)
      ? value.deviceLabel
      : "Unknown device",
    sessionId: value.sessionId,
    status: value.status,
    timestamp: value.timestamp,
    userId: value.userId,
  };
}

export function readNormalPresenceState(
  state: Record<string, readonly unknown[]>,
): NormalPresencePayload[] {
  const sessions: NormalPresencePayload[] = [];

  for (const [key, entries] of Object.entries(state)) {
    for (const entry of entries) {
      const base = readBasePayload(entry);
      if (!base || key !== base.sessionId) continue;
      const record = isRecord(entry) ? entry : {};
      const activity = readPublishedActivity(record.activity);
      sessions.push({
        ...base,
        ...(activity ? { activity } : {}),
        version: 1,
      });
    }
  }

  return sessions;
}

export function readAdminPresenceState(
  state: Record<string, readonly unknown[]>,
): AdminPresencePayload[] {
  const sessions: AdminPresencePayload[] = [];

  for (const [key, entries] of Object.entries(state)) {
    for (const entry of entries) {
      const base = readBasePayload(entry);
      if (!base || key !== base.sessionId) continue;
      sessions.push({ ...base, version: 1 });
    }
  }

  return sessions;
}

export function getPresenceChannelOptions(
  sessionId: string,
  receivePresence: boolean,
) {
  return {
    config: {
      presence: { enabled: receivePresence, key: sessionId },
      private: true,
    },
  } as const;
}

export function getPresenceTopics() {
  return {
    admin: ADMIN_PRESENCE_TOPIC,
    dashboard: DASHBOARD_PRESENCE_TOPIC,
  } as const;
}

export function detectDeviceLabel({
  maxTouchPoints,
  platform,
  userAgent,
}: {
  maxTouchPoints: number;
  platform: string;
  userAgent: string;
}): PresenceDeviceLabel {
  if (
    /iPad/i.test(userAgent) ||
    (/MacIntel/i.test(platform) && maxTouchPoints > 1)
  ) {
    return "iPad";
  }
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/Android/i.test(userAgent)) {
    return /Mobile/i.test(userAgent) ? "Android phone" : "Android tablet";
  }
  if (/Windows/i.test(userAgent) || /Win/i.test(platform)) return "Windows PC";
  if (/Macintosh|Mac OS X/i.test(userAgent) || /Mac/i.test(platform))
    return "Mac";
  if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) return "Linux PC";
  return "Unknown device";
}

export function getSessionStatus(
  lastActivityAt: number,
  now: number,
  awayAfterMs = PRESENCE_AWAY_AFTER_MS,
): Exclude<PresenceStatus, "offline"> {
  return now - lastActivityAt >= awayAfterMs ? "away" : "online";
}

export function getPresenceCallDelay(
  callTimestamps: readonly number[],
  now: number,
  limit = PRESENCE_CALL_LIMIT,
  windowMs = PRESENCE_CALL_WINDOW_MS,
) {
  const recentCalls = callTimestamps
    .filter((timestamp) => timestamp > now - windowMs)
    .toSorted((first, second) => first - second);
  if (recentCalls.length < limit) return 0;

  const oldestCallThatMustExpire =
    recentCalls[recentCalls.length - limit] ?? now;
  return Math.max(
    0,
    oldestCallThatMustExpire + windowMs - now + PRESENCE_CALL_RETRY_BUFFER_MS,
  );
}

export function createRouteActivity(
  pathname: string,
  viewingLocation: string | null,
  timestamp = new Date().toISOString(),
): PresenceActivity {
  const common = {
    genericActionId: "viewing",
    kind: "section" as const,
    mediaSensitive: false,
    priority: 10,
    startedAt: timestamp,
    updatedAt: timestamp,
    usesViewingLocation: false,
  };

  if (pathname.startsWith("/profile")) {
    return { ...common, actionId: "viewing", sectionId: "profile" };
  }
  if (pathname.startsWith("/settings")) {
    return { ...common, actionId: "viewing", sectionId: "settings" };
  }
  if (pathname.startsWith("/admin")) {
    return { ...common, actionId: "using", sectionId: "admin" };
  }

  return {
    ...common,
    actionId: "viewing",
    sectionId: "dashboard",
    usesViewingLocation: true,
    ...(viewingLocation ? { viewingLocation } : {}),
  };
}

export function createModuleActivity(
  input: PresenceModuleActivityInput,
  viewingLocation: string | null,
  previousStartedAt?: string,
  timestamp = new Date().toISOString(),
): PresenceActivity {
  return {
    actionId: input.actionId,
    ...(input.details ? { details: input.details } : {}),
    genericActionId: input.genericActionId,
    kind: "module",
    mediaSensitive: input.mediaSensitive ?? false,
    moduleId: input.moduleId,
    priority: input.priority ?? 50,
    startedAt: previousStartedAt ?? timestamp,
    ...(input.title ? { title: input.title } : {}),
    updatedAt: timestamp,
    usesViewingLocation: input.usesViewingLocation ?? false,
    ...(input.usesViewingLocation && viewingLocation
      ? { viewingLocation }
      : {}),
  };
}

export function createSectionActivity(
  input: PresenceSectionActivityInput,
  viewingLocation: string | null,
  previousStartedAt?: string,
  timestamp = new Date().toISOString(),
): PresenceActivity {
  return {
    actionId: input.actionId,
    genericActionId: input.genericActionId ?? "viewing",
    kind: "section",
    mediaSensitive: false,
    priority: input.priority ?? 20,
    sectionId: input.sectionId,
    startedAt: previousStartedAt ?? timestamp,
    updatedAt: timestamp,
    usesViewingLocation: input.usesViewingLocation ?? false,
    ...(input.usesViewingLocation && viewingLocation
      ? { viewingLocation }
      : {}),
  };
}

export function filterNormalPresencePayload({
  activity,
  deviceId,
  deviceLabel,
  preferences,
  sessionId,
  status,
  timestamp,
  userId,
}: {
  activity: PresenceActivity | null;
  deviceId: string;
  deviceLabel: PresenceDeviceLabel;
  preferences: PresencePreferences;
  sessionId: string;
  status: Exclude<PresenceStatus, "offline">;
  timestamp: string;
  userId: string;
}): NormalPresencePayload | null {
  if (!preferences.showOnline) return null;

  let publishedActivity: PublishedPresenceActivity | undefined;
  if (activity && preferences.showCurrentSection) {
    const includeRichDetails =
      preferences.showDetailedActivity &&
      (!activity.mediaSensitive || preferences.showMediaTitles);
    publishedActivity = {
      actionId: includeRichDetails
        ? activity.actionId
        : activity.genericActionId,
      ...(includeRichDetails && activity.details
        ? { details: activity.details }
        : {}),
      kind: activity.kind,
      ...(activity.moduleId ? { moduleId: activity.moduleId } : {}),
      priority: activity.priority,
      ...(activity.sectionId ? { sectionId: activity.sectionId } : {}),
      startedAt: activity.startedAt,
      ...(includeRichDetails && activity.title
        ? { title: activity.title }
        : {}),
      updatedAt: activity.updatedAt,
      ...(includeRichDetails && activity.viewingLocation
        ? { viewingLocation: activity.viewingLocation }
        : {}),
    };
  }

  return {
    ...(publishedActivity ? { activity: publishedActivity } : {}),
    deviceId,
    deviceLabel,
    sessionId,
    status,
    timestamp,
    userId,
    version: 1,
  };
}

export function buildAdminPresencePayload({
  deviceId,
  deviceLabel,
  sessionId,
  status,
  timestamp,
  userId,
}: Omit<AdminPresencePayload, "version">): AdminPresencePayload {
  return {
    deviceId,
    deviceLabel,
    sessionId,
    status,
    timestamp,
    userId,
    version: 1,
  };
}

function activityScore(activity: PublishedPresenceActivity) {
  const richness =
    Number(Boolean(activity.title)) * 3 +
    Number(Boolean(activity.details)) * 2 +
    Number(Boolean(activity.viewingLocation));
  return activity.priority * 10 + richness;
}

function chooseActivity(sessions: PresenceSession[]) {
  return sessions
    .flatMap((session) => (session.activity ? [session.activity] : []))
    .toSorted((first, second) => {
      const scoreDifference = activityScore(second) - activityScore(first);
      if (scoreDifference !== 0) return scoreDifference;
      return Date.parse(second.updatedAt) - Date.parse(first.updatedAt);
    })[0];
}

function groupDevices(sessions: PresenceSession[]): PresenceDevice[] {
  const byDevice = new Map<string, PresenceSession[]>();

  for (const session of sessions) {
    const current = byDevice.get(session.deviceId) ?? [];
    current.push(session);
    byDevice.set(session.deviceId, current);
  }

  return [...byDevice.entries()]
    .map(([deviceId, deviceSessions]) => {
      const activity = chooseActivity(deviceSessions);
      return {
        ...(activity ? { activity } : {}),
        deviceId,
        label:
          deviceSessions.toSorted(
            (first, second) =>
              Date.parse(second.timestamp) - Date.parse(first.timestamp),
          )[0]?.deviceLabel ?? "Unknown device",
        sessions: deviceSessions,
        status: deviceSessions.some((session) => session.status === "online")
          ? ("online" as const)
          : ("away" as const),
      };
    })
    .toSorted((first, second) => {
      if (first.status !== second.status)
        return first.status === "online" ? -1 : 1;
      return first.label.localeCompare(second.label);
    });
}

export function groupPeople({
  adminSessions,
  directory,
  isAdmin,
  normalSessions,
}: {
  adminSessions: AdminPresencePayload[];
  directory: PeopleDirectoryEntry[];
  isAdmin: boolean;
  normalSessions: NormalPresencePayload[];
}): PersonPresence[] {
  const knownUsers = new Set(directory.map((person) => person.userId));
  const visibleNormalSessions = normalSessions.filter((session) =>
    knownUsers.has(session.userId),
  );
  const normalBySession = new Map(
    visibleNormalSessions.map((session) => [session.sessionId, session]),
  );
  const adminSessionIds = new Set(
    adminSessions.map((session) => session.sessionId),
  );
  const liveSessions: PresenceSession[] = isAdmin
    ? [
        ...adminSessions,
        ...visibleNormalSessions.filter(
          (session) => !adminSessionIds.has(session.sessionId),
        ),
      ]
        .filter((session) => knownUsers.has(session.userId))
        .map((session) => {
          const visible = normalBySession.get(session.sessionId);
          const activity =
            visible?.userId === session.userId &&
            visible.deviceId === session.deviceId
              ? visible.activity
              : undefined;
          return { ...session, ...(activity ? { activity } : {}) };
        })
    : visibleNormalSessions;

  return directory
    .map((person): PersonPresence => {
      const devices = groupDevices(
        liveSessions.filter((session) => session.userId === person.userId),
      );
      const status: PresenceStatus = devices.some(
        (device) => device.status === "online",
      )
        ? "online"
        : devices.length > 0
          ? "away"
          : "offline";

      return {
        ...person,
        devices,
        lastSeenAt: status === "offline" ? person.lastSeenAt : null,
        status,
      };
    })
    .toSorted((first, second) => {
      const order: Record<PresenceStatus, number> = {
        online: 0,
        away: 1,
        offline: 2,
      };
      const statusDifference = order[first.status] - order[second.status];
      if (statusDifference !== 0) return statusDifference;
      return (first.displayName ?? first.userId).localeCompare(
        second.displayName ?? second.userId,
      );
    });
}

export function getCompactPeople(
  people: PersonPresence[],
  currentUserId: string,
  maximum = 3,
) {
  const available = people
    .filter((person) => person.status !== "offline")
    .toSorted((first, second) => {
      if (first.status !== second.status)
        return first.status === "online" ? -1 : 1;
      const firstIsCurrent = first.userId === currentUserId;
      const secondIsCurrent = second.userId === currentUserId;
      if (firstIsCurrent !== secondIsCurrent) return firstIsCurrent ? 1 : -1;
      return (first.displayName ?? first.userId).localeCompare(
        second.displayName ?? second.userId,
      );
    });

  return {
    people: available.slice(0, maximum),
    remaining: Math.max(0, available.length - maximum),
    total: available.length,
  };
}
