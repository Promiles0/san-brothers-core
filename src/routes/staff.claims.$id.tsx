import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/claims/$id")({ component: Page });

interface ClaimDetail {
  id: string;
  status: string;
  reason_category: string;
  description: string;
  evidence_file_paths: string[] | null;
  resolution_notes: string | null;
  refund_amount_rwf: number | null;
  service_request_id: string | null;
  client: { id: string; full_name: string | null; email: string; phone: string | null } | null;
  service_request: {
    id: string;
    service_category: string;
    service: { name_en: string } | null;
  } | null;
}

function Page() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { hasCapability, isLoading: capLoading } = useCapabilities();
  const navigate = useNavigate();
  useEffect(() => {
    if (!capLoading && !hasCapability("handle_claims")) navigate({ to: "/staff" });
  }, [capLoading, hasCapability, navigate]);

  const [c, setC] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [refund, setRefund] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("claims")
      .select(
        "id,status,reason_category,description,evidence_file_paths,resolution_notes,refund_amount_rwf,service_request_id,client:users!claims_client_id_fkey(full_name,email,phone),service_request:service_requests(id,service_category,service:services(name_en))",
      )
      .eq("id", id)
      .single();
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const row = data as unknown as ClaimDetail;
    setC(row);
    setStatus(row.status);
    setNotes(row.resolution_notes ?? "");
    setRefund(row.refund_amount_rwf?.toString() ?? "");
    setLoading(false);
  };
  useEffect(() => {
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const save = async () => {
    if ((status === "resolved" || status === "rejected") && !notes.trim()) {
      toast.error("Resolution notes required");
      return;
    }
    const patch: Record<string, unknown> = {
      status,
      resolution_notes: notes || null,
      refund_amount_rwf: refund ? parseInt(refund, 10) : null,
    };
    if (status === "resolved" || status === "rejected") {
      patch.resolved_by = user!.id;
      patch.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("claims").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const refundAmt = refund ? parseInt(refund, 10) : 0;
    if (status === "resolved" && refundAmt > 0 && c) {
      const { error: payErr } = await supabase.from("payments").insert({
        service_request_id: c.service_request_id,
        client_id: (c.client as { id?: string } | null)?.id ?? null,
        amount_rwf: refundAmt,
        currency: "RWF",
        method: "office",
        status: "refunded",
        reference: `SB-REFUND-${Date.now()}`,
        provider_ref: user?.id ?? null,
      });
      if (payErr) toast.error(`Refund recorded with error: ${payErr.message}`);
    }
    toast.success("Saved");
    void load();
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(path, 60);
    if (error || !data) {
      toast.error(error?.message ?? "Failed");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (loading || !c)
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/staff/claims">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Claim</h1>
        <StatusBadge status={c.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Reason: </span>
            {c.reason_category.replace(/_/g, " ")}
          </p>
          <p className="whitespace-pre-wrap">{c.description}</p>
          {c.evidence_file_paths && c.evidence_file_paths.length > 0 && (
            <div className="space-y-1">
              <p className="text-muted-foreground">Evidence:</p>
              {c.evidence_file_paths.map((p) => (
                <Button key={p} size="sm" variant="outline" onClick={() => download(p)}>
                  <Download className="h-4 w-4" /> {p.split("/").pop()}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{c.client?.full_name}</p>
          <p className="text-muted-foreground">{c.client?.email}</p>
          <p className="text-muted-foreground">{c.client?.phone}</p>
          {c.service_request && (
            <Button asChild size="sm" variant="link" className="px-0">
              <Link
                to={`/staff/${c.service_request.service_category}/${c.service_request.id}` as never}
              >
                Open linked case ({c.service_request.service?.name_en}) →
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resolution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Resolution notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
          <div className="space-y-1">
            <Label>Refund amount (RWF)</Label>
            <Input
              type="number"
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              This records the refund amount. Process the actual transfer manually.
            </p>
          </div>
          <Button onClick={save}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
