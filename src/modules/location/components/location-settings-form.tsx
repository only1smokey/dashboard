"use client";

import {
  Globe2,
  House,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/routing";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocationCombobox } from "@/modules/location/components/location-combobox";
import { updateLocationsAction } from "@/modules/location/server/actions";
import type { LocationChoice, LocationOption } from "@/modules/location/types";

type ViewingMode = "home" | "separate";

function sameLocation(
  first: LocationOption | null,
  second: LocationOption | null,
) {
  if (!first || !second) return first === second;
  return first.osmId === second.osmId && first.osmType === second.osmType;
}

function sameChoice(
  first: LocationChoice | null,
  second: LocationChoice | null,
) {
  if (!first || !second) return first === second;

  return (
    sameLocation(first.country, second.country) &&
    sameLocation(first.address, second.address)
  );
}

function LocationFields({
  address,
  country,
  disabled,
  idPrefix,
  invalid,
  onAddressChange,
  onCountryChange,
}: {
  address: LocationOption | null;
  country: LocationOption | null;
  disabled?: boolean;
  idPrefix: string;
  invalid?: boolean;
  onAddressChange: (location: LocationOption | null) => void;
  onCountryChange: (location: LocationOption | null) => void;
}) {
  const t = useTranslations("Location");

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <LocationCombobox
        id={`${idPrefix}-country`}
        type="country"
        step={1}
        label={t("countryLabel")}
        placeholder={t("countryPlaceholder")}
        value={country}
        invalid={invalid && !country}
        disabled={disabled}
        onChange={onCountryChange}
      />
      <LocationCombobox
        key={country?.countryCode ?? "no-country"}
        id={`${idPrefix}-address`}
        type="address"
        step={2}
        countryCode={country?.countryCode}
        label={t("addressLabel")}
        placeholder={t("addressPlaceholder")}
        value={address}
        disabled={disabled || !country}
        onChange={onAddressChange}
      />
    </div>
  );
}

function getAddressParts(choice: LocationChoice) {
  const address = choice.address;
  const town =
    address?.city ?? address?.locality ?? address?.district ?? address?.county;
  const street = [address?.street, address?.houseNumber]
    .filter(Boolean)
    .join(" ");
  const postalTown = [address?.postcode, town].filter(Boolean).join(" ");
  const fallbackAddress =
    address && !street && address.name !== town ? address.name : null;

  return {
    addressLine: street || fallbackAddress,
    country: choice.country.countryName,
    countryCode: choice.country.countryCode,
    postalTown,
  };
}

function LocationSummary({
  choice,
  editLabel,
  icon: Icon,
  onEdit,
  onRemove,
  removeLabel,
  title,
}: {
  choice: LocationChoice;
  editLabel: string;
  icon: LucideIcon;
  onEdit: () => void;
  onRemove: () => void;
  removeLabel: string;
  title: string;
}) {
  const t = useTranslations("Location");
  const parts = getAddressParts(choice);
  const hasAddressDetails = Boolean(parts.addressLine || parts.postalTown);

  return (
    <section className="bg-muted/25 min-w-0 rounded-lg border p-3 transition-colors duration-200">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <h3 className="truncate font-medium">{title}</h3>
        </div>
        <div className="-my-1 -mr-1 flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 sm:size-8"
            aria-label={editLabel}
            title={editLabel}
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-11 sm:size-8"
            aria-label={removeLabel}
            title={removeLabel}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      <address className="mt-2 min-w-0 space-y-0.5 pl-10 text-sm leading-5 not-italic sm:hidden">
        {parts.addressLine ? (
          <span className="block truncate font-medium">
            {parts.addressLine}
          </span>
        ) : null}
        {parts.postalTown ? (
          <span className="text-muted-foreground block truncate">
            {parts.postalTown}
          </span>
        ) : null}
        <span
          className={cn(
            "flex min-w-0 items-center gap-2",
            !hasAddressDetails && "font-medium",
          )}
        >
          <span className="min-w-0 truncate">{parts.country}</span>
          <Badge variant="outline" className="shrink-0">
            {parts.countryCode}
          </Badge>
        </span>
      </address>

      <dl
        className={cn(
          "mt-3 hidden min-w-0 gap-x-4 gap-y-2 border-t pt-3 sm:grid",
          hasAddressDetails
            ? "sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
            : "sm:grid-cols-1",
        )}
      >
        {parts.addressLine ? (
          <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">
              {t("addressSummaryLabel")}
            </dt>
            <dd className="truncate font-medium">{parts.addressLine}</dd>
          </div>
        ) : null}
        {parts.postalTown ? (
          <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">
              {t("postalTownLabel")}
            </dt>
            <dd className="truncate font-medium">{parts.postalTown}</dd>
          </div>
        ) : null}
        <div className="min-w-0">
          <dt className="text-muted-foreground text-xs">{t("countryLabel")}</dt>
          <dd className="flex min-w-0 items-center gap-2 font-medium">
            <span className="truncate">{parts.country}</span>
            <Badge variant="outline" className="shrink-0">
              {parts.countryCode}
            </Badge>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function LocationEditor({
  address,
  cancelLabel,
  country,
  disabled,
  icon: Icon,
  idPrefix,
  invalid,
  onAddressChange,
  onCancel,
  onCountryChange,
  title,
}: {
  address: LocationOption | null;
  cancelLabel: string;
  country: LocationOption | null;
  disabled?: boolean;
  icon: LucideIcon;
  idPrefix: string;
  invalid?: boolean;
  onAddressChange: (location: LocationOption | null) => void;
  onCancel: () => void;
  onCountryChange: (location: LocationOption | null) => void;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-lg border p-3">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <h3 className="truncate font-medium">{title}</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 sm:min-h-8"
          disabled={disabled}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      </div>
      <LocationFields
        idPrefix={idPrefix}
        country={country}
        address={address}
        invalid={invalid}
        disabled={disabled}
        onCountryChange={onCountryChange}
        onAddressChange={onAddressChange}
      />
    </section>
  );
}

function EmptyLocation({
  disabled,
  icon: Icon,
  onAdd,
  title,
}: {
  disabled?: boolean;
  icon: LucideIcon;
  onAdd: () => void;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full justify-start px-3 sm:h-10"
      disabled={disabled}
      onClick={onAdd}
    >
      <span className="bg-secondary text-secondary-foreground flex size-7 items-center justify-center rounded-md">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{title}</span>
      <Plus className="text-muted-foreground" aria-hidden="true" />
    </Button>
  );
}

export function LocationSettingsForm({
  initialHomeLocation,
  initialViewingLocation,
}: {
  initialHomeLocation: LocationChoice | null;
  initialViewingLocation: LocationChoice | null;
}) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const t = useTranslations("Location");
  const initialViewingMode: ViewingMode =
    !initialViewingLocation ||
    sameChoice(initialHomeLocation, initialViewingLocation)
      ? "home"
      : "separate";
  const [savedHome, setSavedHome] = useState(initialHomeLocation);
  const [savedViewing, setSavedViewing] = useState(
    initialViewingMode === "separate" ? initialViewingLocation : null,
  );
  const [savedViewingMode, setSavedViewingMode] =
    useState<ViewingMode>(initialViewingMode);
  const [homeCountry, setHomeCountry] = useState(
    initialHomeLocation?.country ?? null,
  );
  const [homeAddress, setHomeAddress] = useState(
    initialHomeLocation?.address ?? null,
  );
  const [viewingMode, setViewingMode] =
    useState<ViewingMode>(initialViewingMode);
  const [viewingCountry, setViewingCountry] = useState(
    initialViewingMode === "separate"
      ? (initialViewingLocation?.country ?? null)
      : null,
  );
  const [viewingAddress, setViewingAddress] = useState(
    initialViewingMode === "separate"
      ? (initialViewingLocation?.address ?? null)
      : null,
  );
  const [editingHome, setEditingHome] = useState(false);
  const [editingViewing, setEditingViewing] = useState(false);
  const [homeRemoved, setHomeRemoved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const homeChoice: LocationChoice | null = homeCountry
    ? { address: homeAddress, country: homeCountry }
    : null;
  const viewingChoice: LocationChoice | null = viewingCountry
    ? { address: viewingAddress, country: viewingCountry }
    : null;
  const currentSavedViewing = viewingMode === "separate" ? viewingChoice : null;
  const isDirty =
    !sameChoice(homeChoice, savedHome) ||
    viewingMode !== savedViewingMode ||
    !sameChoice(currentSavedViewing, savedViewing);
  const showViewingColumn = Boolean(homeChoice) || viewingMode === "separate";

  function changeHomeCountry(location: LocationOption | null) {
    setHomeCountry(location);
    setHomeAddress(null);
    setHomeRemoved(false);
  }

  function changeViewingCountry(location: LocationOption | null) {
    setViewingCountry(location);
    setViewingAddress(null);
  }

  function chooseSeparateViewing() {
    if (!viewingCountry && homeCountry) {
      setViewingCountry(homeCountry);
      setViewingAddress(null);
    }
    setViewingMode("separate");
    setEditingViewing(!viewingChoice);
  }

  function editHome() {
    setHomeRemoved(false);
    setEditingHome(true);
  }

  function cancelHomeEdit() {
    setHomeCountry(savedHome?.country ?? null);
    setHomeAddress(savedHome?.address ?? null);
    setHomeRemoved(false);
    setEditingHome(false);
    setSubmitted(false);
  }

  function removeHome() {
    setHomeCountry(null);
    setHomeAddress(null);
    setHomeRemoved(true);
    setEditingHome(false);
    setSubmitted(false);
  }

  function cancelViewingEdit() {
    setViewingMode(savedViewingMode);
    setViewingCountry(savedViewing?.country ?? null);
    setViewingAddress(savedViewing?.address ?? null);
    setEditingViewing(false);
    setSubmitted(false);
  }

  function removeViewing() {
    setViewingMode("home");
    setViewingCountry(null);
    setViewingAddress(null);
    setEditingViewing(false);
    setSubmitted(false);
  }

  function resetChanges() {
    setHomeCountry(savedHome?.country ?? null);
    setHomeAddress(savedHome?.address ?? null);
    setViewingMode(savedViewingMode);
    setViewingCountry(savedViewing?.country ?? null);
    setViewingAddress(savedViewing?.address ?? null);
    setHomeRemoved(false);
    setEditingHome(false);
    setEditingViewing(false);
    setSubmitted(false);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const homeSelectionIncomplete = editingHome && !homeChoice && !homeRemoved;
    const viewingSelectionIncomplete =
      viewingMode === "separate" && !viewingChoice;

    if (homeSelectionIncomplete || viewingSelectionIncomplete) {
      toast.error(t("invalidFields"));
      return;
    }

    setSaving(true);
    const result = await updateLocationsAction(
      {
        home: homeChoice,
        viewing: viewingMode === "separate" ? viewingChoice : null,
        viewingMode,
      },
      locale,
    );
    setSaving(false);

    if (result.status === "error") {
      toast.error(t(result.error));
      return;
    }

    const nextSavedViewing = viewingMode === "separate" ? viewingChoice : null;
    setSavedHome(homeChoice);
    setSavedViewing(nextSavedViewing);
    setSavedViewingMode(viewingMode);
    setHomeRemoved(false);
    setEditingHome(false);
    setEditingViewing(false);
    setSubmitted(false);
    toast.success(t("saveSuccess"));
    router.refresh();
  }

  return (
    <form className="min-w-0 space-y-3" onSubmit={save} noValidate>
      <div
        className={cn(
          "grid min-w-0 gap-3 lg:items-start",
          showViewingColumn ? "lg:grid-cols-2" : "lg:max-w-2xl",
        )}
      >
        <div className="min-w-0">
          {editingHome ? (
            <LocationEditor
              idPrefix="home"
              icon={House}
              title={t("homeTitle")}
              cancelLabel={t("cancelEdit")}
              country={homeCountry}
              address={homeAddress}
              invalid={submitted && !homeChoice}
              disabled={saving}
              onCancel={cancelHomeEdit}
              onCountryChange={changeHomeCountry}
              onAddressChange={setHomeAddress}
            />
          ) : homeChoice ? (
            <LocationSummary
              icon={House}
              title={t("homeTitle")}
              choice={homeChoice}
              editLabel={t("editHome")}
              removeLabel={t("removeHome")}
              onEdit={editHome}
              onRemove={removeHome}
            />
          ) : (
            <EmptyLocation
              icon={House}
              title={t("addHome")}
              disabled={saving}
              onAdd={editHome}
            />
          )}
        </div>

        {showViewingColumn ? (
          <div className="min-w-0 space-y-3">
            {homeChoice ? (
              <div className="bg-muted/25 flex min-h-12 min-w-0 flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pl-3">
                <span className="min-w-0 truncate text-sm font-medium">
                  {t("useHomeForViewing")}
                </span>
                <div
                  className="bg-muted grid shrink-0 grid-cols-2 rounded-md p-0.5"
                  role="group"
                  aria-label={t("viewingModeLabel")}
                >
                  <Button
                    type="button"
                    variant={viewingMode === "home" ? "secondary" : "ghost"}
                    className="min-h-11 px-3 text-xs sm:min-h-8"
                    aria-pressed={viewingMode === "home"}
                    disabled={saving}
                    onClick={() => {
                      setViewingMode("home");
                      setEditingViewing(false);
                    }}
                  >
                    {t("sameAsHome")}
                  </Button>
                  <Button
                    type="button"
                    variant={viewingMode === "separate" ? "secondary" : "ghost"}
                    className="min-h-11 px-3 text-xs sm:min-h-8"
                    aria-pressed={viewingMode === "separate"}
                    disabled={saving}
                    onClick={chooseSeparateViewing}
                  >
                    {t("separate")}
                  </Button>
                </div>
              </div>
            ) : null}

            {viewingMode === "separate" ? (
              editingViewing ? (
                <LocationEditor
                  idPrefix="viewing"
                  icon={Globe2}
                  title={t("viewingTitle")}
                  cancelLabel={t("cancelEdit")}
                  country={viewingCountry}
                  address={viewingAddress}
                  invalid={submitted && !viewingChoice}
                  disabled={saving}
                  onCancel={cancelViewingEdit}
                  onCountryChange={changeViewingCountry}
                  onAddressChange={setViewingAddress}
                />
              ) : viewingChoice ? (
                <LocationSummary
                  icon={Globe2}
                  title={t("viewingTitle")}
                  choice={viewingChoice}
                  editLabel={t("editViewing")}
                  removeLabel={t("removeViewing")}
                  onEdit={() => setEditingViewing(true)}
                  onRemove={removeViewing}
                />
              ) : (
                <EmptyLocation
                  icon={Globe2}
                  title={t("addViewing")}
                  disabled={saving}
                  onAdd={() => setEditingViewing(true)}
                />
              )
            ) : null}
          </div>
        ) : null}
      </div>

      {isDirty ? (
        <div className="animate-in fade-in slide-in-from-top-1 flex flex-col-reverse gap-2 border-t pt-3 duration-200 motion-reduce:animate-none sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 sm:min-h-9"
            disabled={saving}
            onClick={resetChanges}
          >
            {t("discardChanges")}
          </Button>
          <Button
            type="submit"
            className="min-h-11 sm:min-h-9"
            disabled={saving}
          >
            {saving ? (
              <Loader2
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
