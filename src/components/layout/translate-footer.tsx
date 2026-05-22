import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useI18n } from "@/lib/providers/i18n-provider";

export function TranslateFooter() {
  const { t } = useI18n();
  const links = [
    { href: "/translate/how-it-works", label: t("translate.nav.howItWorks") },
    { href: "/translate/languages", label: t("translate.nav.languages") },
    { href: "/translate/pricing", label: t("translate.nav.pricing") },
    { href: "/privacy", label: t("footer.links.privacy") },
    { href: "/terms", label: t("footer.links.terms") },
  ];
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="text-sm font-medium text-foreground">{t("translate.footer.partOf")}</div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {links.map((l, i) => (
            <span key={l.href} className="flex items-center gap-2">
              <a href={l.href} className="hover:text-foreground">
                {l.label}
              </a>
              {i < links.length - 1 && <span className="text-border">·</span>}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            {t("translate.footer.corporateSite")}
          </a>
          <LanguageSwitcher />
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-1 px-4 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <span>
            © {new Date().getFullYear()} {t("footer.copyright")}
          </span>
          <span>{t("translate.footer.address")}</span>
        </div>
      </div>
    </footer>
  );
}
