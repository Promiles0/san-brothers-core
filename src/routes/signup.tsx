import { createFileRoute } from "@tanstack/react-router";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
        <div className="w-full rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">Sign up</h1>
          <p className="mt-2 text-sm text-muted-foreground">Form coming in a later prompt.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
