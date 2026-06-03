import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ConsultancyLayout } from "@/components/layout/consultancy-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/consultancy/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — San Brothers Consultancy" },
      { name: "description", content: "Transparent pricing for business consultancy services in Rwanda." },
    ],
  }),
  component: Pricing,
});

const ROWS = [
  { slug: "company-registration", name: "Company Registration", range: "$150 – $300" },
  { slug: "document-processing", name: "Document Processing", range: "$50 – $150" },
  { slug: "trade-investment", name: "Trade & Investment", range: "$200 – $500" },
  { slug: "business-planning", name: "Business Planning", range: "$300 – $1,000" },
  { slug: "administrative-support", name: "Administrative Support", range: "$75 – $200 / mo" },
];

const PACKAGES = [
  {
    name: "Starter",
    price: "$199 / mo",
    perks: ["Up to 5 hours advisory", "Email + chat support", "Document review"],
  },
  {
    name: "Growth",
    price: "$499 / mo",
    perks: ["Up to 15 hours advisory", "Dedicated case manager", "Quarterly business review"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    perks: ["Unlimited hours", "On-site visits", "Strategic partner status"],
  },
];

async function apply(slug: string, navigate: ReturnType<typeof useNavigate>) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    navigate({ to: "/dashboard/services", search: { apply: slug } as never });
  } else {
    sessionStorage.setItem("signup_intent", slug);
    sessionStorage.setItem("signup_portal", "consultancy");
    navigate({ to: "/signup", search: { intent: slug, portal: "consultancy" } as never });
  }
}

function Pricing() {
  const navigate = useNavigate();
  return (
    <ConsultancyLayout>
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:px-6">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground">Pay per service, or pick a monthly package. No surprises.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Per-service rates</h2>
        <Card className="mt-6">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left">
                <tr>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Typical price</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.slug} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-medium">{r.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.range}</td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => void apply(r.slug, navigate)}>
                        Request
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Monthly packages</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PACKAGES.map((p) => (
              <Card key={p.name} className={p.featured ? "border-primary shadow-lg" : ""}>
                <CardContent className="flex flex-col gap-4 p-6">
                  <div>
                    <h3 className="text-xl font-semibold">{p.name}</h3>
                    <div className="mt-1 text-3xl font-bold">{p.price}</div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> {perk}</li>
                    ))}
                  </ul>
                  <Button className="mt-2" variant={p.featured ? "default" : "outline"} onClick={() => void apply("administrative-support", navigate)}>
                    Choose {p.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Need a custom quote?</h2>
        <p className="mt-2 text-muted-foreground">Complex project or multi-service engagement? Let's scope it together.</p>
        <Button className="mt-6" size="lg" asChild>
          <a href="/contact?portal=consultancy">Request a custom quote</a>
        </Button>
      </section>
    </ConsultancyLayout>
  );
}
