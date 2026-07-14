"use client";

import { KeyRound, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import {
  getPasskeyAvailability,
  mapPasskeyError,
  type PasskeyErrorKind,
} from "@/modules/auth/passkeys";
import {
  PASSKEY_FRIENDLY_NAME_MAX_LENGTH,
  passkeyFriendlyNameSchema,
  type PasskeySummary,
} from "@/modules/settings/passkeys";

const errorMessageKeys: Record<PasskeyErrorKind, string> = {
  cancelled: "cancellation",
  insecure: "secureConnectionRequired",
  unsupported: "unsupportedBrowser",
  disabled: "passkeysDisabled",
  credentialNotFound: "credentialNotFound",
  challengeExpired: "challengeExpired",
  verificationFailed: "verificationFailure",
  network: "networkFailure",
  tooMany: "tooManyPasskeys",
  alreadyRegistered: "alreadyRegistered",
  unknown: "operationFailure",
};

const subscribeToCapability = () => () => {};

export function PasskeyManager({
  initialError,
  initialPasskeys,
}: {
  initialError: PasskeyErrorKind | null;
  initialPasskeys: PasskeySummary[];
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Passkeys");
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [loadError, setLoadError] = useState(initialError);
  const availability = useSyncExternalStore(
    subscribeToCapability,
    getPasskeyAvailability,
    () => "available",
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [friendlyName, setFriendlyName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [passkeyToDelete, setPasskeyToDelete] = useState<PasskeySummary | null>(
    null,
  );

  function showError(error: unknown) {
    const kind = mapPasskeyError(error);
    const message = t(errorMessageKeys[kind]);

    if (kind === "cancelled") {
      toast.info(message);
    } else {
      toast.error(message);
    }

    return kind;
  }

  async function refreshPasskeys() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.passkey.list();

    if (error || !data) {
      setLoadError(showError(error));
      return false;
    }

    setPasskeys(data);
    setLoadError(null);
    return true;
  }

  async function registerPasskey() {
    if (isRegistering) {
      return;
    }

    const currentAvailability = getPasskeyAvailability();

    if (currentAvailability !== "available") {
      toast.error(
        t(
          currentAvailability === "insecure"
            ? "secureConnectionRequired"
            : "unsupportedBrowser",
        ),
      );
      return;
    }

    setIsRegistering(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.registerPasskey();

    if (error || !data) {
      showError(error);
      setIsRegistering(false);
      return;
    }

    const refreshed = await refreshPasskeys();

    if (!refreshed) {
      setPasskeys((current) => [
        {
          id: data.id,
          friendly_name: data.friendly_name,
          created_at: data.created_at,
        },
        ...current.filter((passkey) => passkey.id !== data.id),
      ]);
    }

    toast.success(t("registrationSuccess"));
    setIsRegistering(false);
  }

  function beginRename(passkey: PasskeySummary) {
    setEditingId(passkey.id);
    setFriendlyName(passkey.friendly_name ?? "");
    setNameError(false);
  }

  function cancelRename() {
    setEditingId(null);
    setFriendlyName("");
    setNameError(false);
  }

  async function renamePasskey(passkeyId: string) {
    if (pendingId) {
      return;
    }

    const parsed = passkeyFriendlyNameSchema.safeParse(friendlyName);

    if (!parsed.success) {
      setNameError(true);
      return;
    }

    setNameError(false);
    setPendingId(passkeyId);
    const supabase = createClient();
    const { data, error } = await supabase.auth.passkey.update({
      passkeyId,
      friendlyName: parsed.data,
    });

    if (error || !data) {
      showError(error);
      setPendingId(null);
      return;
    }

    setPasskeys((current) =>
      current.map((passkey) => (passkey.id === data.id ? data : passkey)),
    );
    cancelRename();
    setPendingId(null);
    toast.success(t("renameSuccess"));
  }

  async function deletePasskey() {
    if (!passkeyToDelete || pendingId) {
      return;
    }

    const passkeyId = passkeyToDelete.id;
    setPendingId(passkeyId);
    const supabase = createClient();
    const { error } = await supabase.auth.passkey.delete({ passkeyId });

    if (error) {
      showError(error);
      setPendingId(null);
      return;
    }

    setPasskeys((current) =>
      current.filter((passkey) => passkey.id !== passkeyId),
    );
    setPasskeyToDelete(null);
    setPendingId(null);
    toast.success(t("deletionSuccess"));
  }

  function formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? t("unknownDate")
      : dateFormatter.format(date);
  }

  return (
    <div className="space-y-5">
      <h3 className="font-medium">{t("title")}</h3>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm leading-6">
          {t("managementHint")}
        </p>
        <Button
          type="button"
          className="min-h-11 shrink-0"
          disabled={isRegistering || availability !== "available"}
          onClick={registerPasskey}
        >
          {isRegistering ? (
            <Loader2
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {isRegistering ? t("registering") : t("addPasskey")}
        </Button>
      </div>

      {availability !== "available" ? (
        <p
          className="bg-muted/60 text-muted-foreground rounded-lg border px-3 py-2.5 text-sm"
          role="status"
        >
          {t(
            availability === "insecure"
              ? "secureConnectionRequired"
              : "unsupportedBrowser",
          )}
        </p>
      ) : null}

      {loadError ? (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm" role="status">
            {t(errorMessageKeys[loadError])}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={refreshPasskeys}
          >
            {t("retry")}
          </Button>
        </div>
      ) : passkeys.length === 0 ? (
        <div className="bg-muted/40 rounded-lg border border-dashed p-5 text-center">
          <KeyRound
            className="text-muted-foreground mx-auto mb-2 size-5"
            aria-hidden="true"
          />
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {passkeys.map((passkey) => {
            const isEditing = editingId === passkey.id;
            const isPending = pendingId === passkey.id;

            return (
              <li key={passkey.id} className="min-w-0 rounded-xl border p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`passkey-name-${passkey.id}`}>
                        {t("friendlyName")}
                      </Label>
                      <Input
                        id={`passkey-name-${passkey.id}`}
                        value={friendlyName}
                        maxLength={PASSKEY_FRIENDLY_NAME_MAX_LENGTH}
                        className="h-11"
                        disabled={isPending}
                        aria-invalid={nameError}
                        aria-describedby={
                          nameError
                            ? `passkey-name-error-${passkey.id}`
                            : undefined
                        }
                        onChange={(event) =>
                          setFriendlyName(event.target.value)
                        }
                      />
                      {nameError ? (
                        <p
                          id={`passkey-name-error-${passkey.id}`}
                          className="text-destructive text-sm"
                        >
                          {t("friendlyNameInvalid", {
                            max: PASSKEY_FRIENDLY_NAME_MAX_LENGTH,
                          })}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="min-h-11"
                        disabled={isPending}
                        onClick={() => renamePasskey(passkey.id)}
                      >
                        {isPending ? (
                          <Loader2
                            className="animate-spin motion-reduce:animate-none"
                            aria-hidden="true"
                          />
                        ) : (
                          <Pencil aria-hidden="true" />
                        )}
                        {isPending ? t("saving") : t("saveRename")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        disabled={isPending}
                        onClick={cancelRename}
                      >
                        <X aria-hidden="true" />
                        {t("cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {passkey.friendly_name ?? t("unnamedPasskey")}
                      </p>
                      <dl className="text-muted-foreground mt-2 grid gap-x-5 gap-y-1 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="inline font-medium">
                            {t("createdDate")}:{" "}
                          </dt>
                          <dd className="inline">
                            {formatDate(passkey.created_at)}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-medium">
                            {t("lastUsedDate")}:{" "}
                          </dt>
                          <dd className="inline">
                            {passkey.last_used_at
                              ? formatDate(passkey.last_used_at)
                              : t("neverUsed")}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => beginRename(passkey)}
                      >
                        <Pencil aria-hidden="true" />
                        {t("rename")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive hover:text-destructive min-h-11"
                        onClick={() => setPasskeyToDelete(passkey)}
                      >
                        <Trash2 aria-hidden="true" />
                        {t("remove")}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={Boolean(passkeyToDelete)}
        onOpenChange={(open) => {
          if (!open && !pendingId) setPasskeyToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", {
                name: passkeyToDelete?.friendly_name ?? t("unnamedPasskey"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(pendingId)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(pendingId)}
              onClick={(event) => {
                event.preventDefault();
                void deletePasskey();
              }}
            >
              {pendingId ? (
                <Loader2
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {pendingId ? t("removing") : t("confirmRemove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
