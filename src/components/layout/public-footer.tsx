import { Github, Twitter, Linkedin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

const cols = [
  { title: "About", links: ["Company", "Team", "Careers", "Blog"] },
  { title: "Services", links: ["Visa", "Accounting", "Translation", "Consultancy"] },
  { title: "Resources", links: ["Help Center", "API", "Pricing"] },
  { title: "Legal", links: ["Privacy", "Terms", "Cookies"] },
];

export function PublicFooter() {
  return (
    <footer className="bg-[#060B18] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.2fr_0.9fr] lg:items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-700 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 text-sky-200">SB</span>
              <span>San Brothers</span>
            </div>
            <p className="max-w-sm text-sm text-slate-400">We Speak Your Language</p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Newsletter signup</p>
            <p className="mt-3 text-sm text-slate-300">Stay updated with visa alerts, service news, and helpful guidance.</p>
            <form className="mt-6 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/20"
              />
              <Button type="submit" className="rounded-2xl px-6 py-3 text-sm font-semibold">
                Subscribe
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Connect with us</p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="LinkedIn" className="rounded-full border border-white/10 bg-white/5 p-3 transition hover:bg-sky-500/10">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Twitter" className="rounded-full border border-white/10 bg-white/5 p-3 transition hover:bg-sky-500/10">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" aria-label="WhatsApp" className="rounded-full border border-white/10 bg-white/5 p-3 transition hover:bg-sky-500/10">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-4">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{col.title}</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#050913]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} San Brothers Global Digital Ecosystem</p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <LanguageSwitcher />
            <p className="text-slate-400">Made in Kigali 🇷🇼 · For the World 🌍</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
