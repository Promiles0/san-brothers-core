import { Twitter, Linkedin, Mail, MessageCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const cols = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Our Team", href: "/about" },
      { label: "Careers", href: "/contact" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Visa & Permits", href: "/services/visa" },
      { label: "Accounting", href: "/services/accounting" },
      { label: "Translation", href: "/services/translation" },
      { label: "Consultancy", href: "/services/consultancy" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/faq" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/faq" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Compliance", href: "#" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card text-muted-foreground dark:bg-card">
      {/* Top border accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Row 1: Brand + Newsletter + Social */}
        <div className="grid gap-8 border-b border-border py-12 pb-10 md:grid-cols-3 md:items-start">
          {/* Column 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <a href="/" className="flex items-center gap-2">
                <img src="/sanlogo-Photoroom.png" alt="San Brothers" className="h-10 w-10 object-contain" />
              </a>
              <div>
                <div className="text-sm font-bold text-foreground">San Brothers</div>
                <div className="text-xs text-muted-foreground">Global Services</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Accounting, visas, translation, and consultancy for Rwanda and the world.
            </p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground">🇷🇼 Kigali HQ</span>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground">🌍 15+ Countries</span>
            </div>
          </div>

          {/* Column 2: Newsletter */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Stay Updated</h4>
              <p className="mt-1 text-xs text-muted-foreground">Get updates from San Brothers.</p>
            </div>
            <div className="flex gap-1">
              <Input
                type="email"
                placeholder="your@email.com"
                className="h-9 flex-1 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground"
              />
              <Button
                size="sm"
                className="h-9 shrink-0 rounded-lg px-3"
              >
                <Mail className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">No spam ever.</p>
          </div>

          {/* Column 3: Social + Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Connect</h4>
            <div className="flex gap-2">
              <a
                href="#"
                aria-label="LinkedIn"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted transition-all duration-200 hover:border-primary/30 hover:bg-primary/10"
              >
                <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted transition-all duration-200 hover:border-primary/30 hover:bg-primary/10"
              >
                <Twitter className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              <a
                href="https://wa.me/250700000000"
                aria-label="WhatsApp"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted transition-all duration-200 hover:border-success/30 hover:bg-success/10"
              >
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              Florida House, 2nd Floor
              <br />
              KN 70 Street, Kigali
            </p>
          </div>
        </div>

        {/* Row 2: Links Grid */}
        <div className="grid grid-cols-2 gap-6 border-b border-border py-10 md:grid-cols-4 md:gap-8">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-xs text-muted-foreground transition-colors duration-150 hover:text-primary">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Row 3: Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 py-8 text-xs text-muted-foreground md:flex-row">
          <p>© 2026 San Brothers. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span>Made in Kigali 🇷🇼 · For the World 🌍</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
