import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/providers/i18n-provider";
import { resolveServiceIntentDestination } from "@/lib/navigation/service-intents";

export function TranslateCta() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center md:px-6 md:py-20">
        <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
          {t("translate.finalCta.heading")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-balance text-primary-foreground/85 md:text-lg">
          {t("translate.finalCta.subtitle")}
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="mt-8 h-14 px-10 text-base"
          onClick={async () => {
            const destination = await resolveServiceIntentDestination("live-interpreter");
            void navigate(destination as never);
          }}
        >
          {t("translate.finalCta.button")}
        </Button>
      </div>
    </section>
  );
}
