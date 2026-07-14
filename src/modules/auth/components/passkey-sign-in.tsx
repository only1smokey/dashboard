"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { FormMessage } from "@/modules/auth/components/form-message";
import {
  getPasskeyAvailability,
  mapPasskeyError,
  type PasskeyErrorKind,
} from "@/modules/auth/passkeys";
import { completePasskeySignInAction } from "@/modules/auth/server/actions";

const errorMessageKeys: Record<PasskeyErrorKind, string> = {
  cancelled: "passkeyCancelled",
  insecure: "passkeyInsecure",
  unsupported: "passkeyUnsupported",
  disabled: "passkeyDisabled",
  credentialNotFound: "passkeyNotFound",
  challengeExpired: "passkeyExpired",
  verificationFailed: "passkeyVerificationFailed",
  network: "passkeyNetworkFailed",
  tooMany: "passkeyAuthenticationFailed",
  alreadyRegistered: "passkeyAuthenticationFailed",
  unknown: "passkeyAuthenticationFailed",
};

const subscribeToCapability = () => () => {};

export function PasskeySignIn({ nextPath }: { nextPath?: string }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Auth");
  const [isPending, setIsPending] = useState(false);
  const availability = useSyncExternalStore(
    subscribeToCapability,
    getPasskeyAvailability,
    () => "available",
  );
  const [errorKind, setErrorKind] = useState<PasskeyErrorKind | null>(null);

  async function signIn() {
    if (isPending) {
      return;
    }

    const currentAvailability = getPasskeyAvailability();

    if (currentAvailability !== "available") {
      setErrorKind(currentAvailability);
      return;
    }

    setErrorKind(null);
    setIsPending(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPasskey();

    if (error || !data.session || !data.user) {
      setErrorKind(mapPasskeyError(error));
      setIsPending(false);
      return;
    }

    const result = await completePasskeySignInAction({ locale, nextPath });

    if (result.status === "error") {
      setErrorKind("unknown");
      setIsPending(false);
      return;
    }

    if (result.redirectTo) {
      window.location.replace(result.redirectTo);
    }
  }

  return (
    <div className="space-y-4">
      {errorKind ? (
        <FormMessage variant={errorKind === "cancelled" ? "info" : "error"}>
          {t(errorMessageKeys[errorKind])}
        </FormMessage>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full"
        disabled={isPending || availability !== "available"}
        onClick={signIn}
      >
        {isPending ? (
          <Loader2
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <KeyRound aria-hidden="true" />
        )}
        {isPending ? t("passkeySigningIn") : t("passkeySignIn")}
      </Button>
      {availability !== "available" && !errorKind ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t(
            availability === "insecure"
              ? "passkeyInsecure"
              : "passkeyUnsupported",
          )}
        </p>
      ) : null}
    </div>
  );
}
