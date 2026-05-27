import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Upload,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle,
  KeyRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { AvailabilityToggle } from "@/components/messaging/availability-toggle";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Locale } from "@/lib/types";

// ── Route ──────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/staff/profile")({
  component: StaffProfilePage,
});

// ── Supported language pair type ───────────────────────────────────────────────

interface LangOption {
  id: string;
  code: string;
  name_en: string;
  flag_emoji: string;
}

interface LangPair {
  from: string;
  to: string;
}

const MAX_PAIRS = 10;
const MAX_BIO = 300;

// ── Page ───────────────────────────────────────────────────────────────────────

function StaffProfilePage() {
  const { user, profile, refreshProfile, updatePassword } = useAuth();
  const { hasCapability } = useCapabilities();

  const isInterpreter = hasCapability("handle_live_calls");

  // ── Section 1 state ──────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Locale>("en");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // ── Password state ───────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // ── Section 2 state ──────────────────────────────────────────────────────────
  const [langOptions, setLangOptions] = useState<LangOption[]>([]);
  const [loadingLangs, setLoadingLangs] = useState(false);
  const [pairs, setPairs] = useState<LangPair[]>([{ from: "", to: "" }]);
  const [bio, setBio] = useState("");
  const [savingInterpreter, setSavingInterpreter] = useState(false);

  // ── Seed state from profile ───────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setCity(profile.city ?? "");
    setCountry(profile.country ?? "");
    setPreferredLanguage(profile.preferred_language ?? "en");

    if (profile.interpreter_languages?.length) {
      setPairs(profile.interpreter_languages);
    } else {
      setPairs([{ from: "", to: "" }]);
    }
    setBio(profile.interpreter_bio ?? "");
  }, [profile]);

  // ── Load language options for interpreter section ─────────────────────────────
  useEffect(() => {
    if (!isInterpreter) return;
    setLoadingLangs(true);
    supabase
      .from("supported_languages")
      .select("id,code,name_en,flag_emoji")
      .order("name_en", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error("Failed to load languages");
        setLangOptions((data as LangOption[]) ?? []);
        setLoadingLangs(false);
      });
  }, [isInterpreter]);

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pt-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    e.target.value = "";
    setAvatarUploading(true);
    try {
      // Always write to the same deterministic path so old versions are replaced
      const path = `avatars/${user.id}/profile.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, f, { upsert: true, contentType: f.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      // Bust the CDN cache by appending a timestamp query param
      const urlWithBust = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from("users")
        .update({ profile_picture_url: urlWithBust })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      await refreshProfile();
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveGeneral = async () => {
    if (!user) return;
    setSavingGeneral(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          preferred_language: preferredLanguage,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingGeneral(false);
    }
  };

  const changePassword = async () => {
    if (!currentPw || !newPw) {
      toast.error("Enter both your current and new password.");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (currentPw === newPw) {
      toast.error("New password must be different from the current one.");
      return;
    }
    setSavingPw(true);
    try {
      // Re-authenticate to verify the current password
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPw,
      });
      if (authErr) throw new Error("Current password is incorrect.");
      const { error } = await updatePassword(newPw);
      if (error) throw error;
      toast.success("Password changed.");
      setCurrentPw("");
      setNewPw("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingPw(false);
    }
  };

  const saveInterpreter = async () => {
    if (!user) return;
    const validPairs = pairs.filter((p) => p.from && p.to && p.from !== p.to);
    if (validPairs.length === 0) {
      toast.error("Add at least one complete language pair.");
      return;
    }
    setSavingInterpreter(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          interpreter_languages: validPairs,
          interpreter_bio: bio.trim() || null,
          interpreter_profile_complete: true,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Interpreter profile saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingInterpreter(false);
    }
  };

  // ── Language pair helpers ─────────────────────────────────────────────────────

  const updatePair = (index: number, field: "from" | "to", value: string) => {
    setPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };
  const addPair = () => {
    if (pairs.length >= MAX_PAIRS) return;
    setPairs((prev) => [...prev, { from: "", to: "" }]);
  };
  const removePair = (index: number) => {
    if (pairs.length === 1) return;
    setPairs((prev) => prev.filter((_, i) => i !== index));
  };

  const pairsValid =
    pairs.length > 0 && pairs.every((p) => p.from && p.to && p.from !== p.to);

  const initial = (profile.full_name?.[0] ?? profile.email[0]).toUpperCase();

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information and preferences.
        </p>
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 1 — GENERAL PROFILE
          ════════════════════════════════════════════════ */}

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profile.profile_picture_url ? (
                <AvatarImage src={profile.profile_picture_url} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <Button asChild variant="outline" size="sm" disabled={avatarUploading}>
                <span>
                  {avatarUploading ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Change picture
                </span>
              </Button>
              <Input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Your name, contact details, and location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250 ..." />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Kigali" />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Rwanda" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile.email} readOnly className="bg-muted/40 cursor-default" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={profile.role} readOnly className="bg-muted/40 cursor-default capitalize" />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Preferred language</Label>
            <RadioGroup
              value={preferredLanguage}
              onValueChange={(v) => setPreferredLanguage(v as Locale)}
              className="flex flex-wrap gap-5"
            >
              {(
                [
                  { value: "en", label: "English" },
                  { value: "zh", label: "中文" },
                  { value: "rw", label: "Kinyarwanda" },
                ] as { value: Locale; label: string }[]
              ).map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value={value} />
                  {label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button onClick={saveGeneral} disabled={savingGeneral} className="mt-1">
            {savingGeneral ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
          <CardDescription>Verify your current password before setting a new one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="current-pw">Current password</Label>
              <Input
                id="current-pw"
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={changePassword}
            disabled={savingPw || !currentPw || !newPw}
          >
            {savingPw ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Update password
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════
          SECTION 2 — INTERPRETER PROFILE
          (only when handle_live_calls capability present)
          ════════════════════════════════════════════════ */}

      {isInterpreter && (
        <>
          <Separator className="my-2" />

          <div>
            <h2 className="text-lg font-semibold tracking-tight">Interpreter Profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure the language pairs and availability for live calls.
            </p>
          </div>

          {/* Incomplete banner */}
          {!profile.interpreter_profile_complete && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Complete your interpreter profile</strong> — add your language pairs
                and save to start receiving live calls.
              </span>
            </div>
          )}

          {/* Language pairs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Language Pairs</CardTitle>
              <CardDescription>
                Languages you can interpret between. From and To must differ.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingLangs ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading languages…
                </div>
              ) : (
                <div className="space-y-2">
                  {pairs.map((pair, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {/* From */}
                      <Select
                        value={pair.from}
                        onValueChange={(v) => updatePair(i, "from", v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="From" />
                        </SelectTrigger>
                        <SelectContent>
                          {langOptions.map((lang) => (
                            <SelectItem
                              key={lang.code}
                              value={lang.code}
                              disabled={lang.code === pair.to}
                            >
                              {lang.flag_emoji} {lang.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="shrink-0 text-xs text-muted-foreground">→</span>

                      {/* To */}
                      <Select
                        value={pair.to}
                        onValueChange={(v) => updatePair(i, "to", v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="To" />
                        </SelectTrigger>
                        <SelectContent>
                          {langOptions.map((lang) => (
                            <SelectItem
                              key={lang.code}
                              value={lang.code}
                              disabled={lang.code === pair.from}
                            >
                              {lang.flag_emoji} {lang.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        disabled={pairs.length === 1}
                        onClick={() => removePair(i)}
                        aria-label="Remove pair"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {pairs.length < MAX_PAIRS && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={addPair}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add language pair
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bio</CardTitle>
              <CardDescription>
                Tell clients about your background and specializations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
                placeholder="E.g. Certified interpreter with 5 years of experience in legal and medical settings…"
                rows={4}
              />
              <p className="text-right text-xs text-muted-foreground">
                {bio.length} / {MAX_BIO}
              </p>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Availability</CardTitle>
              <CardDescription>
                Your current status visible to clients and the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityToggle />
            </CardContent>
          </Card>

          {/* Save interpreter profile */}
          <Button
            onClick={saveInterpreter}
            disabled={savingInterpreter || !pairsValid}
            className="gap-1.5"
          >
            {savingInterpreter ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save interpreter profile
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
