import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { intentLabel } from "@/lib/auth/intent-labels";

// Add your email here to expose the dev role-preview links.
const DEV_EMAILS: string[] = [];

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s: Record<string, unknown>) => ({
    intent: typeof s.intent === "string" ? s.intent : undefined,
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { intent } = useSearch({ from: "/dashboard" }) as { intent?: string };
  const intentName = intentLabel(intent);

  const onLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const showDev = user?.email && DEV_EMAILS.includes(user.email);

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome, {profile?.full_name ?? user?.email}!
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{user?.email}</span>
                {profile?.role ? <Badge variant="secondary" className="capitalize">{profile.role}</Badge> : null}
              </div>
            </div>
            <Button variant="outline" onClick={onLogout}>Log out</Button>
          </div>
          {intentName ? (
            <div className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm">
              You wanted to request: <span className="font-semibold">{intentName}</span>. The service intake page is coming soon.
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Full dashboard coming soon.</p>
          )}
        </div>

        {showDev ? (
          <div className="rounded-xl border border-dashed border-border p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dev: Preview dashboard as role</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["client", "secretary", "manager", "translator", "admin"] as const).map((r) => (
                <Button key={r} variant="outline" size="sm" asChild>
                  <a href={`/dev?role=${r}`}>{r}</a>
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
