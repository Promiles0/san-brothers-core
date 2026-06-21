import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Star, MessageSquare, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/providers/i18n-provider";
import type { Review, ReviewStatus } from "@/lib/types/database";

export const Route = createFileRoute("/admin/reviews")({ component: AdminReviews });

interface ReviewRow extends Review {
  service_requests?: {
    id: string;
    services?: { name_en: string | null } | null;
  } | null;
  reviewer?: { full_name: string | null } | null;
}

type FilterTab = "all" | "pending" | "approved" | "rejected";

const FILTERS: { value: FilterTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function statusBadge(status: ReviewStatus) {
  if (status === "approved")
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (status === "rejected")
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={cn(
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AdminReviews() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ReviewRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select(
        "id,client_id,service_request_id,rating,review_text,client_display_name,status,is_featured,admin_notes,reviewed_by,reviewed_at,created_at,updated_at,service_requests(id,services(name_en))",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setReviews([]);
    } else {
      setReviews((data ?? []) as unknown as ReviewRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const filtered = useMemo(() => {
    if (filter === "all") return reviews;
    return reviews.filter((r) => r.status === filter);
  }, [reviews, filter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((r) => r.status === "pending").length;
    const approved = reviews.filter((r) => r.status === "approved");
    const featured = approved.filter((r) => r.is_featured).length;
    const avg =
      approved.length > 0
        ? approved.reduce((s, r) => s + r.rating, 0) / approved.length
        : 0;
    return { total, pending, featured, avg };
  }, [reviews]);

  const moderate = async (
    review: ReviewRow,
    nextStatus: "approved" | "rejected",
    notes?: string,
  ) => {
    if (!user) return;
    setSavingId(review.id);
    const { error } = await supabase
      .from("reviews")
      .update({
        status: nextStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes ?? review.admin_notes,
      })
      .eq("id", review.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    void logAudit({
      action: nextStatus === "approved" ? "review_approved" : "review_rejected",
      target_type: "review",
      target_id: review.id,
      metadata: { rating: review.rating, client_id: review.client_id },
    });
    toast.success(`Review ${nextStatus}`);
    setActive(null);
    void fetchReviews();
  };

  const toggleFeatured = async (review: ReviewRow, next: boolean) => {
    setSavingId(review.id);
    const { error } = await supabase
      .from("reviews")
      .update({ is_featured: next })
      .eq("id", review.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, is_featured: next } : r)),
    );
    toast.success(next ? "Featured on homepage" : "Removed from homepage");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Client Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Moderate testimonials submitted by clients and feature the best ones on
          your homepage.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total
              </p>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className={stats.pending > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pending
              </p>
              <Loader2
                className={cn(
                  "h-4 w-4",
                  stats.pending > 0 ? "text-amber-500" : "text-muted-foreground",
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-2xl font-bold",
                stats.pending > 0 && "text-amber-600 dark:text-amber-400",
              )}
            >
              {stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Avg Rating
              </p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold">{stats.avg.toFixed(1)}</p>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Featured
              </p>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.featured}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count =
            f.value === "all"
              ? reviews.length
              : reviews.filter((r) => r.status === f.value).length;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No reviews in this view yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="min-w-[280px]">Review</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.client_display_name}
                      </TableCell>
                      <TableCell>
                        <StarRow value={r.rating} />
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">
                          {r.review_text}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.service_requests?.services?.name_en ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("capitalize", statusBadge(r.status))}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {fmt(r.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                disabled={savingId === r.id}
                                onClick={() => moderate(r, "approved")}
                                className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingId === r.id}
                                onClick={() => moderate(r, "rejected")}
                                className="h-8 border-red-500/40 text-red-600 hover:bg-red-500 hover:text-white dark:text-red-400"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <label className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                Featured
                              </span>
                              <Switch
                                checked={r.is_featured}
                                disabled={savingId === r.id}
                                onCheckedChange={(v) => toggleFeatured(r, v)}
                              />
                            </label>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => {
                              setActive(r);
                              setAdminNotes(r.admin_notes ?? "");
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review details</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{active.client_display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(active.created_at)}
                  </p>
                </div>
                <StarRow value={active.rating} size={16} />
              </div>
              <blockquote className="rounded-lg border border-border bg-muted/40 p-4 text-sm italic leading-relaxed">
                “{active.review_text}”
              </blockquote>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Internal admin notes
                </p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional notes for the team..."
                />
              </div>
              {active.reviewed_at && (
                <p className="text-xs text-muted-foreground">
                  Last actioned {fmt(active.reviewed_at)}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {active?.status === "pending" ? (
              <>
                <Button
                  variant="outline"
                  className="border-red-500/40 text-red-600 hover:bg-red-500 hover:text-white dark:text-red-400"
                  onClick={() => active && moderate(active, "rejected", adminNotes)}
                  disabled={savingId === active?.id}
                >
                  Reject
                </Button>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => active && moderate(active, "approved", adminNotes)}
                  disabled={savingId === active?.id}
                >
                  Approve
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!active) return;
                  setSavingId(active.id);
                  const { error } = await supabase
                    .from("reviews")
                    .update({ admin_notes: adminNotes })
                    .eq("id", active.id);
                  setSavingId(null);
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  toast.success("Notes saved");
                  setActive(null);
                  void fetchReviews();
                }}
              >
                Save notes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
