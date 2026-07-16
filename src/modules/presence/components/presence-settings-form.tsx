"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePresence } from "@/modules/presence/components/presence-provider";
import {
  presencePreferencesSchema,
  type PresencePreferencesValues,
} from "@/modules/presence/schemas";

const fields = [
  {
    name: "showOnline",
    label: "showOnlineLabel",
    description: "showOnlineDescription",
  },
] as const;

export function PresenceSettingsForm() {
  const t = useTranslations("Presence");
  const { preferences, preferencesAvailable, updatePreferences } =
    usePresence();
  const form = useForm<PresencePreferencesValues>({
    resolver: zodResolver(presencePreferencesSchema),
    defaultValues: preferences,
  });

  useEffect(() => {
    if (!form.formState.isDirty) form.reset(preferences);
  }, [form, form.formState.isDirty, preferences]);

  async function save(values: PresencePreferencesValues) {
    const result = await updatePreferences(values);
    if (result.status === "error") {
      toast.error(t(result.error));
      return;
    }

    form.reset(values);
    toast.success(t("saveSuccess"));
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(save)} noValidate>
      {!preferencesAvailable ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t("preferencesUnavailable")}
        </p>
      ) : null}

      <div className="divide-y rounded-lg border">
        {fields.map((field) => (
          <Controller
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: control }) => (
              <div className="flex min-h-16 items-start justify-between gap-4 p-3 sm:p-4">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor={`presence-${field.name}`}>
                    {t(field.label)}
                  </Label>
                  <p
                    id={`presence-${field.name}-description`}
                    className="text-muted-foreground text-sm leading-5"
                  >
                    {t(field.description)}
                  </p>
                </div>
                <Switch
                  id={`presence-${field.name}`}
                  className="mt-0.5"
                  checked={control.value}
                  disabled={form.formState.isSubmitting}
                  aria-describedby={`presence-${field.name}-description`}
                  onCheckedChange={control.onChange}
                />
              </div>
            )}
          />
        ))}
      </div>

      <Button
        type="submit"
        className="min-h-11"
        disabled={!form.formState.isDirty || form.formState.isSubmitting}
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
  );
}
