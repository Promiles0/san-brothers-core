import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const cols = [
  { title: "About", links: ["Company", "Team", "Careers", "Blog"] },
  { title: "Services", links: ["Visa & Permits", "Accounting", "Translation", "Consultancy"] },
  { title: "Resources", links: ["Help Center", "API", "Pricing", "Documentation"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Compliance"] },
];

export function PublicFooter() {
  return (
    <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-gray-300">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        {/* Row 1: Logo, Newsletter, Social */}
        <div className="grid gap-8 md:grid-cols-3 md:items-start mb-12 pb-12 border-b border-gray-800">
          {/* Left: Logo & Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-gradient-to-br from-blue-600 to-blue-700 font-bold text-white text-sm">
                SB
              </div>
              <span className="text-lg font-bold text-white">San Brothers</span>
            </div>
            <p className="text-sm text-gray-400">We Speak Your Language</p>
            <p className="text-xs text-gray-500">
              Global professional services for accounting, visas, translation, and consultancy.
            </p>
          </div>

          {/* Center: Newsletter */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Stay Updated</h4>
            <p className="text-sm text-gray-400">Get the latest updates and news from San Brothers.</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right: Social Icons */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Connect With Us</h4>
            <div className="flex gap-4">
              <a
                href="#"
                aria-label="LinkedIn"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-blue-400 hover:text-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Row 2: Footer Links */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-12 pb-12 border-b border-gray-800">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold text-white">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Row 3: Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row text-xs text-gray-500">
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
