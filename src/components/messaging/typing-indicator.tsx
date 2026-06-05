import { cn } from "@/lib/utils";

export function TypingIndicator({ name }: { name?: string | null }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
      <div className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className={cn("h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground")}
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
      <span>{name ? `${name} is typing…` : "typing…"}</span>
    </div>
  );
}
