import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Video,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  Languages,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Info,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TranslateLayout } from "@/components/layout/translate-layout";
import {
  catDateTimeToUtcIso,
  formatCat,
  getBookedSlots,
} from "@/lib/interpreter/booking-availability";
import type { InterpreterBookingType } from "@/lib/types/database";

export const Route = createFileRoute("/translate/book")({
  validateSearch: (s: Record<string, unknown>) => ({
    type: s.type === "onsite" || s.type === "remote" ? s.type : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Schedule an Interpreter — San Brothers" },
      {
        name: "description",
        content:
          "Book a remote or on-site interpreter in Kigali. Choose a date, time and language pair.",
      },
    ],
    links: [{ rel: "canonical", href: "/translate/book" }],
  }),
  component: BookPage,
});

interface SupportedLanguage {
  id: string;
  code: string;
  name_en: string;
  name_native: string | null;
  flag_emoji: string | null;
}

const REMOTE_DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
];
const ONSITE_DURATIONS = [
  { label: "1 hr", value: 60 },
  { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
  { label: "4 hr", value: 240 },
  { label: "Full Day (8 hr)", value: 480 },
];

const LOCATION_TYPES = [
  "Bank / Financial Institution",
  "Hospital / Medical Facility",
  "Government Office / Immigration",
  "Court / Legal Proceedings",
  "Shopping / Retail",
  "Business Meeting",
  "Other",
];

function generateSlots(startH: number, endH: number): string[] {
  const out: string[] = [];
  for (let h = startH; h <= endH; h++) {
    for (const m of [0, 30]) {
      if (h === endH && m > 0) break;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}
const REMOTE_SLOTS = generateSlots(8, 17).concat(["17:30"]);
const ONSITE_START_SLOTS = generateSlots(7, 19);

function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function BookPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { type: initialType } = Route.useSearch();

  const [bookingType, setBookingType] = useState<InterpreterBookingType | null>(
    initialType ?? null,
  );
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [clientRate, setClientRate] = useState<number>(1);
  const [langFrom, setLangFrom] = useState("");
  const [langTo, setLangTo] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("");
  const [duration, setDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [locationType, setLocationType] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | {
    when: string;
    durationLabel: string;
    pair: string;
    typeLabel: string;
  }>(null);

  // Load languages + rate
  useEffect(() => {
    void (async () => {
      const [langsRes, rateRes] = await Promise.all([
        supabase
          .from("supported_languages")
          .select("id,code,name_en,name_native,flag_emoji,is_active")
          .eq("is_active", true)
          .order("name_en", { ascending: true }),
        supabase.from("interpreter_pricing").select("client_rate_usd").limit(1).maybeSingle(),
      ]);
      setLanguages((langsRes.data ?? []) as SupportedLanguage[]);
      if (rateRes.data?.client_rate_usd) setClientRate(Number(rateRes.data.client_rate_usd));
    })();
  }, []);

  // Load booked slots when (remote) date changes
  useEffect(() => {
    if (bookingType !== "remote" || !date) {
      setBookedSlots([]);
      return;
    }
    setLoadingSlots(true);
    void getBookedSlots(date)
      .then(setBookedSlots)
      .finally(() => setLoadingSlots(false));
  }, [date, bookingType]);

  const effectiveDuration = useMemo(() => {
    if (duration === -1) {
      const n = Number(customDuration);
      if (!Number.isFinite(n)) return null;
      if (n < 15 || n > 480) return null;
      return Math.round(n);
    }
    return duration;
  }, [duration, customDuration]);

  const estimatedCost = useMemo(() => {
    if (bookingType !== "remote" || !effectiveDuration) return null;
    return (effectiveDuration / 60) * clientRate;
  }, [bookingType, effectiveDuration, clientRate]);

  const minNoticeMs = bookingType === "onsite" ? 24 * 3600 * 1000 : 2 * 3600 * 1000;

  const isDateDisabled = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max = new Date(today);
    max.setDate(max.getDate() + 30);
    if (d < today) return true;
    if (d > max) return true;
    if (isWeekend(d)) return true;
    if (bookingType === "onsite") {
      // Must be at least 24hr ahead: disable today and tomorrow if <24h
      const minDate = new Date(Date.now() + 24 * 3600 * 1000);
      minDate.setHours(0, 0, 0, 0);
      if (d < minDate) return true;
    }
    return false;
  };

  const slotState = (slot: string): "available" | "booked" | "too_soon" | "past" => {
    if (!date) return "available";
    const iso = catDateTimeToUtcIso(date, slot);
    const slotMs = new Date(iso).getTime();
    if (slotMs < Date.now()) return "past";
    if (slotMs - Date.now() < minNoticeMs) return "too_soon";
    if (bookedSlots.includes(slot)) return "booked";
    return "available";
  };

  const langValid = langFrom && langTo && langFrom !== langTo;
  const locationValid =
    bookingType === "remote" || (locationType && locationAddress.trim().length > 0);

  const canSubmit =
    !!user &&
    !!bookingType &&
    langValid &&
    !!date &&
    !!time &&
    !!effectiveDuration &&
    locationValid &&
    !submitting;

  const handleSubmit = async () => {
    if (!user || !bookingType || !date || !time || !effectiveDuration) return;
    setSubmitting(true);
    try {
      const scheduledIso = catDateTimeToUtcIso(date, time);

      // Re-check availability right before insert (race-safe enough for UX)
      if (bookingType === "remote") {
        const fresh = await getBookedSlots(date);
        if (fresh.includes(time)) {
          toast.error("That slot was just booked — please choose another time.");
          setBookedSlots(fresh);
          setSubmitting(false);
          return;
        }
      }

      const payload: Record<string, unknown> = {
        client_id: user.id,
        language_from: langFrom,
        language_to: langTo,
        scheduled_at: scheduledIso,
        duration_minutes: effectiveDuration,
        booking_type: bookingType,
        status: "pending",
      };
      if (bookingType === "onsite") {
        payload.location_type = locationType;
        payload.location_address = locationAddress.trim();
        payload.location_notes = locationNotes.trim() || null;
      } else {
        payload.client_notes = clientNotes.trim() || null;
      }

      const { error } = await supabase.from("interpreter_bookings").insert(payload);
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          toast.error("You already have a booking at this time — please choose a different slot.");
        } else {
          toast.error("Something went wrong. Please try again or contact us.");
        }
        setSubmitting(false);
        return;
      }

      const fromLang = languages.find((l) => l.code === langFrom);
      const toLang = languages.find((l) => l.code === langTo);
      setSubmitted({
        when: formatCat(scheduledIso),
        durationLabel:
          effectiveDuration >= 60
            ? `${(effectiveDuration / 60).toFixed(effectiveDuration % 60 === 0 ? 0 : 1)} hr`
            : `${effectiveDuration} min`,
        pair: `${fromLang?.flag_emoji ?? ""} ${fromLang?.name_en ?? langFrom} → ${toLang?.flag_emoji ?? ""} ${toLang?.name_en ?? langTo}`,
        typeLabel: bookingType === "remote" ? "Remote" : "On-Site",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <TranslateLayout>
        <div className="mx-auto max-w-2xl px-4 py-16">
          <Card>
            <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Booking Requested!</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll confirm within{" "}
                  {submitted.typeLabel === "On-Site" ? "4 hours" : "2 hours"}.
                </p>
              </div>
              <div className="w-full rounded-lg border bg-muted/30 p-4 text-left text-sm">
                <Row label="Type" value={submitted.typeLabel} />
                <Row label="Languages" value={submitted.pair} />
                <Row label="When (CAT)" value={submitted.when} />
                <Row label="Duration" value={submitted.durationLabel} />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(null);
                    setDate(undefined);
                    setTime("");
                    setDuration(null);
                    setCustomDuration("");
                    setClientNotes("");
                    setLocationAddress("");
                    setLocationNotes("");
                    setLocationType("");
                  }}
                >
                  Book Another
                </Button>
                <Button asChild>
                  <Link to="/dashboard/interpreter">
                    View My Bookings <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TranslateLayout>
    );
  }

  return (
    <TranslateLayout>
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Schedule an Interpreter</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick remote or on-site, choose a date and language, and we'll confirm shortly.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {/* STEP 0: type */}
            <Step number={0} title="Choose booking type">
              <div className="grid gap-4 sm:grid-cols-2">
                <TypeCard
                  active={bookingType === "remote"}
                  icon={<Video className="h-6 w-6" />}
                  accent="purple"
                  title="Remote Interpreter"
                  desc="Connect via video or audio call from anywhere"
                  tags={["Instant connection", "Any device", "Pay per minute"]}
                  onClick={() => {
                    setBookingType("remote");
                    void navigate({ to: "/translate/book", search: { type: "remote" } });
                  }}
                />
                <TypeCard
                  active={bookingType === "onsite"}
                  icon={<MapPin className="h-6 w-6" />}
                  accent="amber"
                  title="On-Site Interpreter"
                  desc="Book an interpreter to accompany you in person — bank, hospital, government office, court, meetings, and more"
                  tags={["Physical presence", "Any location in Kigali", "Hourly or full day"]}
                  footer="Perfect for: bank appointments, hospital visits, immigration offices, business meetings, court hearings"
                  onClick={() => {
                    setBookingType("onsite");
                    void navigate({ to: "/translate/book", search: { type: "onsite" } });
                  }}
                />
              </div>
            </Step>

            {bookingType && (
              <>
                {/* STEP 1: language */}
                <Step number={1} title="Language pair" icon={<Languages className="h-5 w-5" />}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LangSelect
                      label="From"
                      value={langFrom}
                      onChange={setLangFrom}
                      languages={languages}
                      exclude={langTo}
                    />
                    <LangSelect
                      label="To"
                      value={langTo}
                      onChange={setLangTo}
                      languages={languages}
                      exclude={langFrom}
                    />
                  </div>
                  {langFrom && langTo && langFrom === langTo && (
                    <p className="mt-2 text-xs text-destructive">
                      Source and target languages must differ.
                    </p>
                  )}
                </Step>

                {/* STEP 2: date+time */}
                <Step number={2} title="Date & time" icon={<CalendarIcon className="h-5 w-5" />}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                          setDate(d);
                          setTime("");
                        }}
                        disabled={isDateDisabled}
                        className="pointer-events-auto rounded-md border"
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Mon–Fri only · up to 30 days ahead · times shown in CAT (UTC+2)
                      </p>
                    </div>
                    <div>
                      {bookingType === "remote" ? (
                        <>
                          <Label className="text-sm">Available time slots</Label>
                          {!date ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                              Pick a date to see available slots.
                            </p>
                          ) : loadingSlots ? (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {Array.from({ length: 12 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 rounded-md" />
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {REMOTE_SLOTS.map((s) => {
                                const st = slotState(s);
                                const selected = time === s;
                                return (
                                  <Button
                                    key={s}
                                    type="button"
                                    size="sm"
                                    variant={selected ? "default" : "outline"}
                                    disabled={st !== "available"}
                                    onClick={() => setTime(s)}
                                    className="h-10 text-xs"
                                    title={
                                      st === "booked"
                                        ? "Booked"
                                        : st === "too_soon"
                                          ? "Too soon (needs 2h notice)"
                                          : st === "past"
                                            ? "Past"
                                            : ""
                                    }
                                  >
                                    {st === "booked"
                                      ? "Booked"
                                      : st === "too_soon"
                                        ? "Too soon"
                                        : s}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                          <p className="mt-3 text-xs text-muted-foreground">
                            Remote: Mon–Fri 08:00–18:00 CAT · 2 hr advance notice.
                          </p>
                        </>
                      ) : (
                        <>
                          <Label className="text-sm">Start time (CAT)</Label>
                          <Select value={time} onValueChange={setTime}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Choose a start time" />
                            </SelectTrigger>
                            <SelectContent>
                              {ONSITE_START_SLOTS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                              On-site bookings require 24 hours advance notice. We will confirm
                              availability within 4 hours.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Step>

                {/* STEP 3: duration */}
                <Step number={3} title="Duration" icon={<Clock className="h-5 w-5" />}>
                  <div className="flex flex-wrap gap-2">
                    {(bookingType === "remote" ? REMOTE_DURATIONS : ONSITE_DURATIONS).map((d) => (
                      <Button
                        key={d.value}
                        type="button"
                        size="sm"
                        variant={duration === d.value ? "default" : "outline"}
                        onClick={() => setDuration(d.value)}
                      >
                        {d.label}
                      </Button>
                    ))}
                    {bookingType === "remote" && (
                      <Button
                        type="button"
                        size="sm"
                        variant={duration === -1 ? "default" : "outline"}
                        onClick={() => setDuration(-1)}
                      >
                        Custom
                      </Button>
                    )}
                  </div>
                  {bookingType === "remote" && duration === -1 && (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        type="number"
                        min={15}
                        max={480}
                        step={15}
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        placeholder="Minutes (15–480)"
                        className="w-40"
                      />
                      <span className="text-xs text-muted-foreground">15 min steps</span>
                    </div>
                  )}
                  {bookingType === "remote" ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {effectiveDuration
                        ? `Estimated: $${((effectiveDuration / 60) * clientRate).toFixed(2)} · `
                        : ""}
                      Final billing based on actual call duration.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Pricing confirmed when we accept your booking. Typical rates from $50/hour.
                    </p>
                  )}
                </Step>

                {/* STEP 4: location (onsite only) */}
                {bookingType === "onsite" && (
                  <Step number={4} title="Location" icon={<MapPin className="h-5 w-5" />}>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">Location type</Label>
                        <Select value={locationType} onValueChange={setLocationType}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a location type" />
                          </SelectTrigger>
                          <SelectContent>
                            {LOCATION_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Address</Label>
                        <Input
                          value={locationAddress}
                          onChange={(e) => setLocationAddress(e.target.value)}
                          placeholder="e.g. Bank of Kigali, KN 5 Rd, Kigali"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Additional notes (optional)</Label>
                        <Textarea
                          value={locationNotes}
                          onChange={(e) => setLocationNotes(e.target.value)}
                          placeholder="e.g. Financial dispute meeting, please bring formal attire."
                          rows={3}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </Step>
                )}

                {/* STEP 5: notes (remote only) */}
                {bookingType === "remote" && (
                  <Step number={5} title="Notes" icon={<FileText className="h-5 w-5" />}>
                    <Label className="text-sm">What will this session be about? (optional)</Label>
                    <Textarea
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value.slice(0, 500))}
                      placeholder="A short description helps us match the right interpreter."
                      rows={4}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {clientNotes.length}/500
                    </p>
                  </Step>
                )}
              </>
            )}
          </div>

          {/* Summary panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card>
                <CardContent className="space-y-3 p-5">
                  <h3 className="text-base font-semibold">Booking summary</h3>
                  {bookingType ? (
                    <Badge
                      className={cn(
                        "w-fit",
                        bookingType === "remote"
                          ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {bookingType === "remote" ? "Remote" : "On-Site"}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">Choose a booking type to start.</p>
                  )}
                  <SummaryRow
                    label="Languages"
                    value={
                      langFrom && langTo
                        ? `${flagOf(languages, langFrom)} ${langFrom.toUpperCase()} → ${flagOf(
                            languages,
                            langTo,
                          )} ${langTo.toUpperCase()}`
                        : "—"
                    }
                  />
                  <SummaryRow
                    label="When"
                    value={
                      date && time
                        ? formatCat(catDateTimeToUtcIso(date, time))
                        : date
                          ? date.toLocaleDateString("en-GB", {
                              weekday: "long",
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                          : "—"
                    }
                  />
                  <SummaryRow
                    label="Duration"
                    value={
                      effectiveDuration
                        ? effectiveDuration >= 60
                          ? `${(effectiveDuration / 60).toFixed(
                              effectiveDuration % 60 === 0 ? 0 : 1,
                            )} hr`
                          : `${effectiveDuration} min`
                        : "—"
                    }
                  />
                  {bookingType === "onsite" && (
                    <SummaryRow
                      label="Location"
                      value={
                        locationAddress
                          ? `${locationType ? locationType + " · " : ""}${locationAddress}`
                          : "—"
                      }
                    />
                  )}
                  <SummaryRow
                    label={bookingType === "onsite" ? "Pricing" : "Estimated cost"}
                    value={
                      bookingType === "onsite"
                        ? "Custom pricing"
                        : estimatedCost != null
                          ? `$${estimatedCost.toFixed(2)}`
                          : "—"
                    }
                    bold
                  />
                  <Button
                    className="mt-2 w-full"
                    size="lg"
                    disabled={!canSubmit}
                    onClick={() => void handleSubmit()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Request Booking"
                    )}
                  </Button>
                  {!user && (
                    <p className="text-xs text-muted-foreground">
                      You'll need to{" "}
                      <Link to="/login" className="underline">
                        sign in
                      </Link>{" "}
                      to submit a booking.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TranslateLayout>
  );
}

function flagOf(langs: SupportedLanguage[], code: string) {
  return langs.find((l) => l.code === code)?.flag_emoji ?? "🌐";
}

function Step({
  number,
  title,
  icon,
  children,
}: {
  number: number;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {number}
        </div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {icon} {title}
        </h2>
      </div>
      <div className="rounded-xl border bg-card p-5">{children}</div>
    </section>
  );
}

function TypeCard({
  active,
  icon,
  accent,
  title,
  desc,
  tags,
  footer,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  accent: "purple" | "amber";
  title: string;
  desc: string;
  tags: string[];
  footer?: string;
  onClick: () => void;
}) {
  const accentRing =
    accent === "purple" ? "ring-purple-500 bg-purple-500/5" : "ring-amber-500 bg-amber-500/5";
  const iconBg =
    accent === "purple"
      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-xl border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md",
        active && `ring-2 ${accentRing}`,
      )}
    >
      {active && (
        <CheckCircle2
          className={cn(
            "absolute right-4 top-4 h-5 w-5",
            accent === "purple" ? "text-purple-600" : "text-amber-600",
          )}
        />
      )}
      <div className={cn("mb-3 grid h-11 w-11 place-items-center rounded-lg", iconBg)}>{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
      {footer && <p className="mt-3 text-xs text-muted-foreground">{footer}</p>}
    </button>
  );
}

function LangSelect({
  label,
  value,
  onChange,
  languages,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  languages: SupportedLanguage[];
  exclude?: string;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {languages
            .filter((l) => l.code !== exclude)
            .map((l) => (
              <SelectItem key={l.id} value={l.code}>
                <span className="mr-2">{l.flag_emoji ?? "🌐"}</span>
                {l.name_en}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right", bold && "font-semibold")}>{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
