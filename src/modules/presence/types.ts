import type { AppLocale } from "@/i18n/routing";

export const presenceStatuses = ["online", "away", "offline"] as const;
export type PresenceStatus = (typeof presenceStatuses)[number];

export const presenceDeviceLabels = [
  "iPhone",
  "iPad",
  "Android phone",
  "Android tablet",
  "Windows PC",
  "Mac",
  "Linux PC",
  "Unknown device",
] as const;
export type PresenceDeviceLabel = (typeof presenceDeviceLabels)[number];

export const presenceSectionIds = [
  "dashboard",
  "profile",
  "settings",
  "locations",
  "people",
  "admin",
] as const;
export type PresenceSectionId = (typeof presenceSectionIds)[number];

export interface PresencePreferences {
  showCurrentSection: boolean;
  showDetailedActivity: boolean;
  showMediaTitles: boolean;
  showOnline: boolean;
}

export interface PresenceActivity {
  actionId: string;
  details?: string;
  genericActionId: string;
  kind: "section" | "module";
  mediaSensitive: boolean;
  moduleId?: string;
  priority: number;
  sectionId?: PresenceSectionId;
  startedAt: string;
  title?: string;
  updatedAt: string;
  usesViewingLocation: boolean;
  viewingLocation?: string;
}

export interface PresenceModuleActivityInput {
  actionId: string;
  details?: string;
  genericActionId: string;
  mediaSensitive?: boolean;
  moduleId: string;
  priority?: number;
  title?: string;
  usesViewingLocation?: boolean;
}

export interface PresenceSectionActivityInput {
  actionId: string;
  genericActionId?: string;
  priority?: number;
  sectionId: PresenceSectionId;
  usesViewingLocation?: boolean;
}

export interface PublishedPresenceActivity {
  actionId: string;
  details?: string;
  kind: "section" | "module";
  moduleId?: string;
  priority: number;
  sectionId?: PresenceSectionId;
  startedAt: string;
  title?: string;
  updatedAt: string;
  viewingLocation?: string;
}

export interface NormalPresencePayload {
  activity?: PublishedPresenceActivity;
  deviceId: string;
  deviceLabel: PresenceDeviceLabel;
  sessionId: string;
  status: Exclude<PresenceStatus, "offline">;
  timestamp: string;
  userId: string;
  version: 1;
}

export interface AdminPresencePayload {
  deviceId: string;
  deviceLabel: PresenceDeviceLabel;
  sessionId: string;
  status: Exclude<PresenceStatus, "offline">;
  timestamp: string;
  userId: string;
  version: 1;
}

export interface PeopleDirectoryEntry {
  avatarPath: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  lastSeenAt: string | null;
  userId: string;
}

export interface PresenceSession {
  activity?: PublishedPresenceActivity;
  deviceId: string;
  deviceLabel: PresenceDeviceLabel;
  sessionId: string;
  status: Exclude<PresenceStatus, "offline">;
  timestamp: string;
  userId: string;
}

export interface PresenceDevice {
  activity?: PublishedPresenceActivity;
  deviceId: string;
  label: PresenceDeviceLabel;
  sessions: PresenceSession[];
  status: Exclude<PresenceStatus, "offline">;
}

export interface PersonPresence extends PeopleDirectoryEntry {
  devices: PresenceDevice[];
  status: PresenceStatus;
}

export type PresenceConnectionState =
  "connecting" | "connected" | "reconnecting" | "disconnected";

export interface PresenceBootstrap {
  directory: PeopleDirectoryEntry[];
  directoryAvailable: boolean;
  locale: AppLocale;
  preferences: PresencePreferences;
  preferencesAvailable: boolean;
}
