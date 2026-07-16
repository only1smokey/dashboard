import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PRESENCE_AWAY_AFTER_MS,
  PRESENCE_CALL_RETRY_BUFFER_MS,
  PRESENCE_CALL_WINDOW_MS,
} from "./constants.ts";
import {
  buildAdminPresencePayload,
  createModuleActivity,
  createRouteActivity,
  defaultPresencePreferences,
  detectDeviceLabel,
  filterNormalPresencePayload,
  getCompactPeople,
  getPresenceCallDelay,
  getPresenceChannelOptions,
  getSessionStatus,
  groupPeople,
  readNormalPresenceState,
} from "./presence.ts";
import type {
  AdminPresencePayload,
  NormalPresencePayload,
  PeopleDirectoryEntry,
  PresenceDeviceLabel,
  PresenceStatus,
} from "./types.ts";

const userOne = "00000000-0000-4000-8000-000000000001";
const userTwo = "00000000-0000-4000-8000-000000000002";
const userThree = "00000000-0000-4000-8000-000000000003";
const userFour = "00000000-0000-4000-8000-000000000004";
const deviceOne = "10000000-0000-4000-8000-000000000001";
const deviceTwo = "10000000-0000-4000-8000-000000000002";
const sessionOne = "20000000-0000-4000-8000-000000000001";
const sessionTwo = "20000000-0000-4000-8000-000000000002";
const timestamp = "2026-07-16T12:00:00.000Z";

function normalSession({
  deviceId = deviceOne,
  deviceLabel = "Windows PC",
  sessionId = sessionOne,
  status = "online",
  userId = userOne,
}: {
  deviceId?: string;
  deviceLabel?: PresenceDeviceLabel;
  sessionId?: string;
  status?: Exclude<PresenceStatus, "offline">;
  userId?: string;
} = {}): NormalPresencePayload {
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

function directoryEntry(
  userId: string,
  displayName: string,
  lastSeenAt: string | null = null,
): PeopleDirectoryEntry {
  return {
    avatarPath: null,
    avatarUrl: null,
    displayName,
    lastSeenAt,
    userId,
  };
}

test("configures both Presence directions as a private session-keyed channel", () => {
  assert.deepEqual(getPresenceChannelOptions(sessionOne, true), {
    config: {
      presence: { enabled: true, key: sessionOne },
      private: true,
    },
  });
  assert.equal(
    getPresenceChannelOptions(sessionOne, false).config.presence.enabled,
    false,
  );
});

test("detects only the supported broad device categories", () => {
  assert.equal(
    detectDeviceLabel({
      maxTouchPoints: 5,
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
    }),
    "iPad",
  );
  assert.equal(
    detectDeviceLabel({
      maxTouchPoints: 1,
      platform: "Linux armv8l",
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile",
    }),
    "Android phone",
  );
  assert.equal(
    detectDeviceLabel({
      maxTouchPoints: 0,
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    }),
    "Windows PC",
  );
});

test("moves a connected session away after five minutes and online after activity", () => {
  const start = Date.parse(timestamp);
  assert.equal(
    getSessionStatus(start, start + PRESENCE_AWAY_AFTER_MS - 1),
    "online",
  );
  assert.equal(getSessionStatus(start, start + PRESENCE_AWAY_AFTER_MS), "away");
  assert.equal(
    getSessionStatus(
      start + PRESENCE_AWAY_AFTER_MS,
      start + PRESENCE_AWAY_AFTER_MS,
    ),
    "online",
  );
});

test("reserves headroom below the Supabase client Presence rate limit", () => {
  const calls = [0, 100, 200, 300];
  assert.equal(getPresenceCallDelay(calls.slice(0, 3), 400), 0);
  assert.equal(
    getPresenceCallDelay(calls, 400),
    PRESENCE_CALL_WINDOW_MS - 400 + PRESENCE_CALL_RETRY_BUFFER_MS,
  );
  assert.equal(getPresenceCallDelay(calls, PRESENCE_CALL_WINDOW_MS), 0);
});

test("filters normal Presence before transmission", () => {
  const mediaActivity = createModuleActivity(
    {
      actionId: "watching",
      details: "German · 4K",
      genericActionId: "using",
      mediaSensitive: true,
      moduleId: "media",
      title: "Interstellar",
      usesViewingLocation: true,
    },
    "Boxberg, Germany",
    undefined,
    timestamp,
  );
  const common = {
    activity: mediaActivity,
    deviceId: deviceOne,
    deviceLabel: "Windows PC" as const,
    sessionId: sessionOne,
    status: "online" as const,
    timestamp,
    userId: userOne,
  };

  assert.equal(
    filterNormalPresencePayload({
      ...common,
      preferences: { ...defaultPresencePreferences, showOnline: false },
    }),
    null,
  );

  const hiddenSection = filterNormalPresencePayload({
    ...common,
    preferences: {
      ...defaultPresencePreferences,
      showCurrentSection: false,
    },
  });
  assert.equal(hiddenSection?.activity, undefined);

  const hiddenDetails = filterNormalPresencePayload({
    ...common,
    preferences: {
      ...defaultPresencePreferences,
      showDetailedActivity: false,
    },
  });
  assert.equal(hiddenDetails?.activity?.actionId, "using");
  assert.equal(hiddenDetails?.activity?.title, undefined);
  assert.equal(hiddenDetails?.activity?.details, undefined);
  assert.equal(hiddenDetails?.activity?.viewingLocation, undefined);

  const hiddenMediaTitle = filterNormalPresencePayload({
    ...common,
    preferences: { ...defaultPresencePreferences, showMediaTitles: false },
  });
  assert.equal(hiddenMediaTitle?.activity?.actionId, "using");
  assert.equal(hiddenMediaTitle?.activity?.title, undefined);
  assert.equal(hiddenMediaTitle?.activity?.details, undefined);
});

test("keeps the admin payload minimal", () => {
  const payload = buildAdminPresencePayload({
    deviceId: deviceOne,
    deviceLabel: "Windows PC",
    sessionId: sessionOne,
    status: "online",
    timestamp,
    userId: userOne,
  });
  assert.deepEqual(Object.keys(payload).toSorted(), [
    "deviceId",
    "deviceLabel",
    "sessionId",
    "status",
    "timestamp",
    "userId",
    "version",
  ]);
});

test("accepts synchronized sessions only when the Presence key matches the tab", () => {
  const payload = normalSession();
  assert.equal(readNormalPresenceState({ [sessionOne]: [payload] }).length, 1);
  assert.equal(readNormalPresenceState({ [sessionTwo]: [payload] }).length, 0);
});

test("groups tabs into devices, devices into users, and disconnected users offline", () => {
  const directory = [
    directoryEntry(userOne, "Ada"),
    directoryEntry(userTwo, "Bo", "2026-07-16T11:30:00.000Z"),
  ];
  const sessions = [
    normalSession(),
    normalSession({ sessionId: sessionTwo, status: "away" }),
    normalSession({
      deviceId: deviceTwo,
      deviceLabel: "iPhone",
      sessionId: "20000000-0000-4000-8000-000000000003",
    }),
  ];
  const people = groupPeople({
    adminSessions: [],
    directory,
    isAdmin: false,
    normalSessions: sessions,
  });

  assert.equal(people[0]?.userId, userOne);
  assert.equal(people[0]?.devices.length, 2);
  assert.equal(
    people[0]?.devices.find((device) => device.deviceId === deviceOne)?.sessions
      .length,
    2,
  );
  assert.equal(people[0]?.status, "online");
  assert.equal(people[0]?.lastSeenAt, null);
  assert.equal(people[1]?.status, "offline");
  assert.equal(people[1]?.lastSeenAt, "2026-07-16T11:30:00.000Z");
});

test("uses admin status for hidden users without inventing activity details", () => {
  const adminSession: AdminPresencePayload = buildAdminPresencePayload({
    deviceId: deviceOne,
    deviceLabel: "Mac",
    sessionId: sessionOne,
    status: "away",
    timestamp,
    userId: userTwo,
  });
  const [person] = groupPeople({
    adminSessions: [adminSession],
    directory: [directoryEntry(userTwo, "Bo")],
    isAdmin: true,
    normalSessions: [],
  });

  assert.equal(person?.status, "away");
  assert.equal(person?.devices[0]?.label, "Mac");
  assert.equal(person?.devices[0]?.activity, undefined);
});

test("compact previews exclude offline users, cap at three, and prefer others", () => {
  const directory = [
    directoryEntry(userOne, "Current"),
    directoryEntry(userTwo, "Bo"),
    directoryEntry(userThree, "Cy"),
    directoryEntry(userFour, "Di"),
  ];
  const people = groupPeople({
    adminSessions: [],
    directory,
    isAdmin: false,
    normalSessions: [
      normalSession({ userId: userOne }),
      normalSession({ sessionId: sessionTwo, userId: userTwo }),
      normalSession({
        sessionId: "20000000-0000-4000-8000-000000000003",
        status: "away",
        userId: userThree,
      }),
    ],
  });
  const preview = getCompactPeople(people, userOne);

  assert.equal(preview.people.length, 3);
  assert.equal(preview.people[0]?.userId, userTwo);
  assert.equal(preview.people[1]?.userId, userOne);
  assert.equal(
    preview.people.some((person) => person.userId === userFour),
    false,
  );
  assert.equal(preview.remaining, 0);
});

test("route activity uses stable identifiers and only a safe viewing label", () => {
  const activity = createRouteActivity("/", "Boxberg, Germany", timestamp);
  assert.equal(activity.sectionId, "dashboard");
  assert.equal(activity.viewingLocation, "Boxberg, Germany");
  assert.equal("route" in activity, false);
});

test("migration restricts private Presence topics to active users and admin reads", () => {
  const migration = readFileSync(
    new URL(
      "../../../supabase/migrations/20260716220000_realtime_presence.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const authorizationFix = readFileSync(
    new URL(
      "../../../supabase/migrations/20260716230000_realtime_presence_authorization_fix.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /dashboard_presence_select_active/);
  assert.match(migration, /dashboard_channel_join_active/);
  assert.match(migration, /admin_status_presence_select_admin/);
  assert.match(migration, /admin_status_channel_join_active/);
  assert.match(migration, /private\.is_active_member\(\)/);
  assert.match(migration, /private\.is_admin\(\)/);
  assert.match(migration, /realtime\.messages\.extension = 'presence'/);
  assert.doesNotMatch(migration, /realtime\.messages\.private/);
  assert.match(authorizationFix, /grant usage on schema private/);
  assert.match(authorizationFix, /dashboard_presence_select_active/);
  assert.match(authorizationFix, /dashboard_channel_join_active/);
  assert.match(authorizationFix, /admin_status_presence_select_admin/);
  assert.match(authorizationFix, /admin_status_channel_join_active/);
  const insertPolicies =
    authorizationFix
      .match(/create policy[\s\S]*?\n\);/gi)
      ?.filter((policy) => /for insert/i.test(policy)) ?? [];
  assert.equal(insertPolicies.length, 2);
  for (const policy of insertPolicies) {
    assert.doesNotMatch(policy, /extension = 'broadcast'/i);
  }
  assert.doesNotMatch(authorizationFix, /realtime\.messages\.private/);
  assert.doesNotMatch(
    migration,
    /alter\s+table\s+(?:"realtime"\.)?"?messages"?/i,
  );
  assert.doesNotMatch(migration, /to anon\s+using/i);
});
