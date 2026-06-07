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
    <footer style={{ background: "#060B18" }} className="bg-slate-100 dark:bg-[#060B18] text-gray-900 dark:text-gray-400">
      {/* Top border accent */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.4), rgba(124,58,237,0.4), transparent)" }} />

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Row 1: Brand + Newsletter + Social */}
        <div className="grid gap-8 pb-10 md:grid-cols-3 md:items-start py-12 border-b border-gray-300 dark:border-white/10">
          {/* Column 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-xs font-black text-white">
                SB
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">San Brothers</div>
                <div className="text-xs text-gray-600 dark:text-gray-600">Global Services</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-500">
              Accounting, visas, translation, and consultancy for Rwanda and the world.
            </p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full px-2 py-0.5 text-gray-600 dark:text-gray-600 bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10">🇷🇼 Kigali HQ</span>
              <span className="rounded-full px-2 py-0.5 text-gray-600 dark:text-gray-600 bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10">🌍 15+ Countries</span>
            </div>
          </div>

          {/* Column 2: Newsletter */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">Stay Updated</h4>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-600">Get updates from San Brothers.</p>
            </div>
            <div className="flex gap-1">
              <Input
                type="email"
                placeholder="your@email.com"
                className="h-9 flex-1 rounded-lg border-0 text-xs text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-500 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10"
              />
              <Button
                size="sm"
                className="h-9 shrink-0 rounded-lg bg-blue-600 px-3 text-white hover:bg-blue-700 border-0"
              >
                <Mail className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-700">No spam ever.</p>
          </div>

          {/* Column 3: Social + Address */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">Connect</h4>
            <div className="flex gap-2">
              <a
                href="#"
                aria-label="LinkedIn"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10"
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(10,102,194,0.2)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(10,102,194,0.4)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = ""; (e.currentTarget as HTMLAnchorElement).style.borderColor = ""; }}
              >
                <Linkedin className="h-3.5 w-3.5 text-gray-700 dark:text-gray-500" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10"
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(29,161,242,0.15)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(29,161,242,0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = ""; (e.currentTarget as HTMLAnchorElement).style.borderColor = ""; }}
              >
                <Twitter className="h-3.5 w-3.5 text-gray-700 dark:text-gray-500" />
              </a>
              <a
                href="https://wa.me/250700000000"
                aria-label="WhatsApp"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10"
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(37,211,102,0.15)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(37,211,102,0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = ""; (e.currentTarget as HTMLAnchorElement).style.borderColor = ""; }}
              >
                <MessageCircle className="h-3.5 w-3.5 text-gray-700 dark:text-gray-500" />
              </a>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-600 leading-snug">
              Florida House, 2nd Floor
              <br />
              KN 70 Street, Kigali
            </p>
          </div>
        </div>

        {/* Row 2: Links Grid */}
        <div className="grid grid-cols-2 gap-6 py-10 md:grid-cols-4 md:gap-8 border-b border-gray-300 dark:border-white/10">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-xs text-gray-700 dark:text-gray-600 transition-colors duration-150 hover:text-gray-900 dark:hover:text-gray-300">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Row 3: Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 py-8 text-xs text-gray-700 dark:text-gray-700 md:flex-row">
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
