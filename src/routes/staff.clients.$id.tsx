import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Upload, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/clients/$id")({ component: Page });

interface Client {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  tin_number: string | null;
  city: string | null;
  country: string | null;
  role: string;
  is_walk_in: boolean | null;
  walk_in_pin: string | null;
  claimed_at: string | null;
  created_at: string;
}
interface SR {
  id: string;
  status: string;
  service_category: string;
  created_at: string;
  service: { name_en: string } | null;
}
interface Doc {
  id: string;
  file_name: string;
  file_path: string;
  status: string;
  uploaded_at: string;
  service_request_id: string;
}

function Page() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { hasCapability, isLoading: capLoading } = useCapabilities();
  const navigate = useNavigate();
  useEffect(() => {
    if (!capLoading && !hasCapability("register_clients_manually")) navigate({ to: "/staff" });
  }, [capLoading, hasCapability, navigate]);

  const [client, setClient] = useState<Client | null>(null);
  const [requests, setRequests] = useState<SR[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({
    full_name: "",
    phone: "",
    tin_number: "",
    city: "",
    country: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [c, r, d] = await Promise.all([
      supabase.from("users").select("*").eq("id", id).single(),
      supabase
        .from("service_requests")
        .select("id,status,service_category,created_at,service:services(name_en)")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("id,file_name,file_path,status,uploaded_at,service_request_id")
        .eq("client_id", id)
        .order("uploaded_at", { ascending: false }),
    ]);
    setClient((c.data ?? null) as Client | null);
    setRequests((r.data ?? []) as unknown as SR[]);
    setDocs((d.data ?? []) as Doc[]);
    setLoading(false);
    if (c.data)
      setEdit({
        full_name: (c.data as Client).full_name ?? "",
        phone: (c.data as Client).phone ?? "",
        tin_number: (c.data as Client).tin_number ?? "",
        city: (c.data as Client).city ?? "",
        country: (c.data as Client).country ?? "",
      });
  };
  useEffect(() => {
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const saveEdit = async () => {
    console.log("saveEdit called", edit);
    const { data, error } = await supabase
      .from("users")
      .update({
        full_name: edit.full_name,
        phone: edit.phone,
        tin_number: edit.tin_number,
        city: edit.city,
        country: edit.country,
      })
      .eq("id", client!.id)
      .select();
    console.log("update result — error:", error, "rows updated:", data);
    if (error) {
      toast.error(error.message);
    } else if (!data || data.length === 0) {
      toast.error(
        "Update blocked by RLS — 0 rows written. Check Supabase policies for public.users.",
      );
    } else {
      toast.success("Saved");
      setEditOpen(false);
      void load();
    }
  };

  const verify = async (d: Doc) => {
    const { error } = await supabase
      .from("documents")
      .update({ status: "verified", verified_by: user!.id, verified_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else void load();
  };
  const reject = async (d: Doc) => {
    const reason = window.prompt("Rejection reason?");
    if (!reason) return;
    const { error } = await supabase
      .from("documents")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else void load();
  };
  const download = async (d: Doc) => {
    const { data: signed, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(d.file_path, 60);
    if (error || !signed) {
      toast.error(error?.message ?? "Failed");
      return;
    }
    window.open(signed.signedUrl, "_blank");
  };
  const uploadTo = async (file: File, srId: string) => {
    const safe = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `${id}/staff-uploads/${srId}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file);
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const { error: insErr } = await supabase.from("documents").insert({
      service_request_id: srId,
      client_id: id,
      uploaded_by: user!.id,
      file_path: path,
      file_name: file.name,
      file_size_bytes: file.size,
      status: "uploaded",
    });
    if (insErr) toast.error(insErr.message);
    else {
      toast.success("Uploaded");
      void load();
    }
  };

  if (loading || !client)
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  const docsByRequest = requests.map((r) => ({
    ...r,
    docs: docs.filter((d) => d.service_request_id === r.id),
  }));

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/staff/clients">
          <ArrowLeft className="h-4 w-4" /> Back to clients
        </Link>
      </Button>
      <h1 className="text-2xl font-bold">{client.full_name}</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          {client.is_walk_in && (
            <Card className="border-orange-500/40 bg-orange-500/5">
              <CardContent className="space-y-3 pt-6">
                <Badge
                  className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"
                  variant="outline"
                >
                  Walk-in Client
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">PIN:</span>
                  <code className="rounded bg-muted px-2 py-1 font-mono">
                    {showPin ? client.walk_in_pin : "••••••"}
                  </code>
                  <Button size="sm" variant="ghost" onClick={() => setShowPin(!showPin)}>
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {client.claimed_at ? (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Account claimed on {new Date(client.claimed_at).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-sm">
                    Not yet claimed. Share this link:{" "}
                    <code className="text-xs">
                      sanbrothers.rw/claim-account?pin={client.walk_in_pin}
                    </code>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="grid gap-2 pt-6 text-sm">
              <Row k="Name" v={client.full_name ?? "—"} />
              <Row k="Email" v={client.email} />
              <Row k="Phone" v={client.phone ?? "—"} />
              <Row k="TIN" v={client.tin_number ?? "—"} />
              <Row k="City" v={client.city ?? "—"} />
              <Row k="Country" v={client.country ?? "—"} />
              <Row k="Joined" v={new Date(client.created_at).toLocaleDateString()} />
              <Dialog
                open={editOpen}
                onOpenChange={(open) => {
                  setEditOpen(open);
                  if (open && client) {
                    setEdit({
                      full_name: client.full_name ?? "",
                      phone: client.phone ?? "",
                      tin_number: client.tin_number ?? "",
                      city: client.city ?? "",
                      country: client.country ?? "",
                    });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="mt-2 w-fit">
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit client</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input
                        value={edit.full_name}
                        onChange={(e) => setEdit({ ...edit, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Phone</Label>
                      <Input
                        value={edit.phone}
                        onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>TIN</Label>
                      <Input
                        value={edit.tin_number}
                        onChange={(e) => setEdit({ ...edit, tin_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>City</Label>
                      <Input
                        value={edit.city}
                        onChange={(e) => setEdit({ ...edit, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Country</Label>
                      <Input
                        value={edit.country}
                        onChange={(e) => setEdit({ ...edit, country: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveEdit}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service requests.</p>
          ) : (
            requests.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{r.service?.name_en}</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/staff/${r.service_category}/${r.id}` as never}>Open →</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            aria-label="Upload document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && uploadFor) void uploadTo(f, uploadFor);
              e.target.value = "";
              setUploadFor("");
            }}
          />
          {docsByRequest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service requests yet.</p>
          ) : (
            docsByRequest.map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">{r.service?.name_en}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUploadFor(r.id);
                      fileRef.current?.click();
                    }}
                  >
                    <Upload className="h-4 w-4" /> Upload
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {r.docs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No documents.</p>
                  ) : (
                    r.docs.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
                      >
                        <span className="truncate">{d.file_name}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={d.status} />
                          <Button size="sm" variant="ghost" onClick={() => download(d)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verify(d)}
                            disabled={d.status === "verified"}
                          >
                            Verify
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => reject(d)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
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
