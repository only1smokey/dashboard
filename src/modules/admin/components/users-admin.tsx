"use client";

import {
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Shield,
  UserRound,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppLocale } from "@/i18n/routing";
import { useRouter } from "@/i18n/navigation";
import type { AdminUser } from "@/modules/admin/server/users";
import {
  updateUserRoleAction,
  updateUserStatusAction,
} from "@/modules/admin/server/actions";

type PendingChange =
  | { kind: "role"; user: AdminUser; role: "user" | "admin" }
  | { kind: "status"; user: AdminUser; isActive: boolean };

function UserBadges({ user }: { user: AdminUser }) {
  const t = useTranslations("AdminUsers");
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
        {user.role === "admin" ? (
          <Shield data-icon="inline-start" aria-hidden="true" />
        ) : (
          <UserRound data-icon="inline-start" aria-hidden="true" />
        )}
        {t(user.role === "admin" ? "roleAdmin" : "roleUser")}
      </Badge>
      <Badge variant={user.isActive ? "outline" : "destructive"}>
        {user.isActive ? (
          <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
        ) : (
          <XCircle data-icon="inline-start" aria-hidden="true" />
        )}
        {t(user.isActive ? "active" : "inactive")}
      </Badge>
    </div>
  );
}

export function UsersAdmin({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("AdminUsers");
  const router = useRouter();
  const [change, setChange] = useState<PendingChange | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  async function confirmChange() {
    if (!change) return;
    setSubmitting(true);
    const result =
      change.kind === "role"
        ? await updateUserRoleAction(
            { targetUserId: change.user.id, role: change.role },
            locale,
          )
        : await updateUserStatusAction(
            { targetUserId: change.user.id, isActive: change.isActive },
            locale,
          );
    setSubmitting(false);

    if (result.status === "error") {
      toast.error(t(result.error));
      return;
    }

    toast.success(t(change.kind === "role" ? "roleUpdated" : "statusUpdated"));
    setChange(null);
    router.refresh();
  }

  function Actions({ user }: { user: AdminUser }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 md:size-9"
            aria-label={t("actionsFor", {
              name: user.displayName ?? t("unnamed"),
            })}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem
            className="min-h-11"
            disabled={user.role === "admin"}
            onSelect={() => setChange({ kind: "role", user, role: "admin" })}
          >
            <Shield aria-hidden="true" />
            {t("makeAdmin")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11"
            disabled={user.role === "user"}
            onSelect={() => setChange({ kind: "role", user, role: "user" })}
          >
            <UserRound aria-hidden="true" />
            {t("makeUser")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11"
            variant={user.isActive ? "destructive" : "default"}
            disabled={user.id === currentUserId && user.isActive}
            onSelect={() =>
              setChange({ kind: "status", user, isActive: !user.isActive })
            }
          >
            {user.isActive ? (
              <XCircle aria-hidden="true" />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            {t(user.isActive ? "deactivate" : "activate")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <UserRound
            className="text-muted-foreground mx-auto size-8"
            aria-hidden="true"
          />
          <h2 className="mt-3 font-medium">{t("emptyTitle")}</h2>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("user")}</TableHead>
              <TableHead>{t("language")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("created")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      avatarUrl={user.avatarUrl}
                      displayName={user.displayName}
                    />
                    <div>
                      <div className="font-medium">
                        {user.displayName ?? t("unnamed")}
                        {user.id === currentUserId ? (
                          <span className="text-muted-foreground ml-1 font-normal">
                            {t("you")}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground max-w-52 truncate text-xs">
                        {user.id}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {t(`locale${user.preferredLocale.toUpperCase()}`)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                  >
                    {t(user.role === "admin" ? "roleAdmin" : "roleUser")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "outline" : "destructive"}>
                    {t(user.isActive ? "active" : "inactive")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {dateFormatter.format(new Date(user.createdAt))}
                </TableCell>
                <TableCell className="text-right">
                  <Actions user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MemberAvatar
                  avatarUrl={user.avatarUrl}
                  displayName={user.displayName}
                  className="size-11"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {user.displayName ?? t("unnamed")}
                    {user.id === currentUserId ? (
                      <span className="text-muted-foreground ml-1 font-normal">
                        {t("you")}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {user.id}
                  </div>
                </div>
                <Actions user={user} />
              </div>
              <UserBadges user={user} />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t("language")}</dt>
                  <dd className="mt-1">
                    {t(`locale${user.preferredLocale.toUpperCase()}`)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("created")}</dt>
                  <dd className="mt-1">
                    {dateFormatter.format(new Date(user.createdAt))}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={change !== null}
        onOpenChange={(open) => {
          if (!open && !submitting) setChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {change?.kind === "status"
                ? t("confirmStatusTitle")
                : t("confirmRoleTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {change
                ? t(
                    change.kind === "status"
                      ? "confirmStatusDescription"
                      : "confirmRoleDescription",
                    {
                      name: change.user.displayName ?? t("unnamed"),
                      value:
                        change.kind === "status"
                          ? t(change.isActive ? "active" : "inactive")
                          : t(
                              change.role === "admin"
                                ? "roleAdmin"
                                : "roleUser",
                            ),
                    },
                  )
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void confirmChange();
              }}
            >
              {submitting ? (
                <Loader2
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : null}
              {submitting ? t("updating") : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
