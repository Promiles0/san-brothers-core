import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/dashboard/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.messages.title")}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{t("dashboard.messages.empty")}</p>
          <Button asChild variant="outline">
            <Link to="/contact">{t("dashboard.messages.contactCta")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
