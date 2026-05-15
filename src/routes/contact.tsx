import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — San Brothers" },
      { name: "description", content: "Get in touch with San Brothers. We respond within one business day." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { t } = useI18n();
  const [subject, setSubject] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message received! We'll respond within 24 hours.");
    (e.target as HTMLFormElement).reset();
    setSubject("");
  };

  return (
    <PublicLayout>
      <Toaster richColors position="top-right" />
      <PageHero title={t("contact.heroTitle")} subtitle={t("contact.heroSubtitle")} />

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardContent className="p-6 md:p-8">
              <p className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Have an account? <a href="/login" className="font-medium text-primary hover:underline">Log in</a> to chat with us directly in your dashboard.
              </p>
              <h2 className="text-xl font-semibold">{t("contact.formHeading")}</h2>
              <form onSubmit={onSubmit} className="mt-6 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" required placeholder="Your name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required placeholder="you@example.com" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="+250 ..." />
                </div>
                <div className="grid gap-2">
                  <Label>Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue placeholder="Choose a subject" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visa">Visa & Permits</SelectItem>
                      <SelectItem value="accounting">Accounting</SelectItem>
                      <SelectItem value="consultancy">Business Consultancy</SelectItem>
                      <SelectItem value="translation">Translation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" rows={5} required placeholder="How can we help?" />
                </div>
                <Button type="submit" size="lg" className="justify-self-start">Send Message</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-6 p-6 md:p-8">
              <h2 className="text-xl font-semibold">{t("contact.infoHeading")}</h2>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <div className="font-medium">Florida House, 2nd Floor</div>
                  <div className="text-muted-foreground">KN 70 Street, Kigali, Rwanda</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <div>Rwanda: +250 788 687 288</div>
                  <div>Rwanda: +250 788 453 192</div>
                  <div>China: +86 155 7739 0044</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm">sanbrothersgroup@gmail.com</div>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm">Mon–Fri 8:00–18:00 CAT</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid h-64 place-items-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
          Kigali · Rwanda
        </div>
      </section>
    </PublicLayout>
  );
}
