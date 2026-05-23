// NOTE: Manager workflow requires these columns on service_requests. If missing run:
//   ALTER TABLE public.service_requests
//     ADD COLUMN IF NOT EXISTS submitted_to_authority_at timestamptz,
//     ADD COLUMN IF NOT EXISTS authority_name text,
//     ADD COLUMN IF NOT EXISTS authority_ref text,
//     ADD COLUMN IF NOT EXISTS authority_notes text,
//     ADD COLUMN IF NOT EXISTS rejection_reason text,
//     ADD COLUMN IF NOT EXISTS visa_expiry_date date;
import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Upload, Download, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { toast } from "sonner";
import type { ServiceCategory } from "@/lib/types/database";
import { MessageThread } from "@/components/messaging/message-thread";

const STATUSES = [
  "submitted",
  "under_review",
  "awaiting_client",
  "verified",
  "submitted_to_authority",
  "completed",
  "rejected",
  "cancelled",
];
interface CaseDetail {
  id: string;
  client_id: string;
  status: string;
  priority: string;
  notes: string | null;
  assigned_staff_id: string | null;
  service_category: ServiceCategory;
  created_at: string;
  authority_name?: string | null;
  authority_ref?: string | null;
  authority_notes?: string | null;
  visa_expiry_date?: string | null;
  client: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    tin_number: string | null;
    city: string | null;
    country: string | null;
  } | null;
  service: { name_en: string } | null;
}

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface Doc {
  id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  status: string;
  uploaded_at: string;
  is_final_delivery: boolean;
  rejection_reason: string | null;
}

export function StaffCaseDetail({
  id,
  category,
  basePath,
}: {
  id: string;
  category: ServiceCategory;
  basePath: string;
}) {
  const { user, profile } = useAuth();
  const { hasCapability } = useCapabilities();
  const isManager = profile?.role === "manager" || profile?.role === "admin";
  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [allRequests, setAllRequests] = useState<
    { id: string; status: string; created_at: string; service: { name_en: string } | null }[]
  >([]);
  const [audits, setAudits] = useState<
    { id: string; action: string; created_at: string; metadata: Record<string, unknown> | null }[]
  >([]);
  const [notes, setNotes] = useState("");
  const [rejectDoc, setRejectDoc] = useState<Doc | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectCaseOpen, setRejectCaseOpen] = useState(false);
  const [rejectCaseReason, setRejectCaseReason] = useState("");
  const [submitAuthOpen, setSubmitAuthOpen] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authRef, setAuthRef] = useState("");
  const [authNotes, setAuthNotes] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assigneeName, setAssigneeName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: row, error } = await supabase
        .from("service_requests")
        .select(
          "id,client_id,status,priority,notes,assigned_staff_id,service_category,created_at,authority_name,authority_ref,authority_notes,visa_expiry_date,client:users(id,full_name,email,phone,tin_number,city,country),service:services(name_en)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      setData(row as unknown as CaseDetail);
      setNotes((row as { notes: string | null }).notes ?? "");
      const clientId = (row as { client_id: string }).client_id;

      const [d, all, audit] = await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .eq("service_request_id", id)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("service_requests")
          .select("id,status,created_at,service:services(name_en)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("audit_log")
          .select("id,action,created_at,metadata")
          .eq("target_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setDocs((d.data ?? []) as unknown as Doc[]);
      setAllRequests((all.data ?? []) as unknown as typeof allRequests);
      setAudits((audit.data ?? []) as typeof audits);

      const assignedId = (row as { assigned_staff_id: string | null }).assigned_staff_id;
      if (assignedId) {
        const { data: a } = await supabase
          .from("users")
          .select("full_name,email")
          .eq("id", assignedId)
          .maybeSingle();
        setAssigneeName((a?.full_name as string) || (a?.email as string) || "Unknown");
      } else {
        setAssigneeName("");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isManager) return;
    void (async () => {
      const { data: list } = await supabase
        .from("users")
        .select("id,full_name,email,role")
        .neq("role", "client")
        .order("full_name");
      setStaffList((list ?? []) as StaffMember[]);
    })();
  }, [isManager]);

  useEffect(() => {
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const updateField = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("service_requests").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      void load();
    }
  };

  const assignToMe = () => user && updateField({ assigned_staff_id: user.id });
  const reassignTo = (staffId: string) => updateField({ assigned_staff_id: staffId });
  const saveNotes = () => updateField({ notes });

  const changeStatus = async (
    newStatus: string,
    extra: Record<string, unknown> = {},
    successMsg = "Status updated",
  ) => {
    if (!data || !user) return;
    const oldStatus = data.status;
    const { error } = await supabase
      .from("service_requests")
      .update({ status: newStatus, ...extra })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("audit_log").insert({
      action: "status_changed",
      target_id: id,
      target_type: "service_request",
      metadata: { from: oldStatus, to: newStatus, ...extra },
      performed_by: user.id,
    });
    toast.success(successMsg);
    void load();
  };

  const submitToAuthority = async () => {
    if (!authName.trim()) {
      toast.error("Authority name is required");
      return;
    }
    await changeStatus(
      "submitted_to_authority",
      {
        submitted_to_authority_at: new Date().toISOString(),
        authority_name: authName.trim(),
        authority_ref: authRef.trim() || null,
        authority_notes: authNotes.trim() || null,
      },
      "Submitted to authority",
    );
    setSubmitAuthOpen(false);
    setAuthName("");
    setAuthRef("");
    setAuthNotes("");
  };

  const rejectCase = async () => {
    if (!rejectCaseReason.trim()) {
      toast.error("Reason required");
      return;
    }
    await changeStatus("rejected", { rejection_reason: rejectCaseReason.trim() }, "Case rejected");
    setRejectCaseOpen(false);
    setRejectCaseReason("");
  };

  const verifyDoc = async (d: Doc) => {
    const { error } = await supabase
      .from("documents")
      .update({ status: "verified", verified_by: user!.id, verified_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Verified");
      void load();
    }
  };
  const submitReject = async () => {
    if (!rejectDoc) return;
    const { error } = await supabase
      .from("documents")
      .update({ status: "rejected", rejection_reason: rejectReason })
      .eq("id", rejectDoc.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Rejected");
      setRejectDoc(null);
      setRejectReason("");
      void load();
    }
  };
  const toggleFinal = async (d: Doc) => {
    const { error } = await supabase
      .from("documents")
      .update({ is_final_delivery: !d.is_final_delivery })
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else void load();
  };
  const downloadDoc = async (d: Doc) => {
    const { data: signed, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(d.file_path, 60);
    if (error || !signed) {
      toast.error(error?.message ?? "Failed");
      return;
    }
    window.open(signed.signedUrl, "_blank");
  };
  const uploadFile = async (file: File) => {
    if (!data || !user) return;
    const path = `clients/${data.client_id}/${id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file);
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const { error: insErr } = await supabase.from("documents").insert({
      service_request_id: id,
      client_id: data.client_id,
      uploaded_by: user.id,
      file_path: path,
      file_name: file.name,
      file_type: file.type,
      file_size_bytes: file.size,
      status: "uploaded",
    });
    if (insErr) toast.error(insErr.message);
    else {
      toast.success("Uploaded");
      void load();
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const canApprove =
    (category === "visa" && hasCapability("approve_visa")) ||
    (category === "accounting" && hasCapability("approve_accounting"));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={basePath}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{data.client?.full_name ?? "—"}</h1>
        <span className="text-muted-foreground">— {data.service?.name_en}</span>
        <StatusBadge status={data.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Assigned to:</span>
        <span className="font-medium">
          {data.assigned_staff_id ? assigneeName || "…" : "Unassigned"}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={assignToMe}
          disabled={data.assigned_staff_id === user?.id}
        >
          {data.assigned_staff_id === user?.id ? "Assigned to you" : "Assign to me"}
        </Button>
        {isManager && (
          <Select onValueChange={reassignTo}>
            <SelectTrigger className="h-9 w-56">
              <SelectValue placeholder="Reassign…" />
            </SelectTrigger>
            <SelectContent>
              {staffList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name || s.email} · {s.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="client">Client Info</TabsTrigger>
          <TabsTrigger value="notes">Notes &amp; Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium">Change status:</label>
                <Select value={data.status} onValueChange={(v) => updateField({ status: v })}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Priority:</label>
                <Select value={data.priority} onValueChange={(v) => updateField({ priority: v })}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {data.service_category === "visa" && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Visa expiry date:</label>
                  <Input
                    type="date"
                    className="w-48"
                    value={data.visa_expiry_date ?? ""}
                    onChange={(e) => updateField({ visa_expiry_date: e.target.value || null })}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={assignToMe}
                  disabled={data.assigned_staff_id === user?.id}
                >
                  {data.assigned_staff_id === user?.id ? "Assigned to you" : "Assign to me"}
                </Button>
                {canApprove && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => updateField({ status: "verified" })}
                  >
                    Mark as Approved
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {profile?.role === "admin" ? (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Admin View</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You are viewing this case as admin. Case actions are handled by assigned staff.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.status === "submitted" && (
                  <Button size="sm" onClick={() => changeStatus("under_review")}>
                    Start Review
                  </Button>
                )}
                {data.status === "under_review" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeStatus("awaiting_client")}
                  >
                    Request Documents
                  </Button>
                )}
                {data.status === "under_review" && canApprove && (
                  <Button size="sm" onClick={() => changeStatus("verified")}>
                    Mark Verified
                  </Button>
                )}
                {data.status === "verified" && (
                  <Button size="sm" onClick={() => setSubmitAuthOpen(true)}>
                    Submit to Authority
                  </Button>
                )}
                {data.status === "submitted_to_authority" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      changeStatus(
                        "completed",
                        { completed_at: new Date().toISOString() },
                        "Marked complete",
                      )
                    }
                  >
                    Mark Complete
                  </Button>
                )}
                {data.status !== "completed" && data.status !== "cancelled" && (
                  <Button size="sm" variant="destructive" onClick={() => setRejectCaseOpen(true)}>
                    Reject Case
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <PaymentCard
            serviceRequestId={data.id}
            clientId={data.client_id}
            actorId={user?.id ?? null}
          />

          {(data.status === "submitted_to_authority" || data.status === "completed") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Final Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.authority_name && (
                  <div className="text-sm text-muted-foreground">
                    Submitted to{" "}
                    <span className="font-medium text-foreground">{data.authority_name}</span>
                    {data.authority_ref && <> · Ref: {data.authority_ref}</>}
                  </div>
                )}
                {docs.filter((d) => d.is_final_delivery).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No documents marked as final delivery yet.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {docs
                      .filter((d) => d.is_final_delivery)
                      .map((d) => (
                        <li key={d.id} className="flex items-center justify-between">
                          <span className="truncate">{d.file_name}</span>
                          <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                  </ul>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success("Client notification sent")}
                >
                  <Mail className="h-4 w-4" /> Notify Client
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{docs.length} document(s)</p>
            <div>
              <input
                ref={fileRef}
                type="file"
                aria-label="Upload document"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                  e.target.value = "";
                }}
              />
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload on behalf of client
              </Button>
            </div>
          </div>
          {docs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No documents uploaded yet.
              </CardContent>
            </Card>
          ) : (
            docs.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.file_name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge status={d.status} />
                      {d.is_final_delivery && <Badge variant="default">Final delivery</Badge>}
                      <span>{((d.file_size_bytes ?? 0) / 1024).toFixed(0)} KB</span>
                      <span>{new Date(d.uploaded_at).toLocaleString()}</span>
                    </div>
                    {d.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">Reason: {d.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <Checkbox
                        checked={d.is_final_delivery}
                        onCheckedChange={() => toggleFinal(d)}
                      />{" "}
                      Final
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verifyDoc(d)}
                      disabled={d.status === "verified"}
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectDoc(d);
                        setRejectReason("");
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-3">
          <CaseMessagesTab
            serviceRequestId={data.id}
            clientId={data.client_id}
            staffId={user?.id ?? null}
          />
        </TabsContent>

        <TabsContent value="client" className="space-y-3">
          <Card>
            <CardContent className="grid gap-2 pt-6 text-sm">
              <Row k="Name" v={data.client?.full_name ?? "—"} />
              <Row k="Email" v={data.client?.email ?? "—"} />
              <Row k="Phone" v={data.client?.phone ?? "—"} />
              <Row k="TIN" v={data.client?.tin_number ?? "—"} />
              <Row k="City" v={data.client?.city ?? "—"} />
              <Row k="Country" v={data.client?.country ?? "—"} />
              <Button asChild size="sm" variant="link" className="justify-start px-0">
                <Link to="/staff/clients/$id" params={{ id: data.client_id }}>
                  View full client profile →
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All service requests by this client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No other requests.</p>
              ) : (
                allRequests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span>{r.service?.name_en}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Staff-only notes. Not visible to client."
              />
              <Button size="sm" onClick={saveNotes}>
                Save notes
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity log</CardTitle>
            </CardHeader>
            <CardContent>
              {audits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {audits.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>{a.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectDoc} onOpenChange={(o) => !o && setRejectDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Reason for rejection"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={submitReject} disabled={!rejectReason}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={submitAuthOpen} onOpenChange={setSubmitAuthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to authority</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Authority name (e.g. Immigration Office)"
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
            />
            <Input
              placeholder="Reference number (optional)"
              value={authRef}
              onChange={(e) => setAuthRef(e.target.value)}
            />
            <Textarea
              placeholder="Notes (optional)"
              value={authNotes}
              onChange={(e) => setAuthNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubmitAuthOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitToAuthority} disabled={!authName.trim()}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectCaseOpen} onOpenChange={setRejectCaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject case</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejecting this case"
            value={rejectCaseReason}
            onChange={(e) => setRejectCaseReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectCaseOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={rejectCase} disabled={!rejectCaseReason.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="col-span-2 font-medium">{v}</span>
    </div>
  );
}

interface PaymentRow {
  id: string;
  amount_rwf: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  created_at: string;
}

function PaymentCard({
  serviceRequestId,
  clientId,
  actorId,
}: {
  serviceRequestId: string;
  clientId: string;
  actorId: string | null;
}) {
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("id,amount_rwf,currency,method,status,reference,created_at")
      .eq("service_request_id", serviceRequestId)
      .order("created_at", { ascending: false });
    if (error) {
      setPayments([]);
      return;
    }
    setPayments((data as PaymentRow[]) ?? []);
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceRequestId]);

  const markOfficePaid = async () => {
    const amt = parseInt(amount || "0", 10);
    if (!amt || amt <= 0) {
      toast.error("Enter amount");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      service_request_id: serviceRequestId,
      client_id: clientId,
      amount_rwf: amt,
      currency: "RWF",
      method: "office",
      status: "completed",
      reference: `SB-OFFICE-${Date.now()}`,
      provider_ref: actorId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as paid (office)");
    setAmount("");
    void load();
  };

  const latest = payments?.[0];
  const overall = !payments
    ? "loading"
    : payments.some((p) => p.status === "completed")
      ? "paid"
      : payments.some((p) => p.status === "pending")
        ? "pending"
        : "unpaid";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          <Badge
            variant={
              overall === "paid" ? "default" : overall === "pending" ? "secondary" : "outline"
            }
            className="capitalize"
          >
            {overall === "paid" ? "Paid" : overall === "pending" ? "Pending" : "Not paid"}
          </Badge>
        </div>
        {latest && (
          <div className="text-muted-foreground">
            Latest: {latest.amount_rwf.toLocaleString()} {latest.currency} ·{" "}
            <span className="uppercase">{latest.method}</span>
            {latest.reference && <> · {latest.reference}</>}
          </div>
        )}
        {payments && payments.length > 1 && (
          <div className="space-y-1 border-t pt-2">
            {payments.slice(1).map((p) => (
              <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {new Date(p.created_at).toLocaleDateString()} ·{" "}
                  <span className="uppercase">{p.method}</span> · {p.status}
                </span>
                <span>{p.amount_rwf.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">Amount (RWF)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <Button size="sm" onClick={markOfficePaid} disabled={busy}>
            Mark as paid (office)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CaseMessagesTab({
  serviceRequestId,
  clientId,
  staffId,
}: {
  serviceRequestId: string;
  clientId: string;
  staffId: string | null;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("service_request_id", serviceRequestId)
        .maybeSingle();
      if (cancelled) return;
      if (existing?.id) {
        setConversationId(existing.id as string);
        setLoading(false);
        return;
      }
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          client_id: clientId,
          staff_id: staffId,
          service_request_id: serviceRequestId,
        })
        .select("id")
        .single();
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
      } else {
        setConversationId(created.id as string);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceRequestId, clientId, staffId]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!conversationId)
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Unable to load conversation.
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardContent className="p-4">
        <MessageThread conversationId={conversationId} />
      </CardContent>
    </Card>
  );
}
