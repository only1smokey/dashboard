"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_PRESENCE_TOPIC,
  DASHBOARD_PRESENCE_TOPIC,
  DIRECTORY_AVATAR_TTL_SECONDS,
  PRESENCE_AWAY_AFTER_MS,
  PRESENCE_CALL_WINDOW_MS,
  PRESENCE_DEVICE_STORAGE_KEY,
  PRESENCE_SESSION_STORAGE_KEY,
} from "@/modules/presence/constants";
import {
  buildAdminPresencePayload,
  detectDeviceLabel,
  filterNormalPresencePayload,
  getPresenceCallDelay,
  getPresenceChannelOptions,
  groupPeople,
  readAdminPresenceState,
  readNormalPresenceState,
} from "@/modules/presence/presence";
import type { PresencePreferencesActionResult } from "@/modules/presence/server/actions";
import { updatePresencePreferencesAction } from "@/modules/presence/server/actions";
import type {
  AdminPresencePayload,
  NormalPresencePayload,
  PeopleDirectoryEntry,
  PersonPresence,
  PresenceBootstrap,
  PresenceConnectionState,
  PresenceDeviceLabel,
  PresencePreferences,
  PresenceStatus,
} from "@/modules/presence/types";

interface PresenceIdentity {
  deviceId: string;
  deviceLabel: PresenceDeviceLabel;
  sessionId: string;
}

interface PresenceContextValue {
  awayCount: number;
  connectionState: PresenceConnectionState;
  currentStatus: Exclude<PresenceStatus, "offline">;
  directoryAvailable: boolean;
  directoryLoading: boolean;
  isLoading: boolean;
  offlineCount: number;
  onlineCount: number;
  people: PersonPresence[];
  peoplePanelOpen: boolean;
  preferences: PresencePreferences;
  preferencesAvailable: boolean;
  refreshDirectory: () => Promise<boolean>;
  refreshPresencePreferences: () => Promise<boolean>;
  setPeoplePanelOpen: (open: boolean) => void;
  updatePreferences: (
    preferences: PresencePreferences,
  ) => Promise<PresencePreferencesActionResult>;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateUuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-");
}

function getStoredId(storage: Storage, key: string) {
  try {
    const existing = storage.getItem(key);
    if (existing && uuidPattern.test(existing)) return existing;
    const created = generateUuid();
    storage.setItem(key, created);
    return created;
  } catch {
    return generateUuid();
  }
}

export function PresenceProvider({
  bootstrap,
  children,
  currentUserId,
  isAdmin,
}: {
  bootstrap: PresenceBootstrap;
  children: ReactNode;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [supabase] = useState(createClient);
  const [directory, setDirectory] = useState(bootstrap.directory);
  const [directoryAvailable, setDirectoryAvailable] = useState(
    bootstrap.directoryAvailable,
  );
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [preferences, setPreferences] = useState(bootstrap.preferences);
  const [preferencesAvailable, setPreferencesAvailable] = useState(
    bootstrap.preferencesAvailable,
  );
  const [normalSessions, setNormalSessions] = useState<NormalPresencePayload[]>(
    [],
  );
  const [adminSessions, setAdminSessions] = useState<AdminPresencePayload[]>(
    [],
  );
  const [connectionState, setConnectionState] =
    useState<PresenceConnectionState>("connecting");
  const [isLoading, setIsLoading] = useState(true);
  const [currentStatus, setCurrentStatus] =
    useState<Exclude<PresenceStatus, "offline">>("online");
  const [peoplePanelOpen, setPeoplePanelOpenState] = useState(false);

  const preferencesRef = useRef(preferences);
  const statusRef = useRef(currentStatus);
  const identityRef = useRef<PresenceIdentity | null>(null);
  const normalChannelRef = useRef<RealtimeChannel | null>(null);
  const adminChannelRef = useRef<RealtimeChannel | null>(null);
  const normalSubscribedRef = useRef(false);
  const adminSubscribedRef = useRef(false);
  const normalTrackedRef = useRef(false);
  const adminTrackedRef = useRef(false);
  const presenceCallTimestampsRef = useRef<number[]>([]);
  const presenceCallQueueRef = useRef<Promise<void>>(Promise.resolve());

  const runRateLimitedPresenceCall = useCallback(
    (operation: () => Promise<void>) => {
      async function execute() {
        while (true) {
          const now = Date.now();
          presenceCallTimestampsRef.current =
            presenceCallTimestampsRef.current.filter(
              (timestamp) => timestamp > now - PRESENCE_CALL_WINDOW_MS,
            );
          const delay = getPresenceCallDelay(
            presenceCallTimestampsRef.current,
            now,
          );
          if (delay === 0) {
            presenceCallTimestampsRef.current.push(now);
            break;
          }
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }

        await operation();
      }

      const queuedCall = presenceCallQueueRef.current.then(execute, execute);
      presenceCallQueueRef.current = queuedCall.catch(() => undefined);
      return queuedCall;
    },
    [],
  );

  const publishNormalPresence = useCallback(async () => {
    if (
      !normalChannelRef.current ||
      !identityRef.current ||
      !normalSubscribedRef.current
    ) {
      return;
    }

    await runRateLimitedPresenceCall(async () => {
      const channel = normalChannelRef.current;
      const identity = identityRef.current;
      if (!channel || !identity || !normalSubscribedRef.current) return;

      const payload = filterNormalPresencePayload({
        activity: null,
        deviceId: identity.deviceId,
        deviceLabel: identity.deviceLabel,
        preferences: preferencesRef.current,
        sessionId: identity.sessionId,
        status: statusRef.current,
        timestamp: new Date().toISOString(),
        userId: currentUserId,
      });

      if (!payload) {
        if (normalTrackedRef.current) {
          await channel.untrack();
          normalTrackedRef.current = false;
        }
        return;
      }

      const result = await channel.track(payload);
      normalTrackedRef.current = result === "ok";
    });
  }, [currentUserId, runRateLimitedPresenceCall]);

  const publishAdminPresence = useCallback(async () => {
    if (
      !adminChannelRef.current ||
      !identityRef.current ||
      !adminSubscribedRef.current
    ) {
      return;
    }

    await runRateLimitedPresenceCall(async () => {
      const channel = adminChannelRef.current;
      const identity = identityRef.current;
      if (!channel || !identity || !adminSubscribedRef.current) return;

      const payload = buildAdminPresencePayload({
        deviceId: identity.deviceId,
        deviceLabel: identity.deviceLabel,
        sessionId: identity.sessionId,
        status: statusRef.current,
        timestamp: new Date().toISOString(),
        userId: currentUserId,
      });
      const result = await channel.track(payload);
      adminTrackedRef.current = result === "ok";
    });
  }, [currentUserId, runRateLimitedPresenceCall]);

  const refreshDirectory = useCallback(
    async (showLoading = true) => {
      if (showLoading) setDirectoryLoading(true);
      const { data, error } = await supabase.rpc("get_people_directory");
      if (error || !data) {
        setDirectoryAvailable(false);
        if (showLoading) setDirectoryLoading(false);
        return false;
      }

      const refreshed = await Promise.all(
        data.map(async (person): Promise<PeopleDirectoryEntry> => {
          let avatarUrl: string | null = null;
          if (person.avatar_path) {
            const { data: signedAvatar } = await supabase.storage
              .from("avatars")
              .createSignedUrl(
                person.avatar_path,
                DIRECTORY_AVATAR_TTL_SECONDS,
              );
            avatarUrl = signedAvatar?.signedUrl ?? null;
          }
          return {
            avatarPath: person.avatar_path,
            avatarUrl,
            displayName: person.display_name,
            lastSeenAt: person.last_seen_at,
            userId: person.user_id,
          };
        }),
      );

      setDirectory(refreshed);
      setDirectoryAvailable(true);
      if (showLoading) setDirectoryLoading(false);
      return true;
    },
    [supabase],
  );

  useEffect(() => {
    preferencesRef.current = preferences;
    void publishNormalPresence();
  }, [preferences, publishNormalPresence]);

  useEffect(() => {
    let cancelled = false;
    let awayTimer: ReturnType<typeof setTimeout> | null = null;
    let normalChannel: RealtimeChannel | null = null;
    let adminChannel: RealtimeChannel | null = null;

    const deviceId = getStoredId(
      window.localStorage,
      PRESENCE_DEVICE_STORAGE_KEY,
    );
    const sessionId = getStoredId(
      window.sessionStorage,
      PRESENCE_SESSION_STORAGE_KEY,
    );
    identityRef.current = {
      deviceId,
      deviceLabel: detectDeviceLabel({
        maxTouchPoints: navigator.maxTouchPoints,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      }),
      sessionId,
    };

    function scheduleAway() {
      if (awayTimer) clearTimeout(awayTimer);
      awayTimer = setTimeout(() => {
        if (cancelled || statusRef.current === "away") return;
        statusRef.current = "away";
        setCurrentStatus("away");
        void publishNormalPresence();
        void publishAdminPresence();
      }, PRESENCE_AWAY_AFTER_MS);
    }

    function markActive() {
      if (statusRef.current === "away") {
        statusRef.current = "online";
        setCurrentStatus("online");
        void publishNormalPresence();
        void publishAdminPresence();
      }
      scheduleAway();
    }

    function handleVisibilityChange() {
      markActive();
    }

    window.addEventListener("pointerdown", markActive, { passive: true });
    window.addEventListener("keydown", markActive);
    window.addEventListener("touchstart", markActive, { passive: true });
    window.addEventListener("focus", markActive);
    window.addEventListener("pageshow", markActive);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleAway();

    const authSubscription = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.access_token) {
          void supabase.realtime.setAuth(session.access_token);
          return;
        }

        normalSubscribedRef.current = false;
        adminSubscribedRef.current = false;
        setConnectionState("disconnected");
      },
    );

    async function connect() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session?.access_token) {
        setConnectionState("disconnected");
        setIsLoading(false);
        return;
      }

      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;

      normalChannel = supabase
        .channel(
          DASHBOARD_PRESENCE_TOPIC,
          getPresenceChannelOptions(sessionId, true),
        )
        .on("presence", { event: "sync" }, () => {
          if (!normalChannel) return;
          setNormalSessions(
            readNormalPresenceState(normalChannel.presenceState()),
          );
          setIsLoading(false);
        })
        .on("presence", { event: "join" }, () => {
          if (!normalChannel) return;
          setNormalSessions(
            readNormalPresenceState(normalChannel.presenceState()),
          );
        })
        .on("presence", { event: "leave" }, () => {
          if (!normalChannel) return;
          setNormalSessions(
            readNormalPresenceState(normalChannel.presenceState()),
          );
          void refreshDirectory(false);
        });
      normalChannelRef.current = normalChannel;

      adminChannel = supabase.channel(
        ADMIN_PRESENCE_TOPIC,
        getPresenceChannelOptions(sessionId, isAdmin),
      );
      if (isAdmin) {
        adminChannel
          .on("presence", { event: "sync" }, () => {
            if (!adminChannel) return;
            setAdminSessions(
              readAdminPresenceState(adminChannel.presenceState()),
            );
          })
          .on("presence", { event: "join" }, () => {
            if (!adminChannel) return;
            setAdminSessions(
              readAdminPresenceState(adminChannel.presenceState()),
            );
          })
          .on("presence", { event: "leave" }, () => {
            if (!adminChannel) return;
            setAdminSessions(
              readAdminPresenceState(adminChannel.presenceState()),
            );
          });
      }
      adminChannelRef.current = adminChannel;

      normalChannel.subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          normalSubscribedRef.current = true;
          setConnectionState(
            isAdmin && !adminSubscribedRef.current ? "connecting" : "connected",
          );
          void publishNormalPresence();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          normalSubscribedRef.current = false;
          normalTrackedRef.current = false;
          setIsLoading(false);
          setConnectionState((current) =>
            current === "connected" ? "reconnecting" : "disconnected",
          );
        }
      });

      adminChannel.subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          adminSubscribedRef.current = true;
          if (normalSubscribedRef.current) setConnectionState("connected");
          void publishAdminPresence();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          adminSubscribedRef.current = false;
          adminTrackedRef.current = false;
          if (isAdmin) setConnectionState("reconnecting");
        }
      });
    }

    void connect();

    return () => {
      cancelled = true;
      if (awayTimer) clearTimeout(awayTimer);
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("touchstart", markActive);
      window.removeEventListener("focus", markActive);
      window.removeEventListener("pageshow", markActive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      authSubscription.data.subscription.unsubscribe();
      normalSubscribedRef.current = false;
      adminSubscribedRef.current = false;
      normalTrackedRef.current = false;
      adminTrackedRef.current = false;
      normalChannelRef.current = null;
      adminChannelRef.current = null;
      identityRef.current = null;
      if (normalChannel) {
        void supabase.removeChannel(normalChannel);
      }
      if (adminChannel) {
        void supabase.removeChannel(adminChannel);
      }
    };
  }, [
    isAdmin,
    publishAdminPresence,
    publishNormalPresence,
    refreshDirectory,
    supabase,
  ]);

  const refreshPresencePreferences = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_presence")
      .select(
        "show_online, show_current_section, show_detailed_activity, show_media_titles",
      )
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error || !data) {
      setPreferencesAvailable(false);
      return false;
    }

    setPreferences({
      showCurrentSection: data.show_current_section,
      showDetailedActivity: data.show_detailed_activity,
      showMediaTitles: data.show_media_titles,
      showOnline: data.show_online,
    });
    setPreferencesAvailable(true);
    return true;
  }, [currentUserId, supabase]);

  const updatePreferences = useCallback(
    async (nextPreferences: PresencePreferences) => {
      const result = await updatePresencePreferencesAction(
        nextPreferences,
        bootstrap.locale,
      );
      if (result.status === "success") {
        preferencesRef.current = nextPreferences;
        setPreferences(nextPreferences);
        setPreferencesAvailable(true);
      }
      return result;
    },
    [bootstrap.locale],
  );

  const setPeoplePanelOpen = useCallback(
    (open: boolean) => {
      setPeoplePanelOpenState(open);
      if (open) {
        void refreshDirectory();
      }
    },
    [refreshDirectory],
  );

  const people = useMemo(
    () =>
      groupPeople({
        adminSessions,
        directory,
        isAdmin,
        normalSessions,
      }),
    [adminSessions, directory, isAdmin, normalSessions],
  );
  const onlineCount = people.filter(
    (person) => person.status === "online",
  ).length;
  const awayCount = people.filter((person) => person.status === "away").length;
  const offlineCount = people.filter(
    (person) => person.status === "offline",
  ).length;

  const value = useMemo<PresenceContextValue>(
    () => ({
      awayCount,
      connectionState,
      currentStatus,
      directoryAvailable,
      directoryLoading,
      isLoading,
      offlineCount,
      onlineCount,
      people,
      peoplePanelOpen,
      preferences,
      preferencesAvailable,
      refreshDirectory,
      refreshPresencePreferences,
      setPeoplePanelOpen,
      updatePreferences,
    }),
    [
      awayCount,
      connectionState,
      currentStatus,
      directoryAvailable,
      directoryLoading,
      isLoading,
      offlineCount,
      onlineCount,
      people,
      peoplePanelOpen,
      preferences,
      preferencesAvailable,
      refreshDirectory,
      refreshPresencePreferences,
      setPeoplePanelOpen,
      updatePreferences,
    ],
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresence must be used within PresenceProvider.");
  }
  return context;
}
