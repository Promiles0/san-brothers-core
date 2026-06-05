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
    <footer style={{ background: "#060B18" }} className="text-gray-400">
      {/* Top border accent */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.4), rgba(124,58,237,0.4), transparent)" }} />

      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        {/* Row 1: Brand + Newsletter + Social */}
        <div className="grid gap-10 pb-12 md:grid-cols-3 md:items-start" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-black text-white">
                SB
              </div>
              <div>
                <div className="text-base font-bold text-white">San Brothers</div>
                <div className="text-xs text-gray-600">Global Professional Services</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              We Speak Your Language — accounting, visas, translation, and consultancy for Rwanda and the world.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>🇷🇼 Kigali HQ</span>
              <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>🌍 15+ Countries</span>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white">Stay Updated</h4>
              <p className="mt-1 text-xs text-gray-600">Get insights, updates, and news from San Brothers.</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                className="h-10 rounded-lg border-0 text-sm text-white placeholder:text-gray-600"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <Button
                size="sm"
                className="h-10 shrink-0 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 border-0"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-700">No spam. Unsubscribe at any time.</p>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white">Connect With Us</h4>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="LinkedIn"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(10,102,194,0.2)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(10,102,194,0.4)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                <Linkedin className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="#"
                aria-label="Twitter / X"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(29,161,242,0.15)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(29,161,242,0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                <Twitter className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="https://wa.me/250700000000"
                aria-label="WhatsApp"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(37,211,102,0.15)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(37,211,102,0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                <MessageCircle className="h-4 w-4 text-gray-400" />
              </a>
            </div>
            <p className="text-xs text-gray-600">Florida House, 2nd Floor<br />KN 70 Street, Kigali, Rwanda</p>
          </div>
        </div>

        {/* Row 2: Links */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-gray-600 transition-colors duration-150 hover:text-gray-300">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Row 3: Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-gray-700 md:flex-row">
          <p>© 2026 San Brothers Global Digital Ecosystem. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span>Made in Kigali 🇷🇼 · For the World 🌍</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
