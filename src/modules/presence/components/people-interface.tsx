"use client";

import { Loader2, UsersRound, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getCompactPeople } from "@/modules/presence/presence";
import { usePresence } from "@/modules/presence/components/presence-provider";
import type { PersonPresence, PresenceStatus } from "@/modules/presence/types";

const statusDotClasses = {
  online: "bg-emerald-500",
  away: "bg-amber-400",
  offline: "bg-muted-foreground/60",
} satisfies Record<PresenceStatus, string>;

function StatusDot({ status }: { status: PresenceStatus }) {
  const t = useTranslations("Presence");
  return (
    <span
      className={cn(
        "ring-background absolute right-0 bottom-0 size-3 rounded-full ring-2",
        statusDotClasses[status],
      )}
    >
      <span className="sr-only">{t(status)}</span>
    </span>
  );
}

function AvatarPreview({
  className,
  currentUserId,
  people,
}: {
  className?: string;
  currentUserId: string;
  people: PersonPresence[];
}) {
  const t = useTranslations("Presence");
  const preview = getCompactPeople(people, currentUserId);
  if (preview.total === 0) return null;

  const description = [
    ...preview.people.map(
      (person) => `${person.displayName ?? t("unnamed")}, ${t(person.status)}`,
    ),
    ...(preview.remaining > 0
      ? [t("morePeople", { count: preview.remaining })]
      : []),
  ].join("; ");

  return (
    <span className={cn("flex items-center", className)}>
      <span className="sr-only">{description}</span>
      <span className="flex -space-x-2" aria-hidden="true">
        {preview.people.map((person) => (
          <span className="relative" key={person.userId}>
            <MemberAvatar
              avatarUrl={person.avatarUrl}
              displayName={person.displayName}
              className="ring-background size-6 ring-2"
            />
            <StatusDot status={person.status} />
          </span>
        ))}
      </span>
      {preview.remaining > 0 ? (
        <span
          aria-hidden="true"
          className="bg-muted text-muted-foreground ml-1 text-[0.65rem] font-semibold tabular-nums"
        >
          +{preview.remaining}
        </span>
      ) : null}
    </span>
  );
}

export function DesktopPeopleTrigger({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const t = useTranslations("Presence");
  const { onlineCount, people, setPeoplePanelOpen } = usePresence();

  return (
    <SidebarMenuItem className="hidden md:block">
      <SidebarMenuButton
        type="button"
        className="h-9"
        tooltip={t("openPeople")}
        aria-label={t("openPeopleWithCount", { count: onlineCount })}
        onClick={() => setPeoplePanelOpen(true)}
      >
        <UsersRound aria-hidden="true" />
        <span>{t("people")}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
          <AvatarPreview people={people} currentUserId={currentUserId} />
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            {onlineCount}
          </span>
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function MobilePeopleTrigger({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const t = useTranslations("Presence");
  const { onlineCount, people, setPeoplePanelOpen } = usePresence();

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-11 min-w-11 gap-1.5 px-2.5 md:hidden"
      aria-label={t("openPeopleWithCount", { count: onlineCount })}
      onClick={() => setPeoplePanelOpen(true)}
    >
      <UsersRound className="size-4 min-[420px]:hidden" aria-hidden="true" />
      <AvatarPreview
        people={people}
        currentUserId={currentUserId}
        className="hidden min-[420px]:flex"
      />
      <span className="text-xs font-semibold tabular-nums">{onlineCount}</span>
    </Button>
  );
}

function PersonRow({
  currentUserId,
  person,
}: {
  currentUserId: string;
  person: PersonPresence;
}) {
  const t = useTranslations("Presence");
  const displayName = person.displayName ?? t("unnamed");

  return (
    <li className="flex min-h-14 min-w-0 items-center gap-3 px-3 py-2.5">
      <span className="relative shrink-0">
        <MemberAvatar
          avatarUrl={person.avatarUrl}
          displayName={person.displayName}
          className="size-9"
        />
        <StatusDot status={person.status} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {displayName}
      </span>
      {person.userId === currentUserId ? (
        <span className="text-muted-foreground shrink-0 text-xs">
          {t("you")}
        </span>
      ) : null}
    </li>
  );
}

function PeopleSection({
  currentUserId,
  people,
  status,
}: {
  currentUserId: string;
  people: PersonPresence[];
  status: PresenceStatus;
}) {
  const t = useTranslations("Presence");
  if (people.length === 0) return null;

  return (
    <section aria-labelledby={`people-${status}`} className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1">
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", statusDotClasses[status])}
        />
        <h3
          id={`people-${status}`}
          className="text-muted-foreground text-xs font-medium"
        >
          {t(status)}
        </h3>
        <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
          {people.length}
        </span>
      </div>
      <ul className="bg-card/50 divide-y overflow-hidden rounded-xl border">
        {people.map((person) => (
          <PersonRow
            key={person.userId}
            person={person}
            currentUserId={currentUserId}
          />
        ))}
      </ul>
    </section>
  );
}

export function PeoplePanel({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations("Presence");
  const isMobile = useIsMobile();
  const {
    connectionState,
    directoryAvailable,
    directoryLoading,
    isLoading,
    people,
    peoplePanelOpen,
    setPeoplePanelOpen,
  } = usePresence();
  const groupedPeople = (["online", "away", "offline"] as const)
    .map((status) => ({
      people: people.filter((person) => person.status === status),
      status,
    }))
    .filter((group) => group.people.length > 0);

  return (
    <Sheet open={peoplePanelOpen} onOpenChange={setPeoplePanelOpen}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        closeLabel={t("close")}
        className={cn(
          "gap-0 p-0",
          isMobile
            ? "max-h-[80svh] w-full rounded-t-2xl"
            : "w-full sm:max-w-[22rem]",
        )}
      >
        <SheetHeader className="relative border-b px-4 pt-2.5 pr-14 pb-3 md:px-4 md:py-3.5 md:pr-14">
          <span
            aria-hidden="true"
            className="bg-border mx-auto mb-1.5 h-1 w-9 rounded-full md:hidden"
          />
          <SheetTitle>{t("people")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("panelDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
          {connectionState !== "connected" ? (
            <div
              className="bg-muted/40 text-muted-foreground mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
              role="status"
            >
              {connectionState === "connecting" ||
              connectionState === "reconnecting" ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <WifiOff className="size-4" aria-hidden="true" />
              )}
              {t(connectionState)}
            </div>
          ) : null}

          {!directoryAvailable ? (
            <p
              className="text-muted-foreground mb-3 text-xs leading-4"
              role="status"
            >
              {t("directoryUnavailable")}
            </p>
          ) : null}

          {isLoading || directoryLoading ? (
            <div
              className="text-muted-foreground flex items-center gap-2 py-8 text-xs"
              role="status"
            >
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {t("loading")}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedPeople.map(({ people: statusPeople, status }) => (
                <PeopleSection
                  key={status}
                  status={status}
                  currentUserId={currentUserId}
                  people={statusPeople}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
