import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface InterpreterCall {
  id: string;
  client_id: string;
  language_from: string;
  language_to: string;
  status: string;
  is_free_call: boolean;
  interpreter_id: string | null;
  answered_at: string | null;
  ended_at: string | null;
  billed_seconds: number;
  rating: number | null;
  rating_comment: string | null;
}

interface InterpreterProfile {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
}

interface ClientMinutes {
  client_id: string;
  free_minutes_remaining: number;
  paid_minutes_remaining: number;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard/interpreter/$callId/summary")({
  component: CallSummaryPage,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

function CallSummaryPage() {
  const { callId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [call, setCall] = useState<InterpreterCall | null>(null);
  const [interpreter, setInterpreter] = useState<InterpreterProfile | null>(null);
  const [clientMinutes, setClientMinutes] = useState<ClientMinutes | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) return;
    void load();

    async function load() {
      const [callRes, minutesRes] = await Promise.all([
        supabase.from("interpreter_calls").select("*").eq("id", callId).single(),
        supabase.from("client_minutes").select("*").eq("client_id", user!.id).maybeSingle(),
      ]);
      if (callRes.error) {
        toast.error(callRes.error.message);
        return;
      }

      const c = callRes.data as InterpreterCall;
      setCall(c);
      if (c.rating) {
        setRating(c.rating);
        setSubmitted(true);
      }
      if (c.rating_comment) setComment(c.rating_comment);
      setClientMinutes((minutesRes.data as ClientMinutes) ?? null);

      if (c.interpreter_id) {
        const { data } = await supabase
          .from("users")
          .select("id,full_name,profile_picture_url")
          .eq("id", c.interpreter_id)
          .single();
        if (data) setInterpreter(data as InterpreterProfile);
      }
      setLoading(false);
    }
  }, [callId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitRating = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("interpreter_calls")
        .update({ rating, rating_comment: comment || null })
        .eq("id", callId);
      if (error) throw error;
      setSubmitted(true);
      toast.success("Rating submitted!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!call) return null;

  const billedSecs = call.billed_seconds ?? 0;
  const minutesUsed = billedSecs / 60;
  const totalRemaining =
    (clientMinutes?.free_minutes_remaining ?? 0) + (clientMinutes?.paid_minutes_remaining ?? 0);

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle className="h-9 w-9 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold">Call Completed</h1>
      </div>

      {/* Call details */}
      <Card>
        <CardContent className="space-y-4 p-5">
          {interpreter && (
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={interpreter.profile_picture_url ?? undefined} />
                <AvatarFallback>{interpreter.full_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{interpreter.full_name}</p>
                <p className="text-xs text-muted-foreground">Interpreter</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Languages</p>
              <p className="font-medium">
                {call.language_from} → {call.language_to}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">{fmt(billedSecs)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Minutes used</p>
              <p className="font-medium">{minutesUsed.toFixed(1)} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance remaining</p>
              <p className="font-medium">{totalRemaining.toFixed(1)} min</p>
            </div>
          </div>

          {call.is_free_call && (
            <p className="rounded-lg bg-green-500/10 px-3 py-2 text-center text-xs font-medium text-green-700 dark:text-green-300">
              This was your free call
            </p>
          )}
        </CardContent>
      </Card>

      {/* Star rating */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How was your interpreter?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                disabled={submitted}
                onMouseEnter={() => !submitted && setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => !submitted && setRating(n)}
                className="transition-transform hover:scale-110 disabled:cursor-default"
                aria-label={`${n} star`}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    (hovered || rating) >= n
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>

          {!submitted ? (
            <>
              <Textarea
                placeholder="Optional comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={2}
              />
              <Button
                className="w-full"
                onClick={handleSubmitRating}
                disabled={submitting || !rating}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Rating
              </Button>
              <button
                className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setSubmitted(true)}
              >
                Skip
              </button>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Thanks for your feedback!</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {interpreter && (
          <Button
            variant="outline"
            onClick={() =>
              navigate({
                to: "/dashboard/interpreter",
                search: { interpreterId: interpreter.id },
              } as never)
            }
          >
            Call {interpreter.full_name} Again
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
