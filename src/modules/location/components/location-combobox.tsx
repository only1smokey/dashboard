"use client";

import { Loader2, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  deduplicateLocationOptions,
  getLocationOptionKey,
} from "@/modules/location/options";
import type { LocationOption } from "@/modules/location/types";

export function LocationCombobox({
  countryCode,
  disabled,
  id,
  invalid,
  label,
  onChange,
  placeholder,
  step,
  type,
  value,
}: {
  countryCode?: string;
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  label: string;
  onChange: (location: LocationOption | null) => void;
  placeholder: string;
  step?: 1 | 2;
  type: "address" | "country";
  value: LocationOption | null;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Location");
  const [query, setQuery] = useState(value?.formattedAddress ?? "");
  const [results, setResults] = useState<LocationOption[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const errorId = `${id}-error`;
  const listboxId = `${id}-results`;
  const normalizedQuery = query.trim();
  const selectedInputValue = value?.formattedAddress ?? null;
  const minimumLength = type === "country" ? 2 : 3;

  useEffect(() => {
    if (
      disabled ||
      normalizedQuery.length < minimumLength ||
      (selectedInputValue !== null && normalizedQuery === selectedInputValue)
    ) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchFailed(false);
      try {
        const searchParams = new URLSearchParams({
          language: locale,
          q: normalizedQuery,
          type,
        });
        if (countryCode) searchParams.set("country", countryCode);

        const response = await fetch(`/api/locations?${searchParams}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("location_search_failed");

        const body = (await response.json()) as { results?: LocationOption[] };
        if (!Array.isArray(body.results)) {
          throw new Error("location_search_invalid");
        }

        const uniqueResults = deduplicateLocationOptions(body.results);
        setResults(uniqueResults);
        setActiveIndex(uniqueResults.length > 0 ? 0 : -1);
        setSearched(true);
        setOpen(true);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearched(true);
        setSearchFailed(true);
        setOpen(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    countryCode,
    disabled,
    locale,
    minimumLength,
    normalizedQuery,
    selectedInputValue,
    type,
  ]);

  function resetSearch() {
    setResults([]);
    setOpen(false);
    setSearched(false);
    setSearchFailed(false);
    setLoading(false);
  }

  function selectLocation(location: LocationOption) {
    onChange(location);
    setQuery(location.formattedAddress);
    resetSearch();
  }

  function clearLocation() {
    onChange(null);
    setQuery("");
    resetSearch();
  }

  return (
    <div
      className="min-w-0 space-y-1.5"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="flex items-center gap-2">
        {step ? (
          <span className="bg-secondary text-secondary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold">
            {step}
          </span>
        ) : null}
        <Label htmlFor={id}>{label}</Label>
      </div>
      <div className="relative min-w-0">
        <Input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={
            open && activeIndex >= 0 && results[activeIndex]
              ? `${listboxId}-${getLocationOptionKey(results[activeIndex])}`
              : undefined
          }
          aria-describedby={invalid ? errorId : undefined}
          aria-invalid={invalid}
          autoComplete="off"
          className={cn("h-11 min-w-0 pr-10 sm:h-9", value && "pr-20")}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetSearch();
            onChange(null);
          }}
          onFocus={() => {
            if (searched) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && results.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => (index + 1) % results.length);
            } else if (event.key === "ArrowUp" && results.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex(
                (index) => (index - 1 + results.length) % results.length,
              );
            } else if (
              event.key === "Enter" &&
              open &&
              activeIndex >= 0 &&
              results[activeIndex]
            ) {
              event.preventDefault();
              selectLocation(results[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <span
          className={cn(
            "text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2",
            value ? "right-12" : "right-3",
          )}
        >
          {loading ? (
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Search className="size-4" aria-hidden="true" />
          )}
        </span>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 size-11 rounded-l-none"
            aria-label={t("clearSelection")}
            disabled={disabled}
            onClick={clearLocation}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
        {open ? (
          <div
            id={listboxId}
            role={searchFailed || results.length === 0 ? "status" : "listbox"}
            className="bg-popover text-popover-foreground absolute z-30 mt-1 max-h-60 w-full min-w-0 overflow-y-auto rounded-md border p-1 shadow-md sm:max-h-72"
          >
            {searchFailed ? (
              <p className="text-destructive px-3 py-3 text-sm">
                {t("searchFailed")}
              </p>
            ) : results.length === 0 ? (
              <p className="text-muted-foreground px-3 py-3 text-sm">
                {t("noResults")}
              </p>
            ) : (
              results.map((location, index) => {
                const details =
                  location.formattedAddress !== location.name
                    ? location.formattedAddress
                    : null;

                return (
                  <button
                    id={`${listboxId}-${getLocationOptionKey(location)}`}
                    key={getLocationOptionKey(location)}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      "hover:bg-accent hover:text-accent-foreground flex min-h-11 w-full items-start justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors",
                      index === activeIndex &&
                        "bg-accent text-accent-foreground",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectLocation(location)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {location.name}
                      </span>
                      {details ? (
                        <span className="text-muted-foreground line-clamp-2 block text-xs leading-4 whitespace-normal">
                          {details}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground mt-0.5 shrink-0 text-xs font-medium">
                      {location.countryCode}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      {invalid ? (
        <p id={errorId} className="text-destructive text-sm">
          {t("selectionRequired")}
        </p>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {loading ? t("searching") : ""}
      </span>
    </div>
  );
}
