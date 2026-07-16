"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppLocale } from "@/i18n/routing";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  confirmAvatarAction,
  removeAvatarAction,
  updateProfileAction,
} from "@/modules/profile/server/actions";
import { profileSchema, type ProfileValues } from "@/modules/profile/schemas";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const bucketLimit = 2 * 1024 * 1024;
const sourceLimit = 8 * 1024 * 1024;
const maxDimension = 512;

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function resizeImage(file: File) {
  if (file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");

  if (!context) throw new Error("canvas_unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      resolve,
      file.type,
      file.type === "image/png" ? undefined : 0.86,
    );
  });

  if (!blob) throw new Error("resize_failed");
  return blob;
}

export function ProfileForm({
  avatarPath,
  avatarUrl,
  displayName,
  email,
  preferredLocale,
  userId,
}: {
  avatarPath: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
  preferredLocale: AppLocale;
  userId: string;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Profile");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: displayName ?? "",
      preferredLocale,
    },
  });

  async function save(values: ProfileValues) {
    const result = await updateProfileAction(values, locale);
    if (result.status === "error") {
      toast.error(t(result.error));
      return;
    }
    toast.success(t("saveSuccess"));
    router.refresh();
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!allowedTypes.has(file.type) || file.size > sourceLimit) {
      toast.error(
        t(file.size > sourceLimit ? "fileTooLarge" : "invalidFileType"),
      );
      return;
    }

    setUploading(true);
    try {
      const resized = await resizeImage(file);
      if (resized.size > bucketLimit) {
        toast.error(t("fileTooLarge"));
        return;
      }

      const extension = extensions[file.type];
      const path = `${userId}/avatar.${extension}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, resized, {
          cacheControl: "300",
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;
      const result = await confirmAvatarAction(path, locale);
      if (result.status === "error") {
        if (path !== avatarPath) {
          await supabase.storage.from("avatars").remove([path]);
        }
        throw new Error(result.error);
      }

      toast.success(t("avatarSuccess"));
      router.refresh();
    } catch {
      toast.error(t("avatarFailed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setRemoving(true);
    const result = await removeAvatarAction(locale);
    setRemoving(false);
    if (result.status === "error") {
      toast.error(t("avatarFailed"));
      return;
    }
    toast.success(t("removeSuccess"));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="avatar-heading">
        <h2 id="avatar-heading" className="font-medium">
          {t("avatarTitle")}
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <MemberAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            className="size-20"
          />
          <div className="flex flex-wrap gap-2">
            <Input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <ImageUp aria-hidden="true" />
              )}
              {uploading
                ? t("uploading")
                : avatarPath
                  ? t("replaceAvatar")
                  : t("uploadAvatar")}
            </Button>
            {avatarPath ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={removing}
                  >
                    <Trash2 aria-hidden="true" />
                    {t("removeAvatar")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("removeTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("removeDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void remove()}>
                      {t("confirmRemove")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
      </section>

      <form
        className="space-y-5 border-t pt-6"
        onSubmit={form.handleSubmit(save)}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="profile-email">{t("emailLabel")}</Label>
          <Input
            id="profile-email"
            value={email ?? ""}
            readOnly
            aria-readonly="true"
            className="bg-muted/50 h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-name">{t("displayNameLabel")}</Label>
          <Input
            id="display-name"
            className="h-11"
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.displayName)}
            aria-describedby={
              form.formState.errors.displayName
                ? "display-name-error"
                : undefined
            }
            disabled={form.formState.isSubmitting}
            {...form.register("displayName")}
          />
          {form.formState.errors.displayName ? (
            <p id="display-name-error" className="text-destructive text-sm">
              {t("displayNameInvalid")}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferred-locale">{t("languageLabel")}</Label>
          <Controller
            control={form.control}
            name="preferredLocale"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={form.formState.isSubmitting}
              >
                <SelectTrigger
                  id="preferred-locale"
                  className="min-h-11 w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de" className="min-h-11">
                    {t("languageDe")}
                  </SelectItem>
                  <SelectItem value="en" className="min-h-11">
                    {t("languageEn")}
                  </SelectItem>
                  <SelectItem value="bg" className="min-h-11">
                    {t("languageBg")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <Button
          type="submit"
          className="min-h-11"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : null}
          {form.formState.isSubmitting ? t("saving") : t("save")}
        </Button>
      </form>
    </div>
  );
}
