import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";
import { usePortal } from "@/lib/portal-context";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — San Brothers" },
      {
        name: "description",
        content: "Get in touch with San Brothers. We respond within one business day.",
      },
    ],
  }),
  component: Contact,
});
function Contact() {
  const { t } = useI18n();
  const portal = usePortal();
  const lockedSubject =
    portal.current === "translate"
      ? "translation"
      : portal.current === "consultancy"
        ? "consultancy"
        : "";
  const [subject, setSubject] = useState(lockedSubject);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lockedSubject) setSubject(lockedSubject);
  }, [lockedSubject]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        subject: subject || "other",
        message: String(fd.get("message") ?? ""),
        portal_source: portal.current,
      });
      if (error) console.warn("support_messages insert failed:", error.message);
      toast.success(t("contact.toast"));
      form.reset();
      setSubject(lockedSubject);
    } catch (err) {
      console.error(err);
      toast.success(t("contact.toast"));
    } finally {
      setSubmitting(false);
    }
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
                {t("contact.haveAccount")}{" "}
                <a href="/login" className="font-medium text-primary hover:underline">
                  {t("contact.logInLink")}
                </a>{" "}
                {t("contact.haveAccountTail")}
              </p>
              <h2 className="text-xl font-semibold">{t("contact.formHeading")}</h2>
              <form onSubmit={onSubmit} className="mt-6 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("contact.labels.name")}</Label>
                    <Input id="name" required placeholder={t("contact.placeholders.name")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">{t("contact.labels.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder={t("contact.placeholders.email")}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">{t("contact.labels.phone")}</Label>
                  <Input id="phone" type="tel" placeholder={t("contact.placeholders.phone")} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("contact.labels.subject")}</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("contact.placeholders.subject")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visa">{t("contact.subjects.visa")}</SelectItem>
                      <SelectItem value="accounting">{t("contact.subjects.accounting")}</SelectItem>
                      <SelectItem value="consultancy">
                        {t("contact.subjects.consultancy")}
                      </SelectItem>
                      <SelectItem value="translation">
                        {t("contact.subjects.translation")}
                      </SelectItem>
                      <SelectItem value="other">{t("contact.subjects.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">{t("contact.labels.message")}</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    required
                    placeholder={t("contact.placeholders.message")}
                  />
                </div>
                <Button type="submit" size="lg" className="justify-self-start">
                  {t("contact.send")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-6 p-6 md:p-8">
              <h2 className="text-xl font-semibold">{t("contact.infoHeading")}</h2>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <div className="font-medium">{t("contact.address1")}</div>
                  <div className="text-muted-foreground">{t("contact.address2")}</div>
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
                <div className="text-sm">{t("contact.hours")}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid h-64 place-items-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
          {t("contact.mapLabel")}
        </div>
      </section>
    </PublicLayout>
  );
}
