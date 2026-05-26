import { useEffect, useState } from "react";
import { Globe, Plus, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SupportedLanguage {
  id: string;
  code: string;
  name_en: string;
  name_native: string;
  flag_emoji: string;
}

interface LanguagePair {
  from: string;
  to: string;
}

const MAX_PAIRS = 10;
const MAX_BIO = 300;

export function InterpreterProfileModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [loadingLangs, setLoadingLangs] = useState(false);
  const [pairs, setPairs] = useState<LanguagePair[]>([{ from: "", to: "" }]);
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingLangs(true);
    supabase
      .from("supported_languages")
      .select("id,code,name_en,name_native,flag_emoji")
      .order("name_en", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error("Failed to load languages");
        setLanguages((data as SupportedLanguage[]) ?? []);
        setLoadingLangs(false);
      });

    // Pre-fill existing values if any
    if (profile?.interpreter_languages?.length) {
      setPairs(profile.interpreter_languages);
    } else {
      setPairs([{ from: "", to: "" }]);
    }
    setBio(profile?.interpreter_bio ?? "");
  }, [open, profile]);

  const updatePair = (index: number, field: "from" | "to", value: string) => {
    setPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const addPair = () => {
    if (pairs.length >= MAX_PAIRS) return;
    setPairs((prev) => [...prev, { from: "", to: "" }]);
  };

  const removePair = (index: number) => {
    setPairs((prev) => prev.filter((_, i) => i !== index));
  };

  const isValid =
    pairs.length > 0 &&
    pairs.every((p) => p.from && p.to && p.from !== p.to);

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          interpreter_languages: pairs,
          interpreter_bio: bio.trim() || null,
          interpreter_profile_complete: true,
        })
        .eq("id", user.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      await refreshProfile();
      toast.success("Interpreter profile saved!");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Complete Your Interpreter Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Language pairs */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Language pairs</p>
            <p className="text-xs text-muted-foreground">
              Add the languages you interpret between. From and To must be different.
            </p>

            {loadingLangs ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading languages…
              </div>
            ) : (
              <div className="space-y-2">
                {pairs.map((pair, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={pair.from} onValueChange={(v) => updatePair(i, "from", v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="From" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
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

                    <Select value={pair.to} onValueChange={(v) => updatePair(i, "to", v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="To" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
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
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addPair}>
                    <Plus className="h-3.5 w-3.5" />
                    Add language pair
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Bio</p>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              placeholder="Tell clients about your experience and specializations..."
              rows={4}
            />
            <p className="text-right text-xs text-muted-foreground">
              {bio.length} / {MAX_BIO}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting} className="gap-1.5">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Save Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
