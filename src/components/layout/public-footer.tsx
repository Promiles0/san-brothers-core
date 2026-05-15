import { Github, Twitter, Linkedin } from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

const cols = [
  { title: "About", links: ["Company", "Team", "Careers"] },
  { title: "Services", links: ["Visa", "Accounting", "Translation", "Consultancy"] },
  { title: "Resources", links: ["Blog", "Help Center", "API"] },
  { title: "Legal", links: ["Privacy", "Terms", "Cookies"] },
  { title: "Contact", links: ["Support", "Sales", "Press"] },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-5 md:px-6">
        {cols.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-sm font-semibold">{col.title}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {col.links.map((l) => <li key={l}><a href="#" className="hover:text-foreground">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 text-xs text-muted-foreground md:flex-row md:px-6">
          <p>© {new Date().getFullYear()} San Brothers Global Digital Ecosystem.</p>
          <div className="flex items-center gap-3">
            <a href="#" aria-label="GitHub"><Github className="h-4 w-4" /></a>
            <a href="#" aria-label="Twitter"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
